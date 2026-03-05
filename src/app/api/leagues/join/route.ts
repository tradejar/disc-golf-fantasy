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
            .select('id, name, entry_fee')
            .eq('access_code', accessCode.toUpperCase().trim())
            .maybeSingle();

        if (findError) throw new Error(`Database error looking up league: ${findError.message}`);
        if (!league) return NextResponse.json({ error: 'Invalid Access Code. League not found.' }, { status: 404 });

        // Phase 1: Free Leagues only. (Phase 2 will handle Stripe redirect here if entry_fee > 0)
        // Ensure they aren't already in the league
        const { data: existingMember } = await supabaseAdmin
            .from('league_members')
            .select('league_id')
            .eq('league_id', league.id)
            .eq('user_id', userId)
            .maybeSingle();

        if (existingMember) {
            return NextResponse.json({ error: 'You are already a member of this league!' }, { status: 400 });
        }

        // 2. Add User to League
        const { error: joinError } = await supabaseAdmin
            .from('league_members')
            .insert({
                league_id: league.id,
                user_id: userId
            });

        if (joinError) throw new Error(`Failed to join league: ${joinError.message}`);

        return NextResponse.json({ success: true, league });

    } catch (err: any) {
        console.error('Join League Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
