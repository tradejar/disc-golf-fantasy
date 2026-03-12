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
    Scores: string;
    RunningPlace: number;
}

/** Returns the tournament actively running today, or null if none. */
function getActiveTournament() {
    const now = new Date();
    return SEASON_2026.find(t => {
        const start = new Date(t.startDate);
        // Include 1 day after end for final-round ingestion
        const end = new Date(t.endDate);
        end.setDate(end.getDate() + 1);
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
        // On staging, override with a 2024 tournament ID for real historical data
        const stagingTournId = process.env.STAGING_TOURN_ID;

        let TOURN_ID: string;
        let tournamentName: string;

        if (stagingTournId) {
            TOURN_ID = stagingTournId;
            tournamentName = `Staging (2024 PDGA #${stagingTournId})`;
        } else {
            const tournament = getActiveTournament();
            if (!tournament) {
                console.log('No active tournament today — skipping PDGA fetch.');
                return NextResponse.json({ success: true, message: 'No active tournament today. Skipping.' });
            }
            TOURN_ID = tournament.pdga_id;
            tournamentName = tournament.name;
        }

        // Try all rounds 1–4. Rounds not yet started return 404 and are skipped.
        // Rounds in progress are re-upserted each run so live scores stay current.
        const MAX_ROUNDS = 4;
        const results = [];

        for (let ROUND = 1; ROUND <= MAX_ROUNDS; ROUND++) {
            console.log(`Ingesting: ${tournamentName} (${TOURN_ID}), Round ${ROUND}`);

            for (const division of ['MPO', 'FPO']) {
                const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${TOURN_ID}&Division=${division}&Round=${ROUND}`;

                const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
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
                    const statsUrl = `https://www.pdga.com/api/v1/feat/stats/round-stats/${liveRoundId}`;
                    const statsRes = await fetch(statsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                    if (statsRes.ok) {
                        advancedStatsData = (await statsRes.json()) as any[];
                    }
                }

                const holes: PdgaHole[] = data.holes || [];
                const scores: PdgaScore[] = data.scores;

                // Filter out players with no PDGA number (happens pre-tournament or for DNF/DNS)
                const validScores = scores.filter(p => p.PDGANum && p.PDGANum > 0);

                if (validScores.length === 0) {
                    results.push({ division, status: 'no_valid_scores', message: 'All player PDGA numbers were null — round not started yet' });
                    continue;
                }

                const upsertData = validScores.map(player => {
                    const playerScores = (player.Scores || '').split(',').map((s: string) => parseInt(s));
                    let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubleBogeys = 0, tripleBogeys = 0, aces = 0;
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

                        if (score === 1 && holePar > 1) {
                            aces++;
                        }

                        // Streak logic (Birdie or Eagle)
                        if (diff <= -1) {
                            currentStreak++;
                            if (currentStreak === 3) {
                                streaksHit++;
                                currentStreak = 0; // Reset so 6 consecutive = 2 streaks
                            }
                        } else {
                            currentStreak = 0; // Par or worse breaks streak
                        }

                        if (diff >= 1) {
                            holesOverPar++;
                        }

                        if (diff <= -2) eagles++;
                        else if (diff === -1) birdies++;
                        else if (diff === 0) pars++;
                        else if (diff === 1) bogeys++;
                        else if (diff === 2) doubleBogeys++;
                        else if (diff > 2) tripleBogeys++;
                    });

                    // Bonus: +5 points for a fully clean 18-hole round
                    const bogeyFreeBonus = (validHoleCount >= 18 && holesOverPar === 0) ? 5 : 0;
                    const streakBonus = streaksHit * 3;
                    const aceBonus = aces * 15;

                    const fantasyPoints = (eagles * 8) + (birdies * 3) + (bogeys * -2) + (doubleBogeys * -4) + (tripleBogeys * -5) + streakBonus + bogeyFreeBonus + aceBonus;

                    const playerStatsRecord = advancedStatsData.find((a: any) =>
                        a.score?.liveResult?.pdgaNum === player.PDGANum
                    );

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

                    return {
                        tournament_id: TOURN_ID,
                        pdga_number: player.PDGANum,
                        division,
                        round_number: ROUND,
                        strokes: player.RoundScore,
                        to_par: player.RoundtoPar,
                        placement: player.RunningPlace,
                        eagles, birdies, pars, bogeys,
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
                });

                const { error } = await supabase
                    .from('player_stats')
                    .upsert(upsertData, { onConflict: 'tournament_id,pdga_number,round_number' });

                if (error) {
                    console.error(`Supabase upsert error for ${division}:`, error);
                    results.push({ division, status: 'error', message: error.message });
                } else {
                    results.push({ division, status: 'success', tournament: tournamentName, round: ROUND, upserted: upsertData.length });
                }
            } // end for-each division
        } // end for ROUND 1-4

        // ─── Rollup: player_stats → entries.total_points ───────────────────────
        // After all rounds are tried, recompute every entry's total fantasy points
        // by summing player_stats across all rounds for all players in the roster.

        try {
            console.log(`Starting DB RPC rollup for tournament ${TOURN_ID}...`);
            const { error: rpcError } = await supabase.rpc('rollup_tournament_scores', {
                p_tournament_id: TOURN_ID
            });

            if (rpcError) {
                console.error(`Rollup RPC failed:`, rpcError.message);
                results.push({ division: 'ROLLUP', status: 'error', message: rpcError.message } as any);
            } else {
                console.log(`Rollup RPC complete.`);
                results.push({ division: 'ROLLUP', status: 'success' } as any);
            }
        } catch (rollupErr: any) {
            console.error('Rollup error (non-fatal):', rollupErr.message);
            results.push({ division: 'ROLLUP', status: 'error', message: rollupErr.message } as any);
        }
        // ────────────────────────────────────────────────────────────────────────

        return NextResponse.json({ success: true, tournament: tournamentName, tournamentId: TOURN_ID, roundsTried: MAX_ROUNDS, results });


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
