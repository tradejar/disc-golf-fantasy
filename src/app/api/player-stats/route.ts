import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026 } from '@/data/tournaments';
import { MOCK_MPO_PLAYERS, MOCK_FPO_PLAYERS } from '@/data/players';

export const revalidate = 300;

// Build a lookup map from players.ts (the source of truth for player names)
const PLAYER_NAME_MAP = new Map<number, { name: string; division: 'MPO' | 'FPO' }>();
for (const p of MOCK_MPO_PLAYERS) {
    if (p.pdgaNumber != null)
        PLAYER_NAME_MAP.set(p.pdgaNumber, { name: `${p.firstName} ${p.lastName}`, division: 'MPO' });
}
for (const p of MOCK_FPO_PLAYERS) {
    if (p.pdgaNumber != null)
        PLAYER_NAME_MAP.set(p.pdgaNumber, { name: `${p.firstName} ${p.lastName}`, division: 'FPO' });
}

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
        // Fetch all breakdown_data from entries
        const { data: entries, error } = await supabaseAdmin
            .from('entries')
            .select('breakdown_data')
            .eq('tournament_id', tournamentId)
            .not('breakdown_data', 'is', null)
            .limit(200);

        if (error) throw error;
        if (!entries || entries.length === 0) return NextResponse.json({ players: [] });

        // Collect unique players — keys may be "38008", "m_38008", or "f_38008"
        const playerMap = new Map<number, PlayerStats>();

        for (const entry of entries) {
            const bd = entry.breakdown_data;
            if (!bd || typeof bd !== 'object') continue;

            for (const [rawKey, playerData] of Object.entries(bd as Record<string, unknown>)) {
                // Strip prefix to get clean PDGA number
                let pdgaStr = rawKey;
                if (rawKey.startsWith('m_') || rawKey.startsWith('f_')) {
                    pdgaStr = rawKey.slice(2);
                }
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

                // Look up name and division from players.ts
                const info = PLAYER_NAME_MAP.get(pdgaNum);
                // Fallback division from key prefix if not in our roster
                let division: 'MPO' | 'FPO' = info?.division ?? 'MPO';
                if (rawKey.startsWith('f_')) division = 'FPO';

                playerMap.set(pdgaNum, {
                    pdgaNumber: pdgaStr,
                    name: info?.name ?? `#${pdgaNum}`,
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

        // Sort by toPar (best first)
        const players = [...playerMap.values()].sort((a, b) => a.toPar - b.toPar);

        return NextResponse.json({ players });
    } catch (e) {
        console.error('player-stats error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
