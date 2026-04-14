import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tournamentId = searchParams.get('tournamentId');
        const requestingUserId = searchParams.get('userId') || null;
        const leagueId = searchParams.get('leagueId') || null;

        if (!tournamentId) {
            return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
        }

        const tournament = SEASON_2026.find(t => t.id === tournamentId);
        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        // Picks are hidden until the draft locks (= first card tees off / PDGA streams).
        const now = new Date();
        const lockTime = getLockTime(tournament);
        const isStarted = now >= lockTime;

        // If leagueId is provided, fetch allowed userIds for that league
        let authorizedLeagueMembers: string[] | null = null;
        if (leagueId) {
            const { data: leagueMembersData, error: lmError } = await supabaseAdmin
                .from('league_members')
                .select('user_id')
                .eq('league_id', leagueId);

            if (lmError) {
                console.error('League members query error:', lmError);
                return NextResponse.json({ error: 'Failed to verify league membership.' }, { status: 500 });
            }
            authorizedLeagueMembers = leagueMembersData?.map(m => m.user_id) || [];
        }

        let entriesQuery = supabaseAdmin
            .from('entries')
            .select('id, user_id, roster_data, breakdown_data, total_points, tournament_rank, created_at, budget_remaining, auto_drafted')
            .filter('tournament_id', 'eq', tournamentId);

        if (authorizedLeagueMembers) {
            entriesQuery = entriesQuery.in('user_id', authorizedLeagueMembers);
        }

        const { data: entries, error } = await entriesQuery
            .order('total_points', { ascending: false, nullsFirst: false });

        if (error) {
            console.error('Leaderboard query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }        

        if (!entries || entries.length === 0) {
            return NextResponse.json({
                tournamentId,
                tournamentName: tournament.name,
                isStarted,
                entries: []
            });
        }

        const userIds = [...new Set(entries.map(e => e.user_id))];
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, display_name, email')
            .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        const leaderboard = entries.map((entry, index) => {
            const profile = profileMap.get(entry.user_id);
            const displayName = profile?.display_name
                || profile?.email?.split('@')[0]
                || `Player ${index + 1}`;

            const isOwn = entry.user_id === requestingUserId;
            // Hide other users' picks until draft locks
            const roster = (isStarted || isOwn)
                ? (entry.roster_data || [])
                : null; // null = hidden

            return {
                rank: index + 1,
                entryId: entry.id,
                userId: entry.user_id,
                displayName,
                totalPoints: entry.total_points ?? null,
                budgetRemaining: entry.budget_remaining,
                roster,
                breakdownData: (isStarted || isOwn) ? (entry.breakdown_data ?? null) : null,
                picksHidden: !isStarted && !isOwn,
                autoDrafted: (entry as any).auto_drafted ?? false,
                createdAt: entry.created_at,
            };
        });

        return NextResponse.json({
            tournamentId,
            tournamentName: tournament.name,
            isStarted,
            entries: leaderboard
        });

    } catch (e: unknown) {
        console.error('Leaderboard error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
