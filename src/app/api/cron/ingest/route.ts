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

    // Deployment guard: only the authorized deployment ID may run this cron.
    // This prevents old deployment cron registrations from writing stale data.
    // Set AUTHORIZED_DEPLOYMENT_ID in Vercel project env vars to the current deployment's VERCEL_DEPLOYMENT_ID.
    const authorizedId = process.env.AUTHORIZED_DEPLOYMENT_ID;
    const currentId = process.env.VERCEL_DEPLOYMENT_ID;
    if (authorizedId && currentId && currentId !== authorizedId) {
        console.log(`Ingest skipped: deployment ${currentId} not authorized (authorized: ${authorizedId})`);
        return NextResponse.json({ skipped: true, reason: 'not-authorized-deployment', currentId, authorizedId });
    }

    try {
        // On staging, override with a 2024 tournament ID for real historical data
        const stagingTournId = process.env.STAGING_TOURN_ID;

        let PDGA_ID: string;   // used for PDGA live API URL
        let APP_TOURN_ID: string;  // used for DB storage — must match tournament.id used everywhere else
        let tournamentName: string;

        if (stagingTournId) {
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
        }

        // Fetch event meta to discover actual PDGA round IDs.
        // Some events (e.g. Champions Cup) use non-sequential internal IDs:
        // sequential rounds are 1..N but the finals/championship round may be 12, 20, etc.
        // We build a list of (pdgaRoundId → appRoundNumber) pairs and iterate those.
        const results = [];
        let roundSchedule: Array<{ pdgaRound: number; appRound: number }> = [];
        try {
            const eventCb = Date.now();
            const eventRes = await fetch(
                `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_event?TournID=${PDGA_ID}&_cb=${eventCb}`,
                { headers: { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' }, cache: 'no-store' }
            );
            if (eventRes.ok) {
                const eventData = await eventRes.json();
                const finalRound: number = eventData.data?.FinalRound ?? 0;
                const MAX_SEQUENTIAL = 5; // Pro Worlds has 5 sequential rounds
                let appRound = 1;
                for (let r = 1; r <= MAX_SEQUENTIAL; r++) {
                    if (finalRound > MAX_SEQUENTIAL && r === finalRound) continue; // skip, added below
                    roundSchedule.push({ pdgaRound: r, appRound: appRound++ });
                }
                // If finals round ID is beyond sequential range, append it as the last round
                if (finalRound > MAX_SEQUENTIAL) {
                    roundSchedule.push({ pdgaRound: finalRound, appRound: appRound });
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
