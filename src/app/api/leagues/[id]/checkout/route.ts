import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { stripe } from '@/lib/stripe';
import { grossUp, platformFee } from '@/lib/fee-utils';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId } = await params;

    // Fetch league
    const { data: league, error: leagueErr } = await supabaseAdmin
        .from('leagues')
        .select('id, name, entry_fee, access_code')
        .eq('id', leagueId)
        .single();

    if (leagueErr || !league) return NextResponse.json({ error: 'League not found' }, { status: 404 });
    if (!league.entry_fee || league.entry_fee === 0) {
        return NextResponse.json({ error: 'This league is free — use the join endpoint instead' }, { status: 400 });
    }

    // Check not already a member
    const { data: existing } = await supabaseAdmin
        .from('league_members')
        .select('league_id, payment_status')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .maybeSingle();

    if (existing?.payment_status === 'paid') {
        return NextResponse.json({ error: 'You are already a paid member of this league' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://disc-golf-fantasy.vercel.app';
    const chargeAmount = grossUp(league.entry_fee);
    const fee = platformFee(league.entry_fee);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    unit_amount: Math.round(chargeAmount * 100), // cents
                    product_data: {
                        name: `${league.name} — League Entry`,
                        description: `Entry fee: $${league.entry_fee} · Platform fee: $${fee.toFixed(2)} · Stripe processing: $${(chargeAmount - league.entry_fee).toFixed(2)} · Total billed: $${chargeAmount.toFixed(2)}`,
                    },
                },
                quantity: 1,
            },
        ],
        metadata: {
            leagueId,
            userId,
            entryFee: String(league.entry_fee),
        },
        success_url: `${appUrl}/leagues/${leagueId}?payment=success`,
        cancel_url: `${appUrl}/leagues/${leagueId}?payment=cancelled`,
    });

    // Upsert pending member row (so we track intent even if they abandon)
    if (existing) {
        // Update existing pending row with new session
        await supabaseAdmin
            .from('league_members')
            .update({ payment_status: 'pending', stripe_session_id: session.id })
            .eq('league_id', leagueId)
            .eq('user_id', userId);
    } else {
        await supabaseAdmin
            .from('league_members')
            .insert({ league_id: leagueId, user_id: userId, payment_status: 'pending', stripe_session_id: session.id });
    }

    return NextResponse.json({ url: session.url, chargeAmount, entryFee: league.entry_fee, platformFee: fee });
}
