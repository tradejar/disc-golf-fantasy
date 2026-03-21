import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId } = await params;

    // 1. Fetch league and verify membership
    const { data: league, error: leagueErr } = await supabaseAdmin
        .from('leagues')
        .select('id, name, access_code, entry_fee, payout_structure, tournament_ids, owner_id, invite_paused, league_members ( user_id, profiles ( display_name ) )')
        .eq('id', leagueId)
        .single();

    if (leagueErr || !league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

    const isMember = league.league_members.some((m: any) => m.user_id === userId);
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // If no tournament_ids set (legacy league), fall back to all season tournaments
    const allSeasonIds = SEASON_2026.map(t => t.id);
    const tournamentIds: string[] = (league.tournament_ids ?? []).length > 0
        ? league.tournament_ids
        : allSeasonIds;
    const memberUserIds: string[] = league.league_members.map((m: any) => m.user_id);

    // 2. Fetch all entries for league members across league tournaments
    const { data: entries, error: entriesErr } = await supabaseAdmin
        .from('entries')
        .select('user_id, tournament_id, total_points, tournament_rank, roster_data, breakdown_data')
        .in('tournament_id', tournamentIds)
        .in('user_id', memberUserIds);

    if (entriesErr) return NextResponse.json({ error: entriesErr.message }, { status: 500 });

    // 3. Aggregate per member
    const memberMap = new Map<string, { displayName: string; totalPoints: number; entries: any[] }>();
    for (const m of league.league_members) {
        const name = (m as any).profiles?.display_name ?? 'Unknown';
        memberMap.set(m.user_id, { displayName: name, totalPoints: 0, entries: [] });
    }

    for (const entry of entries ?? []) {
        const member = memberMap.get(entry.user_id);
        if (!member) continue;
        member.totalPoints += entry.total_points ?? 0;
        const tourn = SEASON_2026.find(t => t.id === entry.tournament_id);
        member.entries.push({
            tournamentId: entry.tournament_id,
            tournamentName: tourn?.name ?? entry.tournament_id,
            points: entry.total_points ?? 0,
            rank: entry.tournament_rank,
            rosterData: entry.roster_data ?? [],
            breakdownData: entry.breakdown_data ?? {},
        });
    }

    // 4. Rank and return
    const leaderboard = Array.from(memberMap.entries())
        .map(([uid, data]) => ({ userId: uid, ...data }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map((row, i) => ({ rank: i + 1, ...row }));

    // Resolve tournament metadata for context
    const tournaments = SEASON_2026
        .filter(t => tournamentIds.includes(t.id))
        .map(t => ({ id: t.id, name: t.name, startDate: t.startDate, endDate: t.endDate, lockDate: getLockTime(t).toISOString() }));

    return NextResponse.json({
        leaderboard, tournaments,
        leagueName: league.name,
        accessCode: league.access_code,
        entryFee: league.entry_fee,
        payoutStructure: league.payout_structure,
        currentUserId: userId,
        isOwner: league.owner_id === userId,
        invitePaused: league.invite_paused ?? false,
    });
}
