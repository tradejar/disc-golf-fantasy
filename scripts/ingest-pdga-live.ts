import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

interface PdgaHole {
    HoleOrdinal: number;
    Par: number;
}

interface PdgaScore {
    PDGANum: number;
    FirstName: string;
    LastName: string;
    RoundScore: number;
    RoundtoPar: number;
    Scores: string; // "3,4,3,3,4,4,3..."
    RunningPlace: number;
}

async function run() {
    const TOURN_ID = process.argv[2] || '77759';
    const ROUND = process.argv[3] || '1';

    for (const division of ['MPO', 'FPO']) {
        console.log(`Starting PDGALive Ingestion for Tournament ${TOURN_ID}, Division ${division}, Round ${ROUND}`);

        const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${TOURN_ID}&Division=${division}&Round=${ROUND}`;

        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = await res.json() as any;
            const data = raw.data;
            if (!data || !data.scores) throw new Error("No data.scores payload found.");

            const liveRoundId = data.live_round_id;

            // Fetch Advanced Stats
            let advancedStatsData: any[] = [];
            if (liveRoundId) {
                const statsUrl = `https://www.pdga.com/api/v1/feat/stats/round-stats/${liveRoundId}`;
                const statsRes = await fetch(statsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (statsRes.ok) {
                    advancedStatsData = (await statsRes.json()) as any[];
                    console.log(`Fetched advanced stats payload for ${advancedStatsData.length} players in ${division}.`);
                }
            }

            const holes: PdgaHole[] = data.holes || [];
            const scores: PdgaScore[] = data.scores;

            console.log(`Found data for ${scores.length} ${division} players and ${holes.length} holes.`);

            const upsertData = scores.map(player => {
                // Calculate birdies, eagles, etc.
                const playerScores = player.Scores.split(',').map(s => parseInt(s));
                let eagles = 0;
                let birdies = 0;
                let pars = 0;
                let bogeys = 0;
                let doubleBogeys = 0;

                playerScores.forEach((score, index) => {
                    if (isNaN(score)) return;
                    const holePar = holes[index]?.Par;
                    if (!holePar) return;

                    const diff = score - holePar;
                    if (diff === -2) eagles++;
                    else if (diff === -1) birdies++;
                    else if (diff === 0) pars++;
                    else if (diff === 1) bogeys++;
                    else if (diff >= 2) doubleBogeys++; // Note: Fantasy scoring usually groups db+
                });

                // Calculate fantasy points based on standard scoring
                // Eagles: 6, Birdies: 3, Pars: 1, Bogeys: -1, DB+: -2
                const fantasyPoints = (eagles * 6) + (birdies * 3) + (pars * 1) + (bogeys * -1) + (doubleBogeys * -2);

                // Find Advanced Stats for this player
                const playerStatsRecord = advancedStatsData.find((a: any) => a.score?.liveResult?.firstName === player.FirstName && a.score?.liveResult?.lastName === player.LastName);

                let fairwayPct = 0, c1InRegPct = 0, c2InRegPct = 0, scramblePct = 0, c1xPct = 0, c2Pct = 0;

                if (playerStatsRecord && playerStatsRecord.stats) {
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
                    round_number: parseInt(ROUND),
                    strokes: player.RoundScore,
                    to_par: player.RoundtoPar,
                    placement: player.RunningPlace,
                    eagles,
                    birdies,
                    pars,
                    bogeys,
                    double_bogeys: doubleBogeys,
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

            // Insert into Supabase player_stats table
            const { error } = await supabase
                .from('player_stats')
                .upsert(upsertData, {
                    onConflict: 'tournament_id,pdga_number,round_number'
                });

            if (error) {
                console.error(`Supabase upsert error for ${division}:`, error);
            } else {
                console.log(`Successfully upserted ${upsertData.length} records for ${division}!`);
            }

        } catch (e) {
            console.error(`Ingestion error for ${division}:`, e);
        }
    }
}
run();
