import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { accessCode } = body;

        if (!accessCode || typeof accessCode !== 'string') {
            return NextResponse.json({ error: 'Valid Access Code is required' }, { status: 400 });
        }

        // 1. Find the League by Access Code
        const { data: league, error: findError } = await supabaseAdmin
            .from('leagues')
            .select('id, name, entry_fee, invite_paused')
            .eq('access_code', accessCode.toUpperCase().trim())
            .maybeSingle();

        if (findError) throw new Error(`Database error looking up league: ${findError.message}`);
        if (!league) return NextResponse.json({ error: 'Invalid Access Code. League not found.' }, { status: 404 });
        if (league.invite_paused) return NextResponse.json({ error: 'Invitations for this league are currently paused by the creator.' }, { status: 403 });

        // Check not already a paid/pending member
        const { data: existingMember } = await supabaseAdmin
            .from('league_members')
            .select('league_id, payment_status')
            .eq('league_id', league.id)
            .eq('user_id', userId)
            .maybeSingle();

        if (existingMember?.payment_status === 'free') {
            return NextResponse.json({ error: 'You are already a member of this league!' }, { status: 400 });
        }

        // Entry fee is play-money only — always join directly.
        // If they have a stale 'pending' row (old Stripe flow), update it to 'free'.
        if (existingMember) {
            const { error: updateError } = await supabaseAdmin
                .from('league_members')
                .update({ payment_status: 'free' })
                .eq('league_id', league.id)
                .eq('user_id', userId);
            if (updateError) throw new Error(`Failed to update membership: ${updateError.message}`);
            return NextResponse.json({ success: true, league });
        }

        const { error: joinError } = await supabaseAdmin
            .from('league_members')
            .insert({ league_id: league.id, user_id: userId, payment_status: 'free' });

        if (joinError) throw new Error(`Failed to join league: ${joinError.message}`);

        return NextResponse.json({ success: true, league });

    } catch (err: any) {
        console.error('Join League Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
