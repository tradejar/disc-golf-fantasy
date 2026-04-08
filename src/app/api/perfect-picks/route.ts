import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { ALL_PLAYERS } from '@/data/mock-players';
import { calculatePrice, calculateDynamicPrice } from '@/lib/pricing';

export const revalidate = 3600; // cache 1 hour — results don't change once a tournament ends

const BUDGET = 950;
const MPO_PICKS = 4;
const FPO_PICKS = 2;

interface Candidate {
    pdgaNumber: number;
    name: string;
    division: 'MPO' | 'FPO';
    price: number;
    fantasyPoints: number;
    placement: number | null;
    toPar: number;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tournamentIdParam = searchParams.get('tournamentId');
    const now = new Date();

    // Find the target tournament — default to most recently completed
    let tournament;
    if (tournamentIdParam) {
        tournament = SEASON_2026.find(t => t.id === tournamentIdParam);
    } else {
        const completed = SEASON_2026
            .filter(t => getLockTime(t) < now)
            .sort((a, b) => getLockTime(b).getTime() - getLockTime(a).getTime());
        tournament = completed[0];
    }

    if (!tournament) return NextResponse.json({ error: 'No completed tournament found' }, { status: 404 });

    // 1. Registered players (names + ratings)
    const { data: regs } = await supabaseAdmin
        .from('tournament_registrations')
        .select('pdga_number, first_name, last_name, rating, division')
        .eq('tournament_id', tournament.id);

    if (!regs?.length) return NextResponse.json({ error: 'No registrations for this tournament' }, { status: 404 });

    // 2. Actual scores from player_stats
    const { data: statsRows } = await supabaseAdmin
        .from('player_stats')
        .select('pdga_number, fantasy_points, to_par, placement, round_number')
        .eq('tournament_id', tournament.id);

    if (!statsRows?.length) return NextResponse.json({ error: 'No scoring data yet' }, { status: 404 });

    // Aggregate per player: sum fantasy_points + to_par, keep final-round placement
    const statsMap = new Map<number, { totalPts: number; totalToPar: number; placement: number | null; maxRound: number }>();
    for (const row of statsRows) {
        const s = statsMap.get(row.pdga_number);
        if (!s) {
            statsMap.set(row.pdga_number, {
                totalPts: row.fantasy_points ?? 0,
                totalToPar: row.to_par ?? 0,
                placement: row.placement,
                maxRound: row.round_number,
            });
        } else {
            const newer = row.round_number > s.maxRound;
            statsMap.set(row.pdga_number, {
                totalPts: s.totalPts + (row.fantasy_points ?? 0),
                totalToPar: s.totalToPar + (row.to_par ?? 0),
                placement: newer ? row.placement : s.placement,
                maxRound: Math.max(s.maxRound, row.round_number),
            });
        }
    }

    // 3. Build candidate pool with draft-time prices
    const candidates: Candidate[] = [];
    for (const reg of regs) {
        const stats = statsMap.get(reg.pdga_number);
        if (!stats) continue; // player didn't score (DNS/DNF)

        const staticPlayer = ALL_PLAYERS.find(p => p.pdgaNumber === reg.pdga_number);
        const basePrice = calculatePrice(reg.rating as number, reg.division as 'MPO' | 'FPO');
        const price = calculateDynamicPrice(basePrice, staticPlayer ?? {}, tournament, []);

        candidates.push({
            pdgaNumber: reg.pdga_number as number,
            name: `${reg.first_name} ${reg.last_name}`,
            division: reg.division as 'MPO' | 'FPO',
            price,
            fantasyPoints: stats.totalPts,
            placement: stats.placement,
            toPar: stats.totalToPar,
        });
    }

    const mpo = candidates.filter(p => p.division === 'MPO');
    const fpo = candidates.filter(p => p.division === 'FPO');

    if (mpo.length < MPO_PICKS || fpo.length < FPO_PICKS) {
        return NextResponse.json({ error: 'Not enough players with scored data' }, { status: 404 });
    }

    // 4. Knapsack optimization
    const result = optimize(mpo, fpo);
    if (!result) return NextResponse.json({ error: 'Optimization failed — no valid combination found' }, { status: 500 });

    return NextResponse.json({
        picks: result.players,
        totalPoints: result.totalPoints,
        totalCost: result.totalCost,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
    });
}

