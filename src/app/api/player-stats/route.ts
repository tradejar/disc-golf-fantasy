import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026 } from '@/data/tournaments';

export const revalidate = 300;

// Average two identical stat sets (same player always has same totals)
// Just return the first occurrence.
interface PlayerTotals {
    pdgaNumber: string;
    name: string;
    division: string;
    toPar: number;
    breakdown: {
        eagles: number;
        birdies: number;
        pars: number;
        bogeys: number;
        doubles: number;
        triples: number;
        albatrosses: number;
    };
    advanced: {
        fairwayHits: number;
        c1InReg: number;
        c2InReg: number;
        scramble: number;
        c1xPutting: number;
        c2Putting: number;
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
        return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    const tournament = SEASON_2026.find(t => t.id === tournamentId);
    if (!tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    try {
        // 1. Fetch all entries for this tournament (breakdown_data has per-player stats)
        const { data: entries, error: entriesError } = await supabaseAdmin
            .from('entries')
            .select('breakdown_data')
            .eq('tournament_id', tournamentId)
            .not('breakdown_data', 'is', null)
            .limit(50);

        if (entriesError) throw entriesError;
        if (!entries || entries.length === 0) {
            return NextResponse.json({ players: [] });
        }

        // 2. Aggregate unique players from breakdown_data
        // breakdown_data is an object keyed by PDGA number
        const playerMap = new Map<string, { totals: PlayerTotals['breakdown'] & { toPar: number }; advanced: PlayerTotals['advanced'] }>();

        for (const entry of entries) {
            const bd = entry.breakdown_data;
            if (!bd || typeof bd !== 'object') continue;

            for (const [pdgaNum, playerData] of Object.entries(bd as Record<string, unknown>)) {
                if (playerMap.has(pdgaNum)) continue; // already have this player

                const pd = playerData as Record<string, unknown>;
                const totals = pd.totals as Record<string, unknown> | undefined;
                if (!totals) continue;

                const breakdown = totals.breakdown as {
                    eagles?: number; birdies?: number; pars?: number;
                    bogeys?: number; doubles?: number; triples?: number; albatrosses?: number;
                } | undefined;
                const advanced = totals.advanced as {
                    fairwayHits?: number; c1InReg?: number; c2InReg?: number;
                    scramble?: number; c1xPutting?: number; c2Putting?: number;
                } | undefined;

                if (!breakdown || !advanced) continue;

                playerMap.set(pdgaNum, {
                    totals: {
                        toPar: (totals.toPar as number) ?? 0,
                        eagles: breakdown.eagles ?? 0,
                        birdies: breakdown.birdies ?? 0,
                        pars: breakdown.pars ?? 0,
                        bogeys: breakdown.bogeys ?? 0,
                        doubles: breakdown.doubles ?? 0,
                        triples: breakdown.triples ?? 0,
                        albatrosses: breakdown.albatrosses ?? 0,
                    },
                    advanced: {
                        fairwayHits: advanced.fairwayHits ?? 0,
                        c1InReg: advanced.c1InReg ?? 0,
                        c2InReg: advanced.c2InReg ?? 0,
                        scramble: advanced.scramble ?? 0,
                        c1xPutting: advanced.c1xPutting ?? 0,
                        c2Putting: advanced.c2Putting ?? 0,
                    },
                });
            }
        }

        if (playerMap.size === 0) {
            return NextResponse.json({ players: [] });
        }

        // 3. Look up player names from players table
        const pdgaNums = [...playerMap.keys()];
        const { data: playersData } = await supabaseAdmin
            .from('players')
            .select('pdga_number, name, division')
            .in('pdga_number', pdgaNums.map(Number));

        const nameMap = new Map(
            (playersData || []).map(p => [String(p.pdga_number), { name: p.name as string, division: p.division as string }])
        );

        // 4. Build sorted player list (by toPar)
        const players: PlayerTotals[] = [...playerMap.entries()]
            .map(([pdgaNum, data]) => {
                const info = nameMap.get(pdgaNum);
                return {
                    pdgaNumber: pdgaNum,
                    name: info?.name ?? `#${pdgaNum}`,
                    division: info?.division ?? 'MPO',
                    toPar: data.totals.toPar,
                    breakdown: {
                        eagles: data.totals.eagles,
                        birdies: data.totals.birdies,
                        pars: data.totals.pars,
                        bogeys: data.totals.bogeys,
                        doubles: data.totals.doubles,
                        triples: data.totals.triples,
                        albatrosses: data.totals.albatrosses,
                    },
                    advanced: data.advanced,
                };
            })
            .sort((a, b) => a.toPar - b.toPar);

        return NextResponse.json({ players });
    } catch (e) {
        console.error('player-stats error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
