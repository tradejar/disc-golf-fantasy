// Derive 0-100 ability ratings from StatMando season stats.
//
// Dimensions (all grounded in real data):
//   Power       - long-hole slugging (driving page; reaching the circle in
//                 regulation on 400'+ holes requires distance)
//   Accuracy    - Fairway% + C1-in-regulation
//   Recovery    - Scramble%
//   Putting     - C1X make% + C2 make% + strokes-gained putting / round
//   Consistency - balance across driving/putting/scramble (harmonic mean, so a
//                 weak link hurts) + scoring steadiness (birdie:bogey ratio,
//                 OB avoidance)
//
// Each underlying metric is converted to a percentile WITHIN the division's
// qualified field, composites are averaged, then scaled to 0-100. This is
// self-calibrating: 100 always means "top of the current tour".

// Each value is a 0-100 rating (the player's percentile within their division's
// qualified field), or null when there isn't enough data to rate them.
export interface Abilities {
    power: number | null;
    accuracy: number | null;
    recovery: number | null;
    putting: number | null;
    consistency: number | null;
}

export interface StatRowLite {
    norm_name: string;
    division: string;
    category: string;
    stats: Record<string, number>;
    events: number | null;
    rounds: number | null;
}

// Minimum sample to be rated, so a one-event cameo can't post a fake 5.
const MIN_MAIN_ROUNDS = 10;
// Power comes from 400'+ "long hole" driving samples. FPO courses have far fewer
// long holes than MPO, so a full FPO season only yields ~30-37 — gate FPO lower
// or nearly the whole field would be unrated on Power.
const MIN_DRIVING_HOLES: Record<string, number> = { MPO: 36, FPO: 18 };

// Composite weights.
const PUTT_W = { c1x: 0.4, c2p: 0.3, sgp: 0.3 };
const STEADY_W = { ratio: 0.7, ob: 0.3 };
const CONSISTENCY_W = { balance: 0.5, steady: 0.5 };

// Percentile (0..1) -> 0-100 rating.
function score100(pct: number): number {
    return Math.round(Math.max(0, Math.min(1, pct)) * 100);
}

// Mid-rank percentile of value v within sorted ascending array (higher = better).
function percentile(sortedAsc: number[], v: number): number {
    const n = sortedAsc.length;
    if (n <= 1) return 0.5;
    let less = 0, equal = 0;
    for (const x of sortedAsc) {
        if (x < v) less++;
        else if (x === v) equal++;
    }
    return (less + 0.5 * Math.max(0, equal - 1)) / (n - 1);
}

function harmonicMean(vals: number[]): number {
    const xs = vals.filter(v => v > 0);
    if (xs.length === 0) return 0;
    return xs.length / xs.reduce((s, v) => s + 1 / v, 0);
}

/**
 * Compute abilities for every player that has enough data. Returns a map keyed
 * by `${norm_name}|${division}`. Pass ALL rows (both divisions); they're grouped
 * and percentiled within each division.
 */
