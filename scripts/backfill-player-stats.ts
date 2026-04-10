/**
 * One-time backfill: fetches PDGA live scores for a historical tournament
 * and inserts them into the player_stats table.
 * Run with: npx ts-node --project tsconfig.node.json scripts/backfill-player-stats.ts <TOURN_ID> <PDGA_ID>
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const TOURN_ID = process.argv[2] ?? '96401';
const PDGA_ID = process.argv[3] ?? '96401';
const MAX_ROUNDS = 5;

interface PdgaHole { HoleOrdinal: number; Par: number; }
interface PdgaScore {
    PDGANum: number;
    FirstName: string;
    LastName: string;
    RoundScore: number;
    RoundtoPar: number;
    Scores: string;
    RunningPlace: number;
    ScoreID?: number;
}

async function main() {
    console.log(`Backfilling player_stats for tournament ${TOURN_ID} (PDGA ${PDGA_ID})...`);

    for (let ROUND = 1; ROUND <= MAX_ROUNDS; ROUND++) {
        for (const division of ['MPO', 'FPO']) {
            const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${PDGA_ID}&Division=${division}&Round=${ROUND}`;
            console.log(`  Fetching ${division} Round ${ROUND}...`);

            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (!res.ok) {
                console.log(`  → HTTP ${res.status} — skipping`);
                continue;
            }

            const raw = await res.json() as any;
            const data = raw.data;
            if (!data?.scores?.length) {
                console.log(`  → No scores — skipping`);
                continue;
            }

            const liveRoundId = data.live_round_id;
            let advancedStatsData: any[] = [];
            if (liveRoundId) {
                const statsRes = await fetch(`https://www.pdga.com/api/v1/feat/stats/round-stats/${liveRoundId}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                if (statsRes.ok) advancedStatsData = await statsRes.json() as any[];
            }

            const holes: PdgaHole[] = data.holes || [];
            const scores: PdgaScore[] = data.scores;
            const validScores = scores.filter(p => p.PDGANum && p.PDGANum > 0 && p.RoundScore > 0);
            console.log(`  → ${validScores.length} valid players`);

            const scoreIdToPdga = new Map<number, number>();
            scores.forEach((s: any) => { if (s.ScoreID && s.PDGANum) scoreIdToPdga.set(s.ScoreID, s.PDGANum); });

            const statsByPdgaNum = new Map<number, any>();
            advancedStatsData.forEach((a: any) => {
                const pdgaNum = scoreIdToPdga.get(a.score?.scoreId);
                if (pdgaNum) statsByPdgaNum.set(pdgaNum, a);
            });

            const upsertData = validScores.map(player => {
                const playerScores = (player.Scores || '').split(',').map((s: string) => parseInt(s));
                let eagles = 0, birdies = 0, pars_ = 0, bogeys = 0, doubleBogeys = 0, tripleBogeys = 0;

                playerScores.forEach((score: number, index: number) => {
                    if (isNaN(score)) return;
                    const holePar = holes[index]?.Par;
                    if (!holePar) return;
                    const diff = score - holePar;
                    if (diff <= -2) eagles++;
                    else if (diff === -1) birdies++;
                    else if (diff === 0) pars_++;
                    else if (diff === 1) bogeys++;
                    else if (diff === 2) doubleBogeys++;
                    else if (diff > 2) tripleBogeys++;
                });

                const fantasyPoints = (eagles * 8) + (birdies * 3) + (bogeys * -2) + (doubleBogeys * -4) + (tripleBogeys * -5);

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

                return {
                    tournament_id: TOURN_ID,
                    pdga_number: player.PDGANum,
                    division,
                    round_number: ROUND,
                    strokes: player.RoundScore,
                    to_par: player.RoundtoPar,
                    placement: player.RunningPlace,
                    albatrosses: 0, eagles, birdies, pars: pars_, bogeys, aces: 0,
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
                console.error(`  → Upsert error: ${error.message}`);
            } else {
                console.log(`  → Upserted ${upsertData.length} rows`);
            }
        }
    }

    console.log('Done!');
}

main().catch(console.error);
