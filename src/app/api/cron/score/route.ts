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
        .eq('tournament_id', tournament.id)
        .gt('strokes', 0); // only fetch rows with real data — immune to zero rows from any source

    if (statsError) {
        console.error('Score cron: failed to fetch player_stats', statsError);
        return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    // All fetched rows have strokes > 0 by query filter; just check if any exist
    const hasRealData = (allStats?.length ?? 0) > 0;
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

    // ── Per-division difficulty bonus (PDGA round-rating baseline) ─────────────
    // Formula: bonus% = max(0, UPPER_BOUND − avg_round_rating_top20)
    //
    // Upper bounds are the easiest events in the 2025 DGPT season
    // (excluding field-skewed events like USDGC and EDGF):
    //   MPO: 1050 = Discmania Challenge 2025 top-20 avg round rating
    //   FPO: 977  = Music City Open 2025 top-20 avg round rating
    //
    // An event at the upper bound gets 0% bonus; harder courses get progressively
    // higher bonuses, making fantasy points comparable across course difficulties.
    const MPO_ROUND_RATING_UPPER = 1050;
    const FPO_ROUND_RATING_UPPER = 977;
    const difficultyBonusPct = new Map<string, number>(); // division → bonus %

    for (const div of ['MPO', 'FPO']) {
        if (!divisionComplete.get(div)) continue; // only when final scores locked

        const upperBound = div === 'MPO' ? MPO_ROUND_RATING_UPPER : FPO_ROUND_RATING_UPPER;

        // Fetch all rounds from PDGA live API and aggregate per-player round ratings
        const byPlayer = new Map<number, { strokes: number; rds: Set<number>; rr: number[] }>();
        let maxRd = 0;

        for (let rd = 1; rd <= 5; rd++) {
            const pdgaUrl = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${tournament.pdga_id}&Division=${div}&Round=${rd}`;
            let rdScores: any[] = [];
            try {
                const rdRes = await fetch(pdgaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
                rdScores = (await rdRes.json()).data?.scores ?? [];
            } catch (e) {
                console.warn(`Difficulty bonus [${div}]: failed to fetch round ${rd}`, e);
                break;
            }

            const played = rdScores.filter((s: any) => s.HasRoundScore === 1 && (s.RoundScore ?? 0) > 0);
            if (!played.length) break;

            // Skip non-stroke rounds (e.g. match-play): median score must be >= 48
            const sortedScores = played.map((s: any) => s.RoundScore as number).sort((a: number, b: number) => a - b);
            const med = sortedScores[Math.floor(sortedScores.length / 2)];
            if (med < 48) continue;

            maxRd = rd;
            for (const s of played) {
                if (!byPlayer.has(s.PDGANum)) byPlayer.set(s.PDGANum, { strokes: 0, rds: new Set(), rr: [] });
                const p = byPlayer.get(s.PDGANum)!;
                p.strokes += s.RoundScore ?? 0;
                p.rds.add(rd);
                if ((s.RoundRating ?? 0) > 0) p.rr.push(s.RoundRating);
            }
        }

        if (!maxRd) {
            console.log(`Difficulty bonus [${div}]: no valid round data from PDGA API`);
            continue;
        }

        // Top 20 by total strokes among players who completed the final round
        const top20 = [...byPlayer.values()]
            .filter(p => p.rds.has(maxRd))
            .sort((a, b) => a.strokes - b.strokes)
            .slice(0, 20)
            .filter(p => p.rr.length > 0);

        if (top20.length < 10) {
            console.log(`Difficulty bonus [${div}]: too few players with round ratings (${top20.length})`);
            continue;
        }

        const avgRR = Math.round(
            top20.reduce((s, p) => s + p.rr.reduce((a, b) => a + b, 0) / p.rr.length, 0) / top20.length
        );
        const bonus = Math.max(0, upperBound - avgRR);
        difficultyBonusPct.set(div, bonus);
        console.log(`Difficulty bonus [${div}]: upper=${upperBound}, top20_avg_rr=${avgRR}, bonus=${bonus}%`);
    }

    try {
        const mpoBonus = difficultyBonusPct.get('MPO') ?? 0;
        const fpoBonus = difficultyBonusPct.get('FPO') ?? 0;
        if (divisionComplete.get('MPO') || divisionComplete.get('FPO')) {
            await supabaseAdmin.from('tournament_difficulty_bonuses').upsert({
                tournament_id: tournament.id,
                mpo_bonus_pct: mpoBonus,
                fpo_bonus_pct: fpoBonus,
                computed_at: now.toISOString(),
            }, { onConflict: 'tournament_id' });
        }
    } catch (e) {
        console.warn('Score cron: failed to persist difficulty bonus', e);
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
        .select('id, user_id, roster_data, breakdown_data, total_points')
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
            const realRounds = rounds.filter(r => (r.strokes ?? 0) > 0 || (r.fantasy_points ?? 0) !== 0);

            if (realRounds.length > 0) {
                let pts = 0, strokes = 0, toPar = 0, albatrosses = 0, eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0, triples = 0;
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
                    pars += r.pars || 0; bogeys += r.bogeys || 0; doubles += r.double_bogeys || 0; triples += r.triple_bogeys || 0;

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

                const holeScoringPts = pts; // snapshot before bonuses — difficulty multiplier applies only to this
                totalPoints += holeScoringPts;
                const placement = realRounds[realRounds.length - 1]?.placement ?? null;
                const totalAces = realRounds.reduce((sum, r) => sum + (r.aces || 0), 0);

                // Difficulty bonus — applied ONLY to hole-scoring points, never to placement.
                const playerDiv = realRounds[0]?.division ?? null;
                const isDivComplete = playerDiv ? (divisionComplete.get(playerDiv) ?? false) : false;
                const divBonus = playerDiv ? (difficultyBonusPct.get(playerDiv) ?? 0) : 0;
                let bonusAdded = 0;
                if (divBonus > 0 && isDivComplete) {
                    // Clamp to 0 so negative scores are never penalised further by the multiplier.
                    bonusAdded = Math.max(0, Math.round(holeScoringPts * divBonus / 100));
                    pts += bonusAdded;
                    totalPoints += bonusAdded;
                }

                // Placement bonus: added AFTER difficulty calculation — not subject to multiplier.
                let placementPts = 0;
                if (isDivComplete && placement && placement > 0) {
                    placementPts = getPlacementPoints(placement);
                    pts += placementPts;
                    totalPoints += placementPts;
                }


                breakdownData[player.id] = {
                    totals: { strokes, toPar, totalPoints: pts, tournamentRank: placement, placementPoints: placementPts, difficultyBonusPct: divBonus, breakdown: { albatrosses, eagles, birdies, pars, bogeys, doubles, triples, aces: totalAces }, advanced: validRounds > 0 ? { c1xPutting: +(c1xSum / validRounds).toFixed(2), c2Putting: +(c2Sum / validRounds).toFixed(2), fairwayHits: +(fairwaySum / validRounds).toFixed(2), c1InReg: +(c1RegSum / validRounds).toFixed(2), c2InReg: +(c2RegSum / validRounds).toFixed(2), scramble: +(scrambleSum / validRounds).toFixed(2) } : null, bonuses: { bogeyFree: false, streak3: false, ace: totalAces > 0 } },
                    rounds: roundsData,
                };
            } else {
                // No fresh player_stats data — preserve existing breakdown to avoid erasing established scores.
                // PDGA frequently clears live scores during finalization; we must not reset to 0 during those windows.
                const existingBreakdown = (entry as any).breakdown_data?.[player.id];
                const preservedPts = existingBreakdown?.totals?.totalPoints ?? 0;
                if (preservedPts !== 0) {
                    totalPoints += preservedPts;
                    breakdownData[player.id] = existingBreakdown; // carry forward
                } else {
                    breakdownData[player.id] = { totals: { strokes: 0, toPar: 0, totalPoints: 0, tournamentRank: null, placementPoints: 0, breakdown: { albatrosses: 0, eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, triples: 0, aces: 0 }, advanced: null, bonuses: { bogeyFree: false, streak3: false, ace: false } }, rounds: [] };
                }
            }
        }

        entryScores.push({ id: entry.id, totalPoints });

        // High-water-mark guard: never write a score ≤0 for a live tournament if the entry
        // already has an established positive score. PDGA frequently serves incomplete/zeroed
        // data during finalization windows — we protect existing scores until official data arrives.
        const existingTotal = (entry as any).total_points ?? 0;
        if (totalPoints <= 0 && existingTotal > 0 && !tournamentOver) {
            console.log(`Score cron: skipping entry ${entry.id.slice(0,8)} — new score ${totalPoints} ≤ 0 but existing ${existingTotal} > 0 (live tournament data gap)`);
            continue; // preserve existing DB value
        }

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
