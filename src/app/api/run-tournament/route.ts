import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SCORING_RULES } from '@/lib/scoring';
import { Player } from '@/data/mock-schema';
import { auth } from '@clerk/nextjs/server';
import { SEASON_2026 } from '@/data/tournaments';

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const roster: Player[] = body.roster;
        const tournamentId = body.tournamentId;

        if (!roster || !Array.isArray(roster)) {
            return NextResponse.json({ error: 'Invalid roster' }, { status: 400 });
        }

        const tournament = SEASON_2026.find(t => t.id === tournamentId);
        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
        }

        const TOURN_PDGA_ID = tournament.pdga_id;

        // In staging, override with a known 2025 tournament so we get real historical scores
        const FETCH_PDGA_ID = (process.env.STAGING_TOURN_ID || TOURN_PDGA_ID).trim();

        // Fetch all real player stats across all rounds
        const { data: realStats, error } = await supabaseAdmin
            .from('player_stats')
            .select('*')
            .eq('tournament_id', FETCH_PDGA_ID);

        if (error) {
            console.error("Error fetching stats:", error);
            return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
        }

        const rule = SCORING_RULES.CUSTOM_USER;

        // Group stats by pdga_number — same matching logic for both prod and staging.
        // On staging, FETCH_PDGA_ID points to the 2025 SFO so players who competed
        // there get their real historical scores (PDGA numbers are permanent).
        const statsByPdgaNum = new Map<number, any[]>();
        if (realStats) {
            realStats.forEach(stat => {
                if (!statsByPdgaNum.has(stat.pdga_number)) {
                    statsByPdgaNum.set(stat.pdga_number, []);
                }
                statsByPdgaNum.get(stat.pdga_number)!.push(stat);
            });
        }

        let totalPoints = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const breakdownData: Record<string, any> = {};

        for (const player of roster) {
            let rounds: any[] | null = null;
            if (player.pdgaNumber && statsByPdgaNum.has(player.pdgaNumber)) {
                rounds = statsByPdgaNum.get(player.pdgaNumber)!;
            }

            if (rounds && rounds.length > 0) {
                // We have real data! (Array of rounds)

                let pts = 0;
                let strokes = 0;
                let toPar = 0;
                let eagles = 0;
                let birdies = 0;
                let pars = 0;
                let bogeys = 0;
                let doubles = 0;

                let c1xSum = 0, c2Sum = 0, fairwaySum = 0, c1RegSum = 0, c2RegSum = 0, scrambleSum = 0;
                let validRounds = 0;

                const roundsData: any[] = [];

                rounds.sort((a, b) => a.round_number - b.round_number);

                for (const r of rounds) {
                    let rPts = 0;
                    rPts += (r.eagles || 0) * rule.eagle;
                    rPts += (r.birdies || 0) * rule.birdie;
                    rPts += (r.pars || 0) * rule.par;
                    rPts += (r.bogeys || 0) * rule.bogey;
                    rPts += (r.double_bogeys || 0) * rule.double;

                    // Only award bogey-free bonus if the player actually played (strokes > 0)
                    const bogeyFree = r.strokes > 0 && (r.bogeys + r.double_bogeys) === 0;
                    if (bogeyFree) rPts += rule.bogeyFree;

                    pts += rPts;
                    strokes += r.strokes;
                    toPar += r.to_par;

                    eagles += r.eagles;
                    birdies += r.birdies;
                    pars += r.pars;
                    bogeys += r.bogeys;
                    doubles += r.double_bogeys;

                    const hasStats = r.fairway_pct > 0 || r.c1_in_reg_pct > 0 || r.c2_in_reg_pct > 0 || r.c1x_pct > 0;

                    if (hasStats) {
                        c1xSum += r.c1x_pct;
                        c2Sum += r.c2_pct;
                        fairwaySum += r.fairway_pct;
                        c1RegSum += r.c1_in_reg_pct;
                        c2RegSum += r.c2_in_reg_pct;
                        scrambleSum += r.scramble_pct;
                        validRounds++;
                    }

                    roundsData.push({
                        roundNumber: r.round_number,
                        strokes: r.strokes,
                        toPar: r.to_par,
                        totalPoints: rPts,
                        breakdown: { eagles: r.eagles, birdies: r.birdies, pars: r.pars, bogeys: r.bogeys, doubles: r.double_bogeys, triples: 0, aces: 0 },
                        advanced: hasStats ? {
                            c1xPutting: r.c1x_pct || 0,
                            c2Putting: r.c2_pct || 0,
                            fairwayHits: r.fairway_pct || 0,
                            c1InReg: r.c1_in_reg_pct || 0,
                            c2InReg: r.c2_in_reg_pct || 0,
                            scramble: r.scramble_pct || 0
                        } : null
                    });
                }

                const placement = rounds[rounds.length - 1]?.placement || 1;

                const totals = {
                    strokes: strokes,
                    toPar: toPar,
                    totalPoints: pts,
                    tournamentRank: placement,
                    placementPoints: 0,
                    breakdown: { eagles, birdies, pars, bogeys, doubles, triples: 0, aces: 0 },
                    advanced: validRounds === rounds.length && rounds.length > 0 ? {
                        c1xPutting: Number((c1xSum / validRounds).toFixed(2)),
                        c2Putting: Number((c2Sum / validRounds).toFixed(2)),
                        fairwayHits: Number((fairwaySum / validRounds).toFixed(2)),
                        c1InReg: Number((c1RegSum / validRounds).toFixed(2)),
                        c2InReg: Number((c2RegSum / validRounds).toFixed(2)),
                        scramble: Number((scrambleSum / validRounds).toFixed(2))
                    } : null,
                    bonuses: { bogeyFree: false, streak3: false, ace: false }
                };

                totalPoints += pts;
                breakdownData[player.id] = { totals, rounds: roundsData.sort((a, b) => a.roundNumber - b.roundNumber) };
            } else {
                // No real data — return zero stats (player didn't compete or data not yet ingested)
                const zeroStats = {
                    strokes: 0, toPar: 0, totalPoints: 0, tournamentRank: null,
                    placementPoints: 0,
                    breakdown: { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, triples: 0, aces: 0 },
                    bonuses: { bogeyFree: false, streak3: false, ace: false },
                    advanced: null,
                };
                breakdownData[player.id] = { totals: zeroStats, rounds: [] };
            }
        }

        return NextResponse.json({
            success: true,
            totalPoints,
            tournamentRank: 1, // We don't have a way to rank users automatically yet
            breakdownData
        });

    } catch (error) {
        console.error('Run Tournament Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
