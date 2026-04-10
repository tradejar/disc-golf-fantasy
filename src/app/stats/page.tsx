import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import { isPremium } from '@/lib/premium';
import { SEASON_2026 } from '@/data/tournaments';
import { MOCK_MPO_PLAYERS, MOCK_FPO_PLAYERS } from '@/data/players';
import StatsClient from '@/components/StatsClient';
import type { TournamentStats, PlayerStat, RoundStat } from '@/app/api/stats/route';

export const revalidate = 300;

export const metadata = {
    title: 'Player Stats | DGF',
    description: 'Performance stats for all players across all 2026 DGPT tournaments.',
};

const ROSTER_MAP = new Map<number, { name: string; division: 'MPO' | 'FPO'; rating: number }>();
for (const p of MOCK_MPO_PLAYERS) {
    if (p.pdgaNumber != null)
        ROSTER_MAP.set(p.pdgaNumber, { name: `${p.firstName} ${p.lastName}`, division: 'MPO', rating: p.rating ?? 0 });
}
for (const p of MOCK_FPO_PLAYERS) {
    if (p.pdgaNumber != null)
        ROSTER_MAP.set(p.pdgaNumber, { name: `${p.firstName} ${p.lastName}`, division: 'FPO', rating: p.rating ?? 0 });
}

