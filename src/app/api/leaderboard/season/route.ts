import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026 } from '@/data/tournaments';

export async function GET() {
    try {
        // Fetch all entries for all 2026 tournaments
        const tournamentIds = SEASON_2026.map(t => t.id);

        const { data: entries, error } = await supabaseAdmin
            .from('entries')
            .select('id, user_id, tournament_id, total_points, roster_data, created_at')
            .in('tournament_id', tournamentIds)
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
            tournaments: { tournamentId: string; tournamentName: string; points: number; entryId: string }[];
        }>();

        entries.forEach(entry => {
            // Skip entries that haven't scored yet (tournament not played / still pending)
            if (entry.total_points == null) return;

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
            u.totalPoints += pts;
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