/**
 * 0/1 Knapsack: find best MPO_PICKS MPO + FPO_PICKS FPO players within BUDGET.
 * 
 * Strategy:
 *  - Build DP table for MPO: dp[k][b] = max fantasy pts using exactly k MPO players with cost exactly b
 *  - Precompute prefix max so we can query "best k MPO within b" in O(1)
 *  - Enumerate all FPO pairs (C(n,2) ≈ 1128 for 48 players) and combine with MPO DP
 */
function optimize(
    mpo: Candidate[],
    fpo: Candidate[],
): { players: Candidate[]; totalPoints: number; totalCost: number } | null {
    const K = MPO_PICKS;
    const B = BUDGET;
    const NEG_INF = -1e15;

    // dp[k][b] = max pts using EXACTLY k MPO players with TOTAL cost EXACTLY b
    const dp: number[][] = Array.from({ length: K + 1 }, () => new Array(B + 1).fill(NEG_INF));
    dp[0][0] = 0;

    // choice[k][b] = index of MPO player that was last added to achieve dp[k][b]
    const choice: number[][] = Array.from({ length: K + 1 }, () => new Array(B + 1).fill(-1));

    // Standard 0/1 knapsack (reverse iteration prevents double-counting)
    for (let i = 0; i < mpo.length; i++) {
        const { price, fantasyPoints } = mpo[i];
        for (let k = Math.min(K, i + 1); k >= 1; k--) {
            for (let b = B; b >= price; b--) {
                if (dp[k - 1][b - price] === NEG_INF) continue;
                const candidate = dp[k - 1][b - price] + fantasyPoints;
                if (candidate > dp[k][b]) {
                    dp[k][b] = candidate;
                    choice[k][b] = i;
                }
            }
        }
    }

    // Prefix max: mpoMax[b] = best dp[K][0..b], mpoBestExact[b] = the exact budget achieving it
    const mpoMax = new Array(B + 1).fill(NEG_INF);
    const mpoBestExact = new Array(B + 1).fill(-1);
    for (let b = 0; b <= B; b++) {
        const prev = b > 0 ? mpoMax[b - 1] : NEG_INF;
        if (dp[K][b] >= prev) {
            mpoMax[b] = dp[K][b];
            mpoBestExact[b] = b;
        } else {
            mpoMax[b] = prev;
            mpoBestExact[b] = b > 0 ? mpoBestExact[b - 1] : -1;
        }
    }

    // Enumerate all FPO pairs
    let bestTotal = NEG_INF;
    let bestFpoA = -1, bestFpoB = -1, bestMpoExactB = -1;

    for (let a = 0; a < fpo.length; a++) {
        for (let b = a + 1; b < fpo.length; b++) {
            const fpoCost = fpo[a].price + fpo[b].price;
            if (fpoCost > B) continue;
            const maxMpoBudget = B - fpoCost;
            if (mpoMax[maxMpoBudget] === NEG_INF) continue;

            const total = mpoMax[maxMpoBudget] + fpo[a].fantasyPoints + fpo[b].fantasyPoints;
            if (total > bestTotal) {
                bestTotal = total;
                bestFpoA = a;
                bestFpoB = b;
                bestMpoExactB = mpoBestExact[maxMpoBudget];
            }
        }
    }

    if (bestTotal === NEG_INF || bestFpoA === -1 || bestMpoExactB === -1) return null;

    // Backtrack MPO picks
    const mpoPicks: Candidate[] = [];
    let remK = K;
    let remB = bestMpoExactB;
    while (remK > 0) {
        const idx = choice[remK][remB];
        if (idx === -1) break;
        mpoPicks.push(mpo[idx]);
        remB -= mpo[idx].price;
        remK--;
    }

    if (mpoPicks.length !== K) return null; // backtracking failed (shouldn't happen)

    const fpoA = fpo[bestFpoA];
    const fpoB = fpo[bestFpoB];
    const totalCost = mpoPicks.reduce((s, p) => s + p.price, 0) + fpoA.price + fpoB.price;

    // Sort MPO by fantasy points desc, same for FPO
    const sortedMpo = mpoPicks.sort((a, b) => b.fantasyPoints - a.fantasyPoints);
    const sortedFpo = [fpoA, fpoB].sort((a, b) => b.fantasyPoints - a.fantasyPoints);

    return {
        players: [...sortedMpo, ...sortedFpo],
        totalPoints: Math.round(bestTotal),
        totalCost,
    };
}