async function fetchPdgaNames(pdgaId: string, division: 'MPO' | 'FPO'): Promise<Map<number, string>> {
    const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${pdgaId}&Division=${division}&Round=1`;
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 300 },
        });
        if (!res.ok) return new Map();
        const raw = await res.json() as { data?: { scores?: { PDGANum: number; FirstName: string; LastName: string }[] } };
        const names = new Map<number, string>();
        for (const s of raw.data?.scores ?? []) {
            if (s.PDGANum) names.set(s.PDGANum, `${s.FirstName} ${s.LastName}`.trim());
        }
        return names;
    } catch { return new Map(); }
}

async function fetchStatsData(): Promise<TournamentStats[]> {
    const now = new Date();
    const played = SEASON_2026.filter(t => new Date(t.endDate + 'T23:59:59Z') < now);
    if (!played.length) return [];

    interface RawRow {
        tournament_id: string; pdga_number: number; division: string; round_number: number;
        to_par: number | null; strokes: number | null;
        albatrosses: number | null; eagles: number | null; birdies: number | null;
        pars: number | null; bogeys: number | null; double_bogeys: number | null;
        triple_bogeys: number | null; aces: number | null;
        fairway_pct: number | null; c1_in_reg_pct: number | null; c2_in_reg_pct: number | null;
        scramble_pct: number | null; c1x_pct: number | null; c2_pct: number | null;
        placement: number | null;
    }

    const [statsResult, ...nameResults] = await Promise.all([
        supabaseAdmin
            .from('player_stats')
            .select('tournament_id, pdga_number, division, round_number, to_par, strokes, ' +
                    'albatrosses, eagles, birdies, pars, bogeys, double_bogeys, triple_bogeys, aces, ' +
                    'fairway_pct, c1_in_reg_pct, c2_in_reg_pct, scramble_pct, c1x_pct, c2_pct, placement')
            .in('tournament_id', played.map(t => t.id))
            .gt('strokes', 0),
        ...played.flatMap(t => [
            fetchPdgaNames(t.pdga_id, 'MPO'),
            fetchPdgaNames(t.pdga_id, 'FPO'),
        ]),
    ]);

    if (statsResult.error) throw statsResult.error;
    const rows = (statsResult.data ?? []) as unknown as RawRow[];

    const pdgaNamesByTournament = new Map<string, Map<number, string>>();
    played.forEach((t, i) => {
        const combined = new Map<number, string>([
            ...(nameResults[i * 2] as Map<number, string>),
            ...(nameResults[i * 2 + 1] as Map<number, string>),
        ]);
        pdgaNamesByTournament.set(t.id, combined);
    });

    const byTournament = new Map<string, Map<number, RawRow[]>>();
    for (const t of played) byTournament.set(t.id, new Map());
    for (const row of rows) {
        const tMap = byTournament.get(row.tournament_id);
        if (!tMap) continue;
        if (!tMap.has(row.pdga_number)) tMap.set(row.pdga_number, []);
        tMap.get(row.pdga_number)!.push(row);
    }

    const tournaments: TournamentStats[] = [];

    for (const t of played) {
        const tMap = byTournament.get(t.id)!;
        const pdgaNames = pdgaNamesByTournament.get(t.id)!;
        const playerStats: PlayerStat[] = [];

        for (const [pdgaNum, pRows] of tMap) {
            if (!pRows.length) continue;
            const roster = ROSTER_MAP.get(pdgaNum);
            const name = roster?.name ?? pdgaNames.get(pdgaNum) ?? `Player #${pdgaNum}`;
            const division: 'MPO' | 'FPO' =
                roster?.division ?? (pRows[0].division === 'FPO' ? 'FPO' : 'MPO');

            // Sort rounds chronologically
            const sortedRows = [...pRows].sort((a, b) => a.round_number - b.round_number);

            // Per-round data
            const rounds: RoundStat[] = sortedRows.map(r => {
                const hasAdv = (r.fairway_pct ?? 0) > 0 || (r.c1x_pct ?? 0) > 0;
                return {
                    round: r.round_number,
                    toPar: r.to_par ?? 0,
                    breakdown: {
                        eagles: (r.albatrosses ?? 0) + (r.eagles ?? 0),
                        birdies: r.birdies ?? 0,
                        pars: r.pars ?? 0,
                        bogeys: r.bogeys ?? 0,
                        doubles: r.double_bogeys ?? 0,
                        triples: r.triple_bogeys ?? 0,
                    },
                    advanced: hasAdv ? {
                        fairwayHits: r.fairway_pct ?? 0,
                        c1InReg:     r.c1_in_reg_pct ?? 0,
                        c2InReg:     r.c2_in_reg_pct ?? 0,
                        scramble:    r.scramble_pct ?? 0,
                        c1xPutting:  r.c1x_pct ?? 0,
                        c2Putting:   r.c2_pct ?? 0,
                    } : null,
                };
            });

            // Totals aggregated from all rounds
            let toPar = 0, eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0, triples = 0;
            let fairwaySum = 0, c1RegSum = 0, c2RegSum = 0, scrambleSum = 0, c1xSum = 0, c2Sum = 0, advCount = 0;
            for (const r of rounds) {
                toPar   += r.toPar;
                eagles  += r.breakdown.eagles;
                birdies += r.breakdown.birdies;
                pars    += r.breakdown.pars;
                bogeys  += r.breakdown.bogeys;
                doubles += r.breakdown.doubles;
                triples += r.breakdown.triples;
                if (r.advanced) {
                    fairwaySum  += r.advanced.fairwayHits;
                    c1RegSum    += r.advanced.c1InReg;
                    c2RegSum    += r.advanced.c2InReg;
                    scrambleSum += r.advanced.scramble;
                    c1xSum      += r.advanced.c1xPutting;
                    c2Sum       += r.advanced.c2Putting;
                    advCount++;
                }
            }

            playerStats.push({
                pdgaNumber: String(pdgaNum),
                name,
                division,
                rating: roster?.rating ?? 0,
                toPar,
                breakdown: { eagles, birdies, pars, bogeys, doubles, triples },
                advanced: {
                    fairwayHits: advCount ? +(fairwaySum / advCount).toFixed(1) : 0,
                    c1InReg:     advCount ? +(c1RegSum   / advCount).toFixed(1) : 0,
                    c2InReg:     advCount ? +(c2RegSum   / advCount).toFixed(1) : 0,
                    scramble:    advCount ? +(scrambleSum / advCount).toFixed(1) : 0,
                    c1xPutting:  advCount ? +(c1xSum     / advCount).toFixed(1) : 0,
                    c2Putting:   advCount ? +(c2Sum       / advCount).toFixed(1) : 0,
                },
                rounds,
            });
        }

        playerStats.sort((a, b) => a.toPar - b.toPar);

        tournaments.push({
            id: t.id,
            name: t.name,
            location: t.location,
            startDate: t.startDate,
            endDate: t.endDate,
            players: playerStats,
        });
    }

    return tournaments;
}

export default async function StatsPage() {
    const { userId } = await auth();
    const premium = userId ? await isPremium(userId) : false;

    let tournaments: TournamentStats[] = [];
    try { tournaments = await fetchStatsData(); } catch (e) {
        console.error('Stats page error:', e);
    }

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh' }}>
            <StatsClient tournaments={tournaments} isPremium={premium} />
        </main>
    );
}
