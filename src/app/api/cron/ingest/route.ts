import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEASON_2026 } from '@/data/tournaments';

export const maxDuration = 60;
export const revalidate = 0;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

interface PdgaHole { HoleOrdinal: number; Par: number; }
interface PdgaScore {
    PDGANum: number;
    FirstName: string;
    LastName: string;
    RoundScore: number;
    RoundtoPar: number;
    HasRoundScore: number; // 1 = round officially finalized, 0 = live/in-progress
    Scores: string;
    RunningPlace: number;
}

/** Returns the tournament actively running today, or null if none. */
function getActiveTournament() {
    const now = new Date();
    return SEASON_2026.find(t => {
        const start = new Date(t.startDate);
        // Run until end of the day after endDate (23:59:59 UTC) so that
        // final-round results, sudden death resolution, and PDGA placement
        // updates are all captured even if they happen late in the evening.
        const end = new Date(t.endDate);
        end.setUTCDate(end.getUTCDate() + 1);
        end.setUTCHours(23, 59, 59, 999);
        return now >= start && now <= end;
    }) || null;
}

// Removed: getNextRoundToIngest — old logic only ingested each round once and missed
// all live score updates mid-round. Now we try all rounds 1-4 every cron run.

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    try {
        // Manual backfill override: ?tournamentId=96409 re-ingests any past event from
        // PDGA live (e.g. to re-pull final scores or run playoff reconciliation after a
        // fix). Looks up the real tournament so pdga_id and rounds are correct — unlike
        // STAGING_TOURN_ID, which can't know the round count. Takes precedence over both.
        const overrideTournamentId = new URL(request.url).searchParams.get('tournamentId');

        // On staging, override with a 2024 tournament ID for real historical data.
        // Trim defensively — a trailing newline from `vercel env add` Enter-key paste
        // once poisoned tournament_id with a literal `\n`, ingesting the wrong event.
        const stagingTournId = process.env.STAGING_TOURN_ID?.trim();

        let PDGA_ID: string;   // used for PDGA live API URL
        let APP_TOURN_ID: string;  // used for DB storage — must match tournament.id used everywhere else
        let tournamentName: string;
        let tournamentRounds = 5; // default; overridden below when the real tournament is known

        if (overrideTournamentId) {
            const tournament = SEASON_2026.find(t => t.id === overrideTournamentId || t.pdga_id === overrideTournamentId);
            if (!tournament) {
                return NextResponse.json({ error: `Tournament ${overrideTournamentId} not found` }, { status: 404 });
            }
            PDGA_ID = tournament.pdga_id;
            APP_TOURN_ID = tournament.id;
            tournamentName = `${tournament.name} (manual backfill)`;
            tournamentRounds = (tournament as any).rounds ?? 5;
        } else if (stagingTournId) {
            PDGA_ID = stagingTournId;
            APP_TOURN_ID = stagingTournId;
            tournamentName = `Staging (2024 PDGA #${stagingTournId})`;
        } else {
            const tournament = getActiveTournament();
            if (!tournament) {
                console.log('No active tournament today — skipping PDGA fetch.');
                return NextResponse.json({ success: true, message: 'No active tournament today. Skipping.' });
            }
            PDGA_ID = tournament.pdga_id;   // PDGA event number for API calls
            APP_TOURN_ID = tournament.id;   // App-internal ID for DB — may differ from pdga_id
            tournamentName = tournament.name;
            tournamentRounds = (tournament as any).rounds ?? 5;
        }

        // Fetch event meta to discover actual PDGA round IDs.
        // Some events (e.g. Champions Cup) use non-sequential internal IDs:
        // sequential rounds are 1..N but the finals/championship round may be 12, 20, etc.
        // We build a list of (pdgaRoundId → appRoundNumber) pairs and iterate those.
        const results = [];
        let roundSchedule: Array<{ pdgaRound: number; appRound: number }> = [];
        // Captured from event meta for post-round playoff reconciliation (see below).
        let finalRoundId = 0;          // PDGA's FinalRound id (the last regulation round)
        let highestCompletedRound = 0; // > finalRoundId when a sudden-death playoff round exists
        try {
            const eventCb = Date.now();
            const eventRes = await fetch(
                `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_event?TournID=${PDGA_ID}&_cb=${eventCb}`,
                { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' }, cache: 'no-store' }
            );
            if (eventRes.ok) {
                const eventData = await eventRes.json();
                const finalRound: number = eventData.data?.FinalRound ?? 0;
                finalRoundId = finalRound;
                highestCompletedRound = eventData.data?.HighestCompletedRound ?? 0;
                const totalAppRounds = tournamentRounds;
                const hasNonSeqFinals = finalRound > 0 && finalRound > totalAppRounds;
                const seqCount = hasNonSeqFinals ? totalAppRounds - 1 : totalAppRounds;
                let appRound = 1;
                for (let r = 1; r <= seqCount; r++) {
                    roundSchedule.push({ pdgaRound: r, appRound: appRound++ });
                }
                if (hasNonSeqFinals) {
                    roundSchedule.push({ pdgaRound: finalRound, appRound: totalAppRounds });
                }
            }
        } catch (_) { /* fall through to default */ }

        // Fallback: try sequential rounds 1–5 if event fetch failed
        if (roundSchedule.length === 0) {
            roundSchedule = Array.from({ length: 5 }, (_, i) => ({ pdgaRound: i + 1, appRound: i + 1 }));
        }

        for (const { pdgaRound: ROUND, appRound: APP_ROUND } of roundSchedule) {
            console.log(`Ingesting: ${tournamentName} (PDGA:${PDGA_ID} / App:${APP_TOURN_ID}), PDGA Round ${ROUND} → App Round ${APP_ROUND}`);

            for (const division of ['MPO', 'FPO']) {
                // Cache-bust: append a timestamp so PDGA's CDN never serves a stale cached response.
                // Without this, Vercel's fixed egress IPs receive the same cached payload repeatedly.
                const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${PDGA_ID}&Division=${division}&Round=${ROUND}`;
                const cacheBust = Date.now();
                const bustUrl = `${url}&_cb=${cacheBust}`;
                const res = await fetch(bustUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Cache-Control': 'no-cache, no-store',
                        'Pragma': 'no-cache',
                    },
                    cache: 'no-store',
                });
                if (!res.ok) {
                    console.error(`PDGA Fetch failed for ${division}: ${res.status}`);
                    results.push({ division, status: 'error', message: `HTTP ${res.status}` });
                    continue;
                }

                const raw = await res.json() as any;
                const data = raw.data;
                if (!data || !data.scores || data.scores.length === 0) {
                    console.log(`No scores yet for ${division} Round ${ROUND}.`);
                    results.push({ division, status: 'no_data', message: `No scores available yet for Round ${ROUND}` });
                    continue;
                }

                const liveRoundId = data.live_round_id;
                let advancedStatsData: any[] = [];

                if (liveRoundId) {
                    const statsUrl = `https://www.pdga.com/api/v1/feat/stats/round-stats/${liveRoundId}?_cb=${cacheBust}`;
                    const statsRes = await fetch(statsUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' },
                        cache: 'no-store',
                    });
                    if (statsRes.ok) {
                        advancedStatsData = (await statsRes.json()) as any[];
                    }
                }

                const holes: PdgaHole[] = data.holes || [];
                const scores: PdgaScore[] = data.scores;

                // Only upsert players who have REAL per-hole scoring data or an officially finalized round.
                // We intentionally IGNORE players with only RoundScore>0 and empty Scores — this is PDGA's
                // finalization transition state where they clear per-hole data before posting official results.
                // Upserting in that window overwrites good fantasy_points with 0 (computed from empty Scores).
                const validScores = scores.filter(p => {
                    if (!p.PDGANum || p.PDGANum <= 0) return false; // no valid PDGA number
                    const isFinalized = p.HasRoundScore === 1; // PDGA officially confirmed round complete
                    const hasHoleScores = (p.Scores ?? '').split(',').some((s: string) => parseInt(s) > 0); // real per-hole data
                    return hasHoleScores || isFinalized;
                    // NOTE: we do NOT include (RoundScore > 0 alone) — that passes during PDGA finalization
                    //       when Scores is temporarily cleared, causing fp=0 to overwrite good data.
                });

                if (validScores.length === 0) {
                    results.push({ division, status: 'no_valid_scores', message: 'No hole scores or finalized rounds yet — round in progress or not started' });
                    continue;
                }

                // Build ScoreID → PDGANum map so we can join the stats response.
                // PDGA's stats API only returns scoreId + name, no pdgaNum directly.
                const scoreIdToPdga = new Map<number, number>();
                scores.forEach((s: any) => {
                    if (s.ScoreID && s.PDGANum) scoreIdToPdga.set(s.ScoreID, s.PDGANum);
                });

                // Build PDGANum → stats record map for O(1) lookup during upsert
                const statsByPdgaNum = new Map<number, any>();
                advancedStatsData.forEach((a: any) => {
                    const pdgaNum = scoreIdToPdga.get(a.score?.scoreId);
                    if (pdgaNum) statsByPdgaNum.set(pdgaNum, a);
                });
                if (statsByPdgaNum.size > 0) {
                    console.log(`Advanced stats matched for ${statsByPdgaNum.size} players`);
                }

                const upsertData = validScores.map(player => {
                    const playerScores = (player.Scores || '').split(',').map((s: string) => parseInt(s));
                    let albatrosses = 0, eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubleBogeys = 0, tripleBogeys = 0, aces = 0;
                    let currentStreak = 0;
                    let streaksHit = 0;
                    let validHoleCount = 0;
                    let holesOverPar = 0;

                    playerScores.forEach((score: number, index: number) => {
                        if (isNaN(score)) return;
                        const holePar = holes[index]?.Par;
                        if (!holePar) return;

                        validHoleCount++;
                        const diff = score - holePar;
                        const isAce = score === 1 && holePar > 1;

                        if (isAce && diff <= -3) {
                            // Albatross ace (par-4 or par-5 hole-in-one):
                            // Only the albatross bonus (+24) applies — ace bonus does NOT stack.
                            albatrosses++;
                            currentStreak++;
                            if (currentStreak === 3) { streaksHit++; currentStreak = 0; }
                        } else if (isAce) {
                            // Eagle-equivalent ace (par-3 hole-in-one):
                            // Only the ace bonus (+15) applies — eagle bonus does NOT stack.
                            aces++;
                            currentStreak++;
                            if (currentStreak === 3) { streaksHit++; currentStreak = 0; }
                        } else {
                            // Normal hole classification
                            if (diff <= -1) {
                                currentStreak++;
                                if (currentStreak === 3) {
                                    streaksHit++;
                                    currentStreak = 0; // Reset so 6 consecutive = 2 streaks
                                }
                            } else {
                                currentStreak = 0; // Par or worse breaks streak
                            }

                            if (diff >= 1) holesOverPar++;

                            if (diff <= -3) albatrosses++;       // -3 or better (not an ace)
                            else if (diff === -2) eagles++;      // exactly -2 (not an ace)
                            else if (diff === -1) birdies++;
                            else if (diff === 0) pars++;
                            else if (diff === 1) bogeys++;
                            else if (diff === 2) doubleBogeys++;
                            else if (diff > 2) tripleBogeys++;
                        }
                    });

                    // Bonus: +5 points for a fully clean 18-hole round
                    const bogeyFreeBonus = (validHoleCount >= 18 && holesOverPar === 0) ? 5 : 0;
                    const streakBonus = streaksHit * 3;
                    const aceBonus = aces * 15;

                    const fantasyPoints = (albatrosses * 24) + (eagles * 8) + (birdies * 3) + (bogeys * -2) + (doubleBogeys * -4) + (tripleBogeys * -5) + streakBonus + bogeyFreeBonus + aceBonus;

                    const playerStatsRecord = statsByPdgaNum.get(player.PDGANum);

                    let fairwayPct = 0, c1InRegPct = 0, c2InRegPct = 0, scramblePct = 0, c1xPct = 0, c2Pct = 0;
                    if (playerStatsRecord?.stats) {
                        playerStatsRecord.stats.forEach((s: any) => {
                            if (s.statId === 1) fairwayPct = s.statValue;
                            if (s.statId === 2) c1InRegPct = s.statValue;
                            if (s.statId === 3) c2InRegPct = s.statValue;
                            if (s.statId === 5) scramblePct = s.statValue;
                            if (s.statId === 7) c1xPct = s.statValue;
                            if (s.statId === 8) c2Pct = s.statValue;
                        });
                    }

                    // Use PDGA's RoundScore when available; fall back to summing hole scores.
                    // PDGA sometimes clears RoundScore during finalization while keeping Scores data.
                    const holeScoreSum = playerScores.filter((s: number) => !isNaN(s) && s > 0).reduce((a: number, b: number) => a + b, 0);
                    const computedStrokes = (player.RoundScore ?? 0) > 0 ? player.RoundScore : holeScoreSum;

                    // Final guard: if both strokes and fantasy_points are 0,
                    // this row has no usable data — skip it to avoid overwriting good stored scores.
                    if (computedStrokes === 0 && fantasyPoints === 0) return null;

                    return {
                        tournament_id: APP_TOURN_ID,  // use app ID (not PDGA ID) for DB consistency
                        pdga_number: player.PDGANum,
                        division,
                        round_number: APP_ROUND,
                        strokes: computedStrokes,
                        to_par: player.RoundtoPar,
                        placement: player.RunningPlace,
                        albatrosses, eagles, birdies, pars, bogeys, aces,
                        double_bogeys: doubleBogeys,
                        triple_bogeys: tripleBogeys,
                        fantasy_points: fantasyPoints,
                        fairway_pct: fairwayPct,
                        c1_in_reg_pct: c1InRegPct,
                        c2_in_reg_pct: c2InRegPct,
                        scramble_pct: scramblePct,
                        c1x_pct: c1xPct,
                        c2_pct: c2Pct,
                        updated_at: new Date().toISOString()
                    };
                }).filter(Boolean) as any[]; // remove null entries (computed-zero rows)

                // ── Protect existing good data ──────────────────────────────────────────
                // PDGA CDN can serve stale RS=0 data on some edge servers even after official
                // finalization. We fetch existing rows with strokes>0 and block any update
                // that would overwrite a good value with zero — regardless of what PDGA served.
                const { data: existingNzRows } = await supabase
                    .from('player_stats')
                    .select('pdga_number,strokes')
                    .eq('tournament_id', APP_TOURN_ID)
                    .eq('round_number', APP_ROUND)
                    .gt('strokes', 0);
                const existingGood = new Map((existingNzRows ?? []).map(r => [r.pdga_number as number, r.strokes as number]));

                const protectedData = upsertData.filter((row: any) => {
                    const existing = existingGood.get(row.pdga_number);
                    if (existing && existing > 0 && (row.strokes ?? 0) === 0) {
                        return false; // never write 0 over a confirmed non-zero value
                    }
                    return true;
                });
                if (protectedData.length === 0) {
                    results.push({ division, status: 'no_valid_scores', message: 'All data blocked by existing-value protection or zero-guard' });
                    continue;
                }

                const { error } = await supabase
                    .from('player_stats')
                    .upsert(protectedData, { onConflict: 'tournament_id,pdga_number,round_number' });

                if (error) {
                    console.error(`Supabase upsert error for ${division}:`, error);
                    results.push({ division, status: 'error', message: error.message });
                } else {
                    results.push({ division, status: 'success', tournament: tournamentName, round: APP_ROUND, pdgaRound: ROUND, upserted: upsertData.length });
                }
            } // end for-each division
        } // end for ROUND 1-4

        // ── Playoff / sudden-death reconciliation ──────────────────────────────────
        // When regulation ends in a tie for a podium spot, PDGA stages a playoff and
        // records it as a SEPARATE round (e.g. round 13) — and it does NOT promptly
        // update RunningPlace in the final regulation round. The tied players finished
        // regulation level, so the round endpoint keeps them all at the same shared
        // placement for hours/days until results go official. Our round schedule never
        // pulls that playoff round, so the tied leaders stay frozen at the shared
        // placement in player_stats. The score cron then sees 2+ players at placement=1,
        // treats it as an unresolved sudden death, and never releases placement bonuses.
        // (This is exactly what happened at the 2026 OTB Open: Gannon vs Calvin tied,
        //  went to a playoff, and the field's placement bonuses never fired.)
        //
        // Fix: when a playoff round exists (HighestCompletedRound > FinalRound), read it
        // and break the tie. Players are ordered by their playoff finish and reassigned
        // sequential placements starting from the placement they shared in regulation
        // (e.g. two tied for 1st → winner stays 1, loser becomes 2). Only players who
        // actually appear in the playoff round are touched, so legitimate shared ties
        // (e.g. a real tie for 3rd that wasn't played off) are left untouched.
        const finalAppRound = tournamentRounds;
        if (finalRoundId > 0 && highestCompletedRound > finalRoundId) {
            for (const division of ['MPO', 'FPO']) {
                // Aggregate every playoff round above the final regulation round.
                const playoffOrder = new Map<number, number>(); // pdgaNum → playoff finishing place
                for (let pr = finalRoundId + 1; pr <= highestCompletedRound; pr++) {
                    const purl = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${PDGA_ID}&Division=${division}&Round=${pr}&_cb=${Date.now()}`;
                    try {
                        const pres = await fetch(purl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }, cache: 'no-store' });
                        if (!pres.ok) continue;
                        const pscores: PdgaScore[] = (await pres.json())?.data?.scores ?? [];
                        for (const s of pscores) {
                            if (s.PDGANum > 0 && (s.RunningPlace ?? 0) > 0) playoffOrder.set(s.PDGANum, s.RunningPlace);
                        }
                    } catch { /* skip unreachable playoff round */ }
                }
                if (playoffOrder.size === 0) continue;

                // Load the stored final-round placements for the playoff participants.
                const { data: finalRows } = await supabase
                    .from('player_stats')
                    .select('pdga_number,placement')
                    .eq('tournament_id', APP_TOURN_ID)
                    .eq('round_number', finalAppRound)
                    .eq('division', division)
                    .in('pdga_number', [...playoffOrder.keys()]);
                if (!finalRows || finalRows.length === 0) continue;

                // Base = the best (lowest) placement the tied group shared in regulation.
                // Reassign sequentially in playoff-finish order: winner keeps base, the
                // next gets base+1, etc. Idempotent — re-running yields the same result.
                const base = Math.min(...finalRows.map(r => (r.placement as number) ?? 999));
                const ordered = finalRows
                    .filter(r => playoffOrder.has(r.pdga_number as number))
                    .sort((a, b) => playoffOrder.get(a.pdga_number as number)! - playoffOrder.get(b.pdga_number as number)!);

                const resolved: Array<{ pdga_number: number; placement: number }> = [];
                for (let i = 0; i < ordered.length; i++) {
                    const pdgaNumber = ordered[i].pdga_number as number;
                    const placement = base + i;
                    resolved.push({ pdga_number: pdgaNumber, placement });
                    if (ordered[i].placement === placement) continue; // already correct — skip write
                    await supabase
                        .from('player_stats')
                        .update({ placement, updated_at: new Date().toISOString() })
                        .eq('tournament_id', APP_TOURN_ID)
                        .eq('round_number', finalAppRound)
                        .eq('division', division)
                        .eq('pdga_number', pdgaNumber);
                }
                console.log(`Playoff reconciled [${division}]: base=${base}`, resolved);
                results.push({ division, status: 'playoff_resolved', round: finalAppRound, resolved });
            }
        }

        return NextResponse.json({ success: true, tournament: tournamentName, tournamentId: APP_TOURN_ID, pdgaId: PDGA_ID, roundsTried: roundSchedule.length, results });


    } catch (e: any) {
        console.error('Ingest error:', e);
        try {
            const { sendErrorWebhook } = await import('@/lib/webhook');
            await sendErrorWebhook(`Ingest Cron Failed: ${e.message}`);
        } catch (webhookErr) {
            console.error('Failed to send webhook:', webhookErr);
        }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
