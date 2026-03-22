import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026 } from '@/data/tournaments';

export const revalidate = 300;

interface PlayerStats {
    pdgaNumber: string;
    name: string;
    division: 'MPO' | 'FPO';
    toPar: number;
    breakdown: {
        eagles: number; birdies: number; pars: number;
        bogeys: number; doubles: number; triples: number;
    };
    advanced: {
        fairwayHits: number; c1InReg: number; c2InReg: number;
        scramble: number; c1xPutting: number; c2Putting: number;
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
        // 1. Fetch breakdown_data from entries for this tournament
        const { data: entries, error: entriesError } = await supabaseAdmin
            .from('entries')
            .select('breakdown_data')
            .eq('tournament_id', tournamentId)
            .not('breakdown_data', 'is', null)
            .limit(100);

        if (entriesError) throw entriesError;
        if (!entries || entries.length === 0) {
            return NextResponse.json({ players: [] });
        }

        // 2. Collect unique players from all entries
        // Keys may be plain PDGA numbers ("38008") or prefixed ("m_38008" / "f_38008")
        const playerMap = new Map<string, PlayerStats>();

        for (const entry of entries) {
            const bd = entry.breakdown_data;
            if (!bd || typeof bd !== 'object') continue;

            for (const [rawKey, playerData] of Object.entries(bd as Record<string, unknown>)) {
                // Determine division from prefix (if any) and strip it
                let division: 'MPO' | 'FPO' = 'MPO';
                let pdgaNum = rawKey;
                if (rawKey.startsWith('f_')) {
                    division = 'FPO';
                    pdgaNum = rawKey.slice(2);
                } else if (rawKey.startsWith('m_')) {
                    division = 'MPO';
                    pdgaNum = rawKey.slice(2);
                }

                if (playerMap.has(pdgaNum)) continue; // first occurrence wins

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

                playerMap.set(pdgaNum, {
                    pdgaNumber: pdgaNum,
                    name: `#${pdgaNum}`, // placeholder until name lookup
                    division,
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
                });
            }
        }

        if (playerMap.size === 0) return NextResponse.json({ players: [] });

        // 3. Look up player names from players table
        const pdgaNums = [...playerMap.keys()].map(Number).filter(n => !isNaN(n));

        const { data: playersData } = await supabaseAdmin
            .from('players')
            .select('pdga_number, name, division')
            .in('pdga_number', pdgaNums);

        for (const p of (playersData ?? [])) {
            const key = String(p.pdga_number);
            const existing = playerMap.get(key);
            if (existing) {
                existing.name = p.name as string;
                // Only override division from DB if we didn't detect it from prefix
                if (!existing.division || existing.division === 'MPO') {
                    const div = (p.division as string ?? '').toUpperCase();
                    if (div === 'FPO' || div === 'F') existing.division = 'FPO';
                }
            }
        }

        // 4. Sort by toPar (best first) within each division
        const players = [...playerMap.values()].sort((a, b) => a.toPar - b.toPar);

        return NextResponse.json({ players });
    } catch (e) {
        console.error('player-stats error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
