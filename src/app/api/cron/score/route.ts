import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SCORING_RULES, getPlacementPoints } from '@/lib/scoring';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

// Runs every 10 minutes on tournament days.
// Finds the active (locked but not yet completed) tournament, fetches all entries,
// scores each roster against the latest player_stats from PDGA live, and writes
// breakdown_data + total_points + tournament_rank back to the entries table.
// This keeps My History in sync with PDGA live without users needing to do anything.

export async function GET(request: Request) {
    // Allow Vercel cron or an admin secret to trigger this
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const rule = SCORING_RULES.CUSTOM_USER;

    // Optional override: ?tournamentId=96402 allows manual re-scoring of any past tournament
    const url = new URL(request.url);
    const overrideTournamentId = url.searchParams.get('tournamentId') ?? null;
    const forceScore = url.searchParams.get('force') === 'true';

    let tournament;
    if (overrideTournamentId) {
        tournament = SEASON_2026.find(t => t.id === overrideTournamentId || t.pdga_id === overrideTournamentId);
        if (!tournament) {
            return NextResponse.json({ error: `Tournament ${overrideTournamentId} not found` }, { status: 404 });
        }
    } else {
        // Walk the list in reverse to get the MOST RECENT locked tournament
        const sortedByLock = [...SEASON_2026]
            .filter(t => getLockTime(t) <= now)
            .sort((a, b) => getLockTime(b).getTime() - getLockTime(a).getTime());
        tournament = sortedByLock[0];
    }

    if (!tournament) {
        return NextResponse.json({ message: 'No active tournament to score', now: now.toISOString() });
    }

    // Fetch all player_stats for this tournament
    const { data: allStats, error: statsError } = await supabaseAdmin
        .from('player_stats')
        .select('*')
        .eq('tournament_id', tournament.id);

    if (statsError) {
        console.error('Score cron: failed to fetch player_stats', statsError);
        return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    // Skip scoring if no real data yet (all zeros = PDGA placeholders)
    const hasRealData = allStats?.some(s => (s.strokes ?? 0) > 0);
    if (!hasRealData && !forceScore) {
        return NextResponse.json({ message: 'No real scoring data yet', tournamentId: tournament.id });
    }

    // Determine if the tournament's final round is complete → apply placement bonus
    const maxRound = allStats && allStats.length > 0
        ? Math.max(...allStats.map((s: any) => s.round_number ?? 0))
        : 0;
    // For override/force mode: treat the tournament as over if all expected rounds have data
    const tournamentOver = maxRound >= tournament.rounds || (overrideTournamentId !== null && maxRound >= 3);

    // Per-division completion: apply placement bonuses only when BOTH conditions
    // are true for a division:
    //   1. ≥95% of the field has completed all 18 holes (holesPlayed >= 18)
    //   2. No sudden-death playoff is ongoing (no tie for 1st place)
    //
    // "holes played" = sum of all hole-category counts (the only way to know how
    // many holes each player has completed without storing per-hole data).
    const holesPlayed = (s: any) =>
        (s.albatrosses ?? 0) + (s.eagles ?? 0) + (s.birdies ?? 0) + (s.pars ?? 0) +
        (s.bogeys ?? 0) + (s.double_bogeys ?? 0) + (s.triple_bogeys ?? 0) + (s.aces ?? 0);

    // Sudden death: if 2+ players share placement=1, PDGA has not resolved the
    // tie yet. We hold off on ALL placement bonuses for that division until
    // RunningPlace is updated (winner → 1, loser → 2, others bumped down).
    // The cron runs every 10 min and recomputes from live PDGA data each time.
    const divisionComplete = new Map<string, boolean>();
    const divisionSuddenDeath = new Map<string, boolean>();
    if (tournamentOver) {
        for (const div of ['MPO', 'FPO']) {
            const finalRoundStats = allStats!.filter(s => s.round_number === maxRound && s.division === div);
            const r1Count = allStats!.filter(s => s.round_number === 1 && s.division === div && holesPlayed(s) >= 18).length;
            const finalCount = finalRoundStats.filter(s => holesPlayed(s) >= 18).length;

            // Step 1: has \u226595% of the field finished all 18 holes?
            const fieldComplete = r1Count > 0 && finalCount >= Math.floor(r1Count * 0.95);

            // Step 2: are there 2+ players tied for 1st? (sudden death in progress)
            // PDGA sets RunningPlace=1 for all leaders tied after regulation.
            // We wait until exactly 1 player holds placement=1.
            const tiedForFirst = fieldComplete
                ? finalRoundStats.filter(s => holesPlayed(s) >= 18 && (s.placement ?? 0) === 1).length
                : 0;
            const inSuddenDeath = fieldComplete && tiedForFirst > 1;

            divisionSuddenDeath.set(div, inSuddenDeath);
            divisionComplete.set(div, fieldComplete && !inSuddenDeath);
        }
    }

    // ── Per-division difficulty bonus (2025 DGPT baseline-adjusted) ────────────
    // Formula: bonus% = max(0, (actual_field_mean − predicted_field_mean) / actual × 100)
    // where predicted = BASELINE_A + BASELINE_B × field_mean_rating
    // Baseline fitted from all 10 2025 DGPT Elite Series events (weighted OLS):
    //   intercept = 1017.8, slope = −0.802 strokes per rating point
    // This captures absolute course difficulty vs a neutral 2025 DGPT event,
    // controlling for field composition. Applied to hole-scoring pts only.
    const OUTLIER_TRIM = 3;
    const BASELINE_A = 1017.8;   // 2025 DGPT OLS intercept
    const BASELINE_B = -0.802;   // 2025 DGPT OLS slope (strokes per rating pt)
    const difficultyBonusPct = new Map<string, number>(); // division → bonus %

    for (const div of ['MPO', 'FPO']) {
        if (!divisionComplete.get(div)) continue; // only when final scores locked

        // Collect (totalStrokes, rating) per player across all rounds
        const totalsByPlayer = new Map<number, { strokes: number; rating: number | null }>();
        for (const s of allStats ?? []) {
            if (s.division !== div || (s.strokes ?? 0) <= 0) continue;
            const existing = totalsByPlayer.get(s.pdga_number);
            totalsByPlayer.set(s.pdga_number, {
                strokes: (existing?.strokes ?? 0) + s.strokes,
                rating: existing?.rating ?? s.official_rating ?? null,
            });
        }

        if (totalsByPlayer.size < OUTLIER_TRIM + 2) continue;

        // Sort by total strokes ascending, trim bottom 3 outliers
        const sorted = [...totalsByPlayer.values()].sort((a, b) => a.strokes - b.strokes);
        const trimmed = sorted.slice(0, sorted.length - OUTLIER_TRIM);

        const actualFieldMean = trimmed.reduce((s, v) => s + v.strokes, 0) / trimmed.length;

        // Field mean rating (only rated players; fall back to overall mean if sparse)
        const ratedPlayers = trimmed.filter(p => p.rating && p.rating > 900);
        const fieldMeanRating = ratedPlayers.length >= 10
            ? ratedPlayers.reduce((s, p) => s + p.rating!, 0) / ratedPlayers.length
            : null;

        let bonus = 0;
        if (fieldMeanRating !== null) {
            // Baseline-adjusted: how many extra strokes did the course demand?
            const predictedFieldMean = BASELINE_A + BASELINE_B * fieldMeanRating;
            const difficultyDelta = actualFieldMean - predictedFieldMean;
            bonus = Math.max(0, Math.round(difficultyDelta / actualFieldMean * 100));
            console.log(`Difficulty bonus [${div}]: field_rating=${fieldMeanRating.toFixed(1)}, predicted=${predictedFieldMean.toFixed(1)}, actual=${actualFieldMean.toFixed(1)}, delta=${difficultyDelta.toFixed(1)}, bonus=${bonus}%`);
        } else {
            // Fallback if ratings unavailable: old winner-gap method
            const winner = sorted[0].strokes;
            bonus = Math.max(0, Math.round(actualFieldMean - winner));
            console.log(`Difficulty bonus [${div}] (fallback): mean=${actualFieldMean.toFixed(1)}, winner=${winner}, bonus=${bonus}%`);
        }
        if (bonus > 0) difficultyBonusPct.set(div, bonus);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Group stats by pdga_number
    const statsByPdga = new Map<number, any[]>();
    for (const stat of allStats ?? []) {
        if (!statsByPdga.has(stat.pdga_number)) statsByPdga.set(stat.pdga_number, []);
        statsByPdga.get(stat.pdga_number)!.push(stat);
    }

    // Fetch all entries for this tournament
    const { data: entries, error: entriesError } = await supabaseAdmin
        .from('entries')
        .select('id, user_id, roster_data')
        .eq('tournament_id', tournament.id);

    if (entriesError) {
        console.error('Score cron: failed to fetch entries', entriesError);
        return NextResponse.json({ error: entriesError.message }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
        return NextResponse.json({ message: 'No entries found', tournamentId: tournament.id });
    }

    // Score each entry
    const updates: { id: string; total_points: number; budget_remaining: number; breakdown_data: any; tournament_rank: number | null }[] = [];
    const entryScores: { id: string; totalPoints: number }[] = [];

    for (const entry of entries) {
        const roster: any[] = entry.roster_data || [];
        let totalPoints = 0;
        const breakdownData: Record<string, any> = {};

        for (const player of roster) {
            const pdgaNum = player.pdgaNumber as number | undefined;
            const rounds = pdgaNum ? (statsByPdga.get(pdgaNum) ?? []) : [];
            const realRounds = rounds.filter(r => (r.strokes ?? 0) > 0);

            if (realRounds.length > 0) {
                let pts = 0, strokes = 0, toPar = 0, albatrosses = 0, eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0;
                let c1xSum = 0, c2Sum = 0, fairwaySum = 0, c1RegSum = 0, c2RegSum = 0, scrambleSum = 0, validRounds = 0;
                const roundsData: any[] = [];

                realRounds.sort((a, b) => a.round_number - b.round_number);

                for (const r of realRounds) {
                    let rPts = r.fantasy_points ?? null;
                    if (rPts === null || rPts === undefined) {
                        rPts = 0;
                        rPts += (r.albatrosses || 0) * rule.albatross;
                        rPts += (r.eagles || 0) * rule.eagle;
                        rPts += (r.birdies || 0) * rule.birdie;
                        rPts += (r.pars || 0) * rule.par;
                        rPts += (r.bogeys || 0) * rule.bogey;
                        rPts += (r.double_bogeys || 0) * rule.double;
                        rPts += (r.triple_bogeys || 0) * rule.triple;
                        rPts += (r.aces || 0) * rule.ace;  // +15 per ace
                        const bogeyFree = r.strokes > 0 && ((r.bogeys || 0) + (r.double_bogeys || 0) + (r.triple_bogeys || 0)) === 0;
                        if (bogeyFree) rPts += rule.bogeyFree;
                    }

                    pts += rPts;
                    strokes += r.strokes; toPar += r.to_par;
                    albatrosses += r.albatrosses || 0; eagles += r.eagles || 0; birdies += r.birdies || 0;
                    pars += r.pars || 0; bogeys += r.bogeys || 0; doubles += r.double_bogeys || 0;

                    const hasAdvanced = (r.fairway_pct > 0 || r.c1_in_reg_pct > 0 || r.c1x_pct > 0);
                    if (hasAdvanced) {
                        c1xSum += r.c1x_pct; c2Sum += r.c2_pct; fairwaySum += r.fairway_pct;
                        c1RegSum += r.c1_in_reg_pct; c2RegSum += r.c2_in_reg_pct; scrambleSum += r.scramble_pct;
                        validRounds++;
                    }

                    roundsData.push({
                        roundNumber: r.round_number, strokes: r.strokes, toPar: r.to_par, totalPoints: rPts,
                        breakdown: { albatrosses: r.albatrosses || 0, eagles: r.eagles || 0, birdies: r.birdies || 0, pars: r.pars || 0, bogeys: r.bogeys || 0, doubles: r.double_bogeys || 0, triples: r.triple_bogeys || 0, aces: r.aces || 0 },
                        advanced: hasAdvanced ? { c1xPutting: r.c1x_pct, c2Putting: r.c2_pct, fairwayHits: r.fairway_pct, c1InReg: r.c1_in_reg_pct, c2InReg: r.c2_in_reg_pct, scramble: r.scramble_pct } : null
                    });
                }

                totalPoints += pts;
                const placement = realRounds[realRounds.length - 1]?.placement ?? null;
                const totalAces = realRounds.reduce((sum, r) => sum + (r.aces || 0), 0);

                // Difficulty bonus — applied to hole-scoring pts before placement
                const playerDiv = realRounds[0]?.division ?? null;
                const isDivComplete = playerDiv ? (divisionComplete.get(playerDiv) ?? false) : false;
                const divBonus = playerDiv ? (difficultyBonusPct.get(playerDiv) ?? 0) : 0;
                if (divBonus > 0 && isDivComplete) {
                    // Clamp to 0 so negative scores are never penalised further by the multiplier.
                    // e.g. pts=-8, bonus=25% → bonusAdded=max(0, -2)=0 instead of making it -10.
                    const bonusAdded = Math.max(0, Math.round(pts * divBonus / 100));
                    pts += bonusAdded;
                    totalPoints += bonusAdded;
                }

                // Placement bonus: applied per-division only once that division's
                // final round is fully complete (≥95% of the r1 field has scored).
                let placementPts = 0;
                if (isDivComplete && placement && placement > 0) {
                    placementPts = getPlacementPoints(placement);
                    pts += placementPts;
                    totalPoints += placementPts;
                }


                breakdownData[player.id] = {
                    totals: { strokes, toPar, totalPoints: pts, tournamentRank: placement, placementPoints: placementPts, difficultyBonusPct: divBonus, breakdown: { albatrosses, eagles, birdies, pars, bogeys, doubles, triples: 0, aces: totalAces }, advanced: validRounds > 0 ? { c1xPutting: +(c1xSum / validRounds).toFixed(2), c2Putting: +(c2Sum / validRounds).toFixed(2), fairwayHits: +(fairwaySum / validRounds).toFixed(2), c1InReg: +(c1RegSum / validRounds).toFixed(2), c2InReg: +(c2RegSum / validRounds).toFixed(2), scramble: +(scrambleSum / validRounds).toFixed(2) } : null, bonuses: { bogeyFree: false, streak3: false, ace: totalAces > 0 } },
                    rounds: roundsData,
                };
            } else {
                breakdownData[player.id] = { totals: { strokes: 0, toPar: 0, totalPoints: 0, tournamentRank: null, placementPoints: 0, breakdown: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, triples: 0, aces: 0 }, advanced: null, bonuses: { bogeyFree: false, streak3: false, ace: false } }, rounds: [] };
            }
        }

        entryScores.push({ id: entry.id, totalPoints });
        updates.push({ id: entry.id, total_points: totalPoints, budget_remaining: 0, breakdown_data: breakdownData, tournament_rank: null });
    }

    // Compute relative tournament_rank across all entries
    entryScores.sort((a, b) => b.totalPoints - a.totalPoints);
    const rankMap = new Map<string, number>();
    entryScores.forEach((e, i) => rankMap.set(e.id, i + 1));

    // Write scores back — use update (not upsert) since entries always exist already
    let updated = 0;
    for (const u of updates) {
        const { error: updateError } = await supabaseAdmin
            .from('entries')
            .update({
                total_points: u.total_points,
                breakdown_data: u.breakdown_data,
                tournament_rank: rankMap.get(u.id) ?? null,
            })
            .eq('id', u.id);

        if (updateError) {
            console.error(`Score cron: failed to update entry ${u.id}`, updateError);
        } else {
            updated++;
        }
    }

    const mpoComplete = divisionComplete.get('MPO') ?? false;
    const fpoComplete = divisionComplete.get('FPO') ?? false;
    const mpoSuddenDeath = divisionSuddenDeath.get('MPO') ?? false;
    const fpoSuddenDeath = divisionSuddenDeath.get('FPO') ?? false;
    console.log(`Score cron: ${tournament.id} — MPO complete=${mpoComplete}(sd=${mpoSuddenDeath}), FPO complete=${fpoComplete}(sd=${fpoSuddenDeath}) (round ${maxRound}/${tournament.rounds})`);
    return NextResponse.json({
        ok: true,
        tournamentId: tournament.id,
        scoredEntries: entries.length,
        maxRound,
        totalRounds: tournament.rounds,
        mpoComplete,
        fpoComplete,
        mpoSuddenDeath,
        fpoSuddenDeath,
        checkedAt: now.toISOString(),
    });
}
