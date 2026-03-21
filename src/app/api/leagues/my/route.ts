import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: memberships, error } = await supabaseAdmin
        .from('league_members')
        .select(`
            league_id,
            joined_at,
            archived_at,
            leagues (
                id,
                name,
                access_code,
                entry_fee,
                payout_structure,
                tournament_ids,
                owner_id,
                invite_paused,
                created_at,
                league_members ( user_id )
            )
        `)
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const toLeague = (m: any) => {
        const league = m.leagues;
        if (!league) return null;
        const rawIds: string[] = league.tournament_ids ?? [];
        // Legacy leagues (created before tournament selection) default to the full season
        const tournamentIds = rawIds.length > 0 ? rawIds : SEASON_2026.map(t => t.id);
        const tournaments = SEASON_2026
            .filter(t => tournamentIds.includes(t.id))
            .map(t => ({ id: t.id, name: t.name, startDate: t.startDate, endDate: t.endDate, lockDate: getLockTime(t).toISOString() }));
        return {
            id: league.id,
            name: league.name,
            accessCode: league.access_code,
            entryFee: league.entry_fee,
            payoutStructure: league.payout_structure,
            tournamentIds,
            tournaments,
            memberCount: league.league_members?.length ?? 0,
            isOwner: league.owner_id === userId,
            invitePaused: league.invite_paused ?? false,
            archivedAt: m.archived_at ?? null,
            createdAt: league.created_at,
        };
    };

    const all = (memberships ?? []).map(toLeague).filter(Boolean) as any[];
    const leagues = all.filter(l => !l.archivedAt);
    const archivedLeagues = all.filter(l => !!l.archivedAt);

    // Fetch latest message timestamp for each league in one query
    const allLeagueIds = all.map(l => l.id);
    if (allLeagueIds.length > 0) {
        const { data: latestMsgs } = await supabaseAdmin
            .from('league_messages')
            .select('league_id, created_at')
            .in('league_id', allLeagueIds)
            .is('parent_id', null)
            .order('created_at', { ascending: false });

        if (latestMsgs) {
            // Keep only the latest per league
            const latestByLeague = new Map<string, string>();
            for (const msg of latestMsgs) {
                if (!latestByLeague.has(msg.league_id)) {
                    latestByLeague.set(msg.league_id, msg.created_at);
                }
            }
            for (const league of all) {
                league.latestMessageAt = latestByLeague.get(league.id) ?? null;
            }
        }
    }

    return NextResponse.json({ leagues, archivedLeagues });
}
