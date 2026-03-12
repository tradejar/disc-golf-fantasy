import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026 } from '@/data/tournaments';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const leagueId = searchParams.get('leagueId') || null;

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

        // Sort by total season points
        const season = Array.from(userMap.values())
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((u, index) => ({ ...u, rank: index + 1 }));

        return NextResponse.json({ season, tournaments: SEASON_2026 });

    } catch (e: unknown) {
        console.error('Season leaderboard error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
