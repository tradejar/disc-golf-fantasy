// Try PDGA's official player stats endpoint
async function fetchRating(pdgaNum, name) {
    // Try 1: stats endpoint
    try {
        const url = `https://www.pdga.com/api/v1/players/${pdgaNum}`;
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
        if (r.ok) {
            const data = await r.json();
            const rating = data?.rating || data?.data?.rating || data?.[0]?.rating;
            if (rating) return { source: 'api', rating };
        }
    } catch {}
    
    // Try 2: search API
    try {
        const url = `https://www.pdga.com/api/v1/players?pdga_number=${pdgaNum}&fields=pdga_number,rating`;
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
        if (r.ok) {
            const data = await r.json();
            const player = data?.data?.[0] || data?.[0];
            if (player?.rating) return { source: 'search', rating: player.rating };
        }
    } catch {}
    
    // Try 3: live results from Big Easy (they carry the Rating field)
    return { source: 'none', rating: null };
}

// Better: use Big Easy Open data which has current ratings for all DGPT players
async function fetchRatingsFromBigEasy() {
    const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=96402&Division=MPO&Round=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = (await r.json())?.data?.scores || [];
    return new Map(data.map(p => [p.PDGANum, p.Rating]));
}

async function fetchBigEasyFPO() {
    const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=96402&Division=FPO&Round=1`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = (await r.json())?.data?.scores || [];
    return new Map(data.map(p => [p.PDGANum, p.Rating]));
}

async function run() {
    // Get current (post-SFO) ratings from Big Easy roster data — these are the ratings PDGA
    // published after SFO and before Big Easy. This is our "ground truth".
    const mpoRatings = await fetchRatingsFromBigEasy();
    const fpoRatings = await fetchBigEasyFPO();
    const currentRatings = new Map([...mpoRatings, ...fpoRatings]);
    console.log(`Got current ratings for ${currentRatings.size} players from Big Easy data`);
    
    // Now fetch SFO round ratings (same as before)
    async function fetchSFORound(div, round) {
        const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=96401&Division=${div}&Round=${round}`;
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r.ok) return [];
        const scores = (await r.json())?.data?.scores || [];
        return scores.filter(p => p.PDGANum && p.RoundRating > 900)
            .map(p => ({ pdgaNum: p.PDGANum, name: `${p.FirstName} ${p.LastName}`, roundRating: p.RoundRating, ratingAtSFO: p.Rating }));
    }

    const players = {};
    for (const div of ['MPO', 'FPO']) {
        for (let r = 1; r <= 4; r++) {
            const rows = await fetchSFORound(div, r);
            if (!rows.length) continue;
            for (const row of rows) {
                if (!players[row.pdgaNum]) {
                    players[row.pdgaNum] = { ...row, rounds: [] };
                }
                players[row.pdgaNum].rounds.push(row.roundRating);
            }
        }
    }

    // Compare: players who appear in both SFO and Big Easy (so we can see rating change)
    const compared = [];
    for (const [pdgaNum, p] of Object.entries(players)) {
        const currentRating = currentRatings.get(Number(pdgaNum));
        if (!currentRating) continue;
        const avg = Math.round(p.rounds.reduce((a, b) => a + b, 0) / p.rounds.length);
        compared.push({
            name: p.name,
            pdgaNum,
            ratingAtSFO: p.ratingAtSFO,
            sfoRounds: p.rounds,
            sfoAvg: avg,
            currentRating,
            // How much did rating actually change after SFO?
            actualChange: currentRating - p.ratingAtSFO,
            // What would a naive "replace with avg" give?
            naiveDelta: avg - p.ratingAtSFO,
        });
    }

    compared.sort((a, b) => b.ratingAtSFO - a.ratingAtSFO);

    console.log('\n=== SFO SIMULATION vs POST-SFO OFFICIAL RATING (from Big Easy data) ===');
    console.log('Name                     | @SFO | SFO Rounds              | SFOAvg | PostSFO | ActualΔ | NaiveΔ | Diff');
    console.log('─'.repeat(130));
    for (const p of compared.slice(0, 30)) { // top 30 by pre-SFO rating
        console.log(
            `${p.name.padEnd(24)} | ${p.ratingAtSFO} | [${p.sfoRounds.join(', ')}]`.padEnd(75) +
            `| ${p.sfoAvg} | ${p.currentRating} | ${p.actualChange > 0 ? '+' : ''}${p.actualChange} | ${p.naiveDelta > 0 ? '+' : ''}${p.naiveDelta} | acc: ${Math.abs(p.sfoAvg - p.currentRating)}`
        );
    }

    // Accuracy stats
    const errors = compared.map(p => Math.abs(p.sfoAvg - p.currentRating));
    const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
    const within2 = errors.filter(e => e <= 2).length;
    const within5 = errors.filter(e => e <= 5).length;
    const within10 = errors.filter(e => e <= 10).length;
    console.log(`\n📊 Compared ${compared.length} players who played both SFO and Big Easy`);
    console.log(`Mean Absolute Error (SFOAvg vs Post-SFO official): ${mae.toFixed(1)} rating points`);
    console.log(`Within ±2 pts: ${within2}/${compared.length} (${(100*within2/compared.length).toFixed(0)}%)`);
    console.log(`Within ±5 pts: ${within5}/${compared.length} (${(100*within5/compared.length).toFixed(0)}%)`);
    console.log(`Within ±10 pts: ${within10}/${compared.length} (${(100*within10/compared.length).toFixed(0)}%)`);
}
run().catch(console.error);
