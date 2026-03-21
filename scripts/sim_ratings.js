require('dotenv').config({ path: '.env.local' });
// Step 1: Pull all round ratings from the SFO from PDGA Live API
async function fetchRoundRatings(tournId, division, round) {
    const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${tournId}&Division=${division}&Round=${round}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const raw = await res.json();
    return (raw?.data?.scores || [])
        .filter(p => p.PDGANum && p.RoundRating && p.RoundRating > 900)
        .map(p => ({
            pdgaNum: p.PDGANum,
            name: `${p.FirstName} ${p.LastName}`,
            round,
            division,
            roundRating: p.RoundRating,
            currentOfficialRating: p.Rating, // PDGA's current official rating
        }));
}

async function run() {
    const TOURN_ID = '96401'; // Supreme Flight Open
    const allPlayers = {};

    for (const div of ['MPO', 'FPO']) {
        for (let r = 1; r <= 4; r++) {
            const rows = await fetchRoundRatings(TOURN_ID, div, r);
            if (rows.length === 0) continue;
            for (const row of rows) {
                const key = row.pdgaNum;
                if (!allPlayers[key]) {
                    allPlayers[key] = {
                        pdgaNum: row.pdgaNum,
                        name: row.name,
                        division: row.division,
                        officialRating: row.currentOfficialRating, // rating at time of tournament
                        roundRatings: []
                    };
                }
                allPlayers[key].roundRatings.push(row.roundRating);
            }
        }
    }

    // Simple weighted average: equal weight per round for now
    // PDGA uses: each round counted equally, last 12 months rolling
    // For a single tournament: avg of all rounds played
    const results = Object.values(allPlayers).map(p => {
        const avg = p.roundRatings.reduce((a, b) => a + b, 0) / p.roundRatings.length;
        return {
            name: p.name,
            division: p.division,
            pdgaNum: p.pdgaNum,
            officialRatingAtEvent: p.officialRating,
            roundRatings: p.roundRatings,
            avgRoundRating: Math.round(avg),
            delta: Math.round(avg) - p.officialRating,
        };
    });

    // Sort by division then name
    results.sort((a, b) => a.division.localeCompare(b.division) || b.officialRatingAtEvent - a.officialRatingAtEvent);

    console.log('\n=== SUPREME FLIGHT OPEN — Rating Simulation ===');
    console.log('Format: Name | Official@Event | RoundRatings | AvgRoundRating | Delta\n');
    for (const r of results) {
        console.log(`[${r.division}] ${r.name.padEnd(25)} | Off: ${r.officialRatingAtEvent} | Rnds: [${r.roundRatings.join(', ')}] | Avg: ${r.avgRoundRating} | Δ: ${r.delta > 0 ? '+' : ''}${r.delta}`);
    }

    // Summary
    const mpo = results.filter(r => r.division === 'MPO');
    const fpo = results.filter(r => r.division === 'FPO');
    console.log(`\nMPO players: ${mpo.length}, FPO players: ${fpo.length}`);
}
run().catch(console.error);
