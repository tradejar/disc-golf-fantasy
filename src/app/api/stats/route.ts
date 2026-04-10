import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026 } from '@/data/tournaments';
import { MOCK_MPO_PLAYERS, MOCK_FPO_PLAYERS } from '@/data/players';

export const revalidate = 300;

// Build a lookup map from players.ts (source of truth for names & ratings)
const PLAYER_NAME_MAP = new Map<number, { name: string; division: 'MPO' | 'FPO'; rating: number }>();
for (const p of MOCK_MPO_PLAYERS) {
    if (p.pdgaNumber != null)
        PLAYER_NAME_MAP.set(p.pdgaNumber, { name: `${p.firstName} ${p.lastName}`, division: 'MPO', rating: p.rating ?? 0 });
}
for (const p of MOCK_FPO_PLAYERS) {
    if (p.pdgaNumber != null)
        PLAYER_NAME_MAP.set(p.pdgaNumber, { name: `${p.firstName} ${p.lastName}`, division: 'FPO', rating: p.rating ?? 0 });
}

export interface RoundStat {
    round: number;
    toPar: number;
    breakdown: {
        eagles: number; birdies: number; pars: number;
        bogeys: number; doubles: number; triples: number;
    };
    advanced: {
        fairwayHits: number; c1InReg: number; c2InReg: number;
        scramble: number; c1xPutting: number; c2Putting: number;
    } | null;
}

export interface PlayerStat {
    pdgaNumber: string;
    name: string;
    division: 'MPO' | 'FPO';
    rating: number;
    toPar: number;
    breakdown: {
        eagles: number; birdies: number; pars: number;
        bogeys: number; doubles: number; triples: number;
    };
    advanced: {
        fairwayHits: number; c1InReg: number; c2InReg: number;
        scramble: number; c1xPutting: number; c2Putting: number;
    };
    rounds: RoundStat[];
}

export interface TournamentStats {
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    players: PlayerStat[];
}

export async function GET() {
    // Only fetch tournaments that have already ended
    const now = new Date();
    const played = SEASON_2026.filter(t => new Date(t.endDate + 'T23:59:59Z') < now);

    if (played.length === 0) {
        return NextResponse.json({ tournaments: [] });
    }

    try {
        const tournamentIds = played.map(t => t.id);

        // Fetch all entries with breakdown_data for played tournaments in one query
        const { data: entries, error } = await supabaseAdmin
            .from('entries')
            .select('tournament_id, breakdown_data')
            .in('tournament_id', tournamentIds)
            .not('breakdown_data', 'is', null)
            .limit(5000);

        if (error) throw error;

        // Group entries by tournament
        const byTournament = new Map<string, typeof entries>();
        for (const t of played) byTournament.set(t.id, []);
        for (const entry of entries ?? []) {
            const list = byTournament.get(entry.tournament_id);
            if (list) list.push(entry);
        }

        // Build tournament stats in chronological order (played array is already chronological)
        const tournaments: TournamentStats[] = [];

        for (const t of played) {
            const tEntries = byTournament.get(t.id) ?? [];
            const playerMap = new Map<number, PlayerStat>();

            for (const entry of tEntries) {
                const bd = entry.breakdown_data;
                if (!bd || typeof bd !== 'object') continue;

                for (const [rawKey, playerData] of Object.entries(bd as Record<string, unknown>)) {
                    let pdgaStr = rawKey;
                    if (rawKey.startsWith('m_') || rawKey.startsWith('f_')) pdgaStr = rawKey.slice(2);
                    const pdgaNum = parseInt(pdgaStr, 10);
                    if (isNaN(pdgaNum) || playerMap.has(pdgaNum)) continue;

                    const pd = playerData as Record<string, unknown>;
                    const totals = pd.totals as Record<string, unknown> | undefined;
                    if (!totals) continue;

                    const breakdown = totals.breakdown as {
                        eagles?: number; birdies?: number; pars?: number;
                        bogeys?: number; doubles?: number; triples?: number;
                    } | undefined;
                    const advanced = totals.advanced as {
                        fairwayHits?: number; c1InReg?: number; c2InReg?: number;
                        scramble?: number; c1xPutting?: number; c2Putting?: number;
                    } | undefined;

                    if (!breakdown) continue;

                    const info = PLAYER_NAME_MAP.get(pdgaNum);
                    let division: 'MPO' | 'FPO' = info?.division ?? 'MPO';
                    if (rawKey.startsWith('f_')) division = 'FPO';

                    playerMap.set(pdgaNum, {
                        pdgaNumber: pdgaStr,
                        name: info?.name ?? `#${pdgaNum}`,
                        division,
                        rating: info?.rating ?? 0,
                        toPar: (totals.toPar as number) ?? 0,
                        breakdown: {
                            eagles: breakdown.eagles ?? 0,
                            birdies: breakdown.birdies ?? 0,
                            pars: breakdown.pars ?? 0,
                            bogeys: breakdown.bogeys ?? 0,
                            doubles: breakdown.doubles ?? 0,
                            triples: breakdown.triples ?? 0,
                        },
                        advanced: {
                            fairwayHits: advanced?.fairwayHits ?? 0,
                            c1InReg: advanced?.c1InReg ?? 0,
                            c2InReg: advanced?.c2InReg ?? 0,
                            scramble: advanced?.scramble ?? 0,
                            c1xPutting: advanced?.c1xPutting ?? 0,
                            c2Putting: advanced?.c2Putting ?? 0,
                        },
                        rounds: [],
                    });
                }
            }

            // Sort by rating descending (best player first), unknown ratings at bottom
            const players = [...playerMap.values()].sort((a, b) => {
                if (b.rating !== a.rating) return b.rating - a.rating;
                return a.toPar - b.toPar;
            });

            tournaments.push({
                id: t.id,
                name: t.name,
                location: t.location,
                startDate: t.startDate,
                endDate: t.endDate,
                players,
            });
        }

        return NextResponse.json({ tournaments });
    } catch (e) {
        console.error('stats error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
