import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026 } from '@/data/tournaments';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const leagueId = searchParams.get('leagueId') || null;

        // Fix #2: for league-scoped requests, enforce that the caller is a member
        if (leagueId) {
            const { userId } = await auth();
            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const { data: membership } = await supabaseAdmin
                .from('league_members')
                .select('league_id')
                .eq('league_id', leagueId)
                .eq('user_id', userId)
                .maybeSingle();
            if (!membership) {
                return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
            }
        }

        // Fetch all entries for all 2026 tournaments
        const tournamentIds = SEASON_2026.map(t => t.id);

        let entriesQuery = supabaseAdmin
            .from('entries')
            .select('id, user_id, tournament_id, total_points, roster_data, created_at')
            .in('tournament_id', tournamentIds);

        // If a leagueId is provided, restrict to members of that league
        if (leagueId) {
            const { data: leagueMembersData } = await supabaseAdmin
                .from('league_members')
                .select('user_id')
                .eq('league_id', leagueId);

            const authorizedLeagueMembers = leagueMembersData?.map(m => m.user_id) || [];
            entriesQuery = entriesQuery.in('user_id', authorizedLeagueMembers);
        }

        const { data: entries, error } = await entriesQuery
            .order('total_points', { ascending: false, nullsFirst: false });

        if (error) {
            console.error('Season leaderboard query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!entries || entries.length === 0) {
            return NextResponse.json({ season: [], tournaments: SEASON_2026 });
        }

        // Fetch display names
        const userIds = [...new Set(entries.map(e => e.user_id))];
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, display_name, email')
            .in('id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));

        // Group by user — sum points across all tournaments
        const userMap = new Map<string, {
            userId: string;
            displayName: string;
            totalPoints: number;
            tournaments: { tournamentId: string; tournamentName: string; points: number | null; entryId: string }[];
        }>();

        entries.forEach(entry => {
            const profile = profileMap.get(entry.user_id);
            const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'Player';

            const tournament = SEASON_2026.find(t => t.id === entry.tournament_id);
            const pts = entry.total_points;

            if (!userMap.has(entry.user_id)) {
                userMap.set(entry.user_id, {
                    userId: entry.user_id,
                    displayName,
                    totalPoints: 0,
                    tournaments: [],
                });
            }

            const u = userMap.get(entry.user_id)!;

            // Add points to total only if played
            if (pts != null) {
                u.totalPoints += pts;
            }

            // Always add the tournament entry so we can show they participated/drafted
            u.tournaments.push({
                tournamentId: entry.tournament_id,
                tournamentName: tournament?.name || entry.tournament_id,
                points: pts,
                entryId: entry.id,
            });
        });

        // Determine which tournaments are "complete" — lock time has passed AND end+1 day is in the past.
        // In-progress tournaments (scoring underway mid-round) are excluded from season totals
        // so partial scores don't skew standings.
        const now2 = new Date();
        const completedTournamentIds = new Set(
            SEASON_2026.filter(t => {
                const endPlus = new Date(t.endDate);
                endPlus.setUTCDate(endPlus.getUTCDate() + 1);
                endPlus.setUTCHours(23, 59, 59, 999);
                return now2 > endPlus;
            }).map(t => t.id)
        );

        // Sort by total season points (only from completed tournaments)
        const season = Array.from(userMap.values())
            .map(u => ({
                ...u,
                // Recalculate totalPoints using only completed tournament entries
                totalPoints: u.tournaments
                    .filter(t => completedTournamentIds.has(t.tournamentId))
                    .reduce((sum, t) => sum + (t.points ?? 0), 0),
            }))
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((u, index) => ({ ...u, rank: index + 1 }));

        return NextResponse.json({ season, tournaments: SEASON_2026 });

    } catch (e: unknown) {
        console.error('Season leaderboard error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