export function deriveStars(rows: StatRowLite[]): Map<string, Abilities> {
    const out = new Map<string, Abilities>();

    for (const division of ['MPO', 'FPO']) {
        const divRows = rows.filter(r => r.division === division);

        // Group categories per player.
        type P = { main?: StatRowLite; driving?: StatRowLite };
        const players = new Map<string, P>();
        for (const r of divRows) {
            if (r.category !== 'main' && r.category !== 'driving') continue;
            const p = players.get(r.norm_name) ?? {};
            (p as Record<string, StatRowLite>)[r.category] = r;
            players.set(r.norm_name, p);
        }

        // Qualified subsets.
        const minDriving = MIN_DRIVING_HOLES[division] ?? 36;
        const mainQ: string[] = [];
        const drivingQ: string[] = [];
        for (const [name, p] of players) {
            if (p.main && (p.main.rounds ?? 0) >= MIN_MAIN_ROUNDS) mainQ.push(name);
            if (p.driving && (p.driving.rounds ?? 0) >= minDriving) drivingQ.push(name);
        }

        // Helper to pull a numeric stat.
        const s = (r: StatRowLite | undefined, key: string): number | undefined =>
            r && typeof r.stats[key] === 'number' ? r.stats[key] : undefined;

        // Build sorted metric arrays among qualified players.
        const collect = (names: string[], fn: (p: P) => number | undefined): number[] =>
            names.map(n => fn(players.get(n)!)).filter((v): v is number => v !== undefined).sort((a, b) => a - b);

        const fwy = collect(mainQ, p => s(p.main, 'FWY'));
        const c1r = collect(mainQ, p => s(p.main, 'C1R'));
        const scr = collect(mainQ, p => s(p.main, 'SCR'));
        const c1x = collect(mainQ, p => s(p.main, 'C1X'));
        const c2p = collect(mainQ, p => s(p.main, 'C2P'));
        const sgpPR = collect(mainQ, p => {
            const sg = s(p.main, 'Tot. SG:P'); const r = p.main?.rounds ?? 0;
            return sg !== undefined && r > 0 ? sg / r : undefined;
        });
        const ratio = collect(mainQ, p => {
            const b = s(p.main, 'Birdie Avg'); const bo = s(p.main, 'Bogey Avg');
            return b !== undefined && bo !== undefined ? b / Math.max(bo, 0.1) : undefined;
        });
        const ob = collect(mainQ, p => s(p.main, 'OB/18'));
        const slg = collect(drivingQ, p => s(p.driving, 'SLG'));

        for (const [name, p] of players) {
            const mainOk = p.main && (p.main.rounds ?? 0) >= MIN_MAIN_ROUNDS;
            const drivingOk = p.driving && (p.driving.rounds ?? 0) >= minDriving;

            // Power
            const powerPct = drivingOk ? percentile(slg, s(p.driving, 'SLG')!) : null;

            let accuracy: number | null = null, recovery: number | null = null,
                putting: number | null = null, consistency: number | null = null;
            let puttPct: number | null = null, recPct: number | null = null;

            if (mainOk) {
                const fwyV = s(p.main, 'FWY'), c1rV = s(p.main, 'C1R');
                if (fwyV !== undefined && c1rV !== undefined) {
                    accuracy = score100((percentile(fwy, fwyV) + percentile(c1r, c1rV)) / 2);
                }
                const scrV = s(p.main, 'SCR');
                if (scrV !== undefined) { recPct = percentile(scr, scrV); recovery = score100(recPct); }

                const c1xV = s(p.main, 'C1X'), c2pV = s(p.main, 'C2P'), sg = s(p.main, 'Tot. SG:P');
                const r = p.main!.rounds ?? 0;
                if (c1xV !== undefined && c2pV !== undefined && sg !== undefined && r > 0) {
                    puttPct = PUTT_W.c1x * percentile(c1x, c1xV)
                        + PUTT_W.c2p * percentile(c2p, c2pV)
                        + PUTT_W.sgp * percentile(sgpPR, sg / r);
                    putting = score100(puttPct);
                }

                // Consistency: balance(driving/putting/scramble) + scoring steadiness
                const balanceParts = [powerPct, puttPct, recPct].filter((v): v is number => v !== null);
                const balance = balanceParts.length ? harmonicMean(balanceParts) : 0;

                const b = s(p.main, 'Birdie Avg'), bo = s(p.main, 'Bogey Avg'), obV = s(p.main, 'OB/18');
                let steady: number | null = null;
                if (b !== undefined && bo !== undefined && obV !== undefined) {
                    const ratioPct = percentile(ratio, b / Math.max(bo, 0.1));
                    const obPct = 1 - percentile(ob, obV); // fewer OBs is better
                    steady = STEADY_W.ratio * ratioPct + STEADY_W.ob * obPct;
                }
                if (steady !== null && balanceParts.length) {
                    consistency = score100(CONSISTENCY_W.balance * balance + CONSISTENCY_W.steady * steady);
                }
            }

            out.set(`${name}|${division}`, {
                power: powerPct !== null ? score100(powerPct) : null,
                accuracy, recovery, putting, consistency,
            });
        }
    }

    return out;
}
