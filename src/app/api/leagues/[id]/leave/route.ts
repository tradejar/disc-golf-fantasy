import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: leagueId } = await params;

        // Fetch league + member row in parallel
        const [leagueResult, memberResult] = await Promise.all([
            supabaseAdmin
                .from('leagues')
                .select('id, owner_id, tournament_ids, entry_fee')
                .eq('id', leagueId)
                .single(),
            supabaseAdmin
                .from('league_members')
                .select('league_id, payment_status')
                .eq('league_id', leagueId)
                .eq('user_id', userId)
                .maybeSingle(),
        ]);

        const league = leagueResult.data;
        if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

        // Owners cannot leave their own league (they should delete/archive it instead)
        if (league.owner_id === userId) {
            return NextResponse.json({ error: 'League owners cannot leave — archive the league instead.' }, { status: 400 });
        }

        if (!memberResult.data) {
            return NextResponse.json({ error: 'You are not a member of this league.' }, { status: 400 });
        }

        // Check whether the first selected tournament has started (lock time passed)
        const leagueTournamentIds: string[] = league.tournament_ids ?? [];
        const firstTournament = SEASON_2026.filter(t => leagueTournamentIds.includes(t.id))
            .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

        const now = new Date();
        const firstLocked = firstTournament ? getLockTime(firstTournament) <= now : false;

        // Remove member from league
        const { error: deleteError } = await supabaseAdmin
            .from('league_members')
            .delete()
            .eq('league_id', leagueId)
            .eq('user_id', userId);

        if (deleteError) throw new Error(`Failed to leave league: ${deleteError.message}`);

        return NextResponse.json({
            success: true,
            refunded: !firstLocked,
            message: firstLocked
                ? 'You have left the league. Your entry fee stays in the pot.'
                : 'You have left the league. Your entry fee has been removed from the pot.',
        });

    } catch (err: any) {
        console.error('Leave League Error:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
