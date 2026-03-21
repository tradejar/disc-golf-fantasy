require('dotenv').config({ path: '.env.local' });

// Fetch current official rating from PDGA player page
async function fetchCurrentRating(pdgaNum) {
    try {
        const url = `https://www.pdga.com/player/${pdgaNum}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        const html = await res.text();
        // PDGA player pages have: <li class="current-rating">Rating: <strong>1041</strong>
        const match = html.match(/Current Official Rating.*?<strong[^>]*>(\d+)<\/strong>/s)
                   || html.match(/class="[^"]*current-rating[^"]*"[^>]*>.*?(\d{3,4})/s)
                   || html.match(/>(\d{3,4})<\/strong>\s*<\/li>/);
        return match ? parseInt(match[1]) : null;
    } catch { return null; }
}

// Stricter: parse the ratings-history table from PDGA
async function fetchRatingFromSearch(pdgaNum) {
    try {
        const url = `https://www.pdga.com/player/${pdgaNum}/details`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        const html = await res.text();
        // Look for Rating badge
        const m = html.match(/Current Official Rating<\/[^>]+>\s*<[^>]+>\s*(\d{3,4})/s)
                || html.match(/(\d{3,4})<\/strong>.*?Current Official/s);
        return m ? parseInt(m[1]) : null;
    } catch { return null; }
}

async function run() {
    // Sample: 10 key MPO players from our roster spanning the rating range
    const sample = [
        { name: 'Calvin Heimburg', pdgaNum: 45671, sfoAvg: 1068, sfoRatings: [1071, 1083, 1046] },
        { name: 'Ricky Wysocki', pdgaNum: 38008, sfoAvg: 1076, sfoRatings: [1071, 1077, 1077] },
        { name: 'Chandler Kramer', pdgaNum: 139228, sfoAvg: 1053, sfoRatings: [1053, 1059, 1046] },
        { name: 'Sullivan Tipton', pdgaNum: 78817, sfoAvg: 1053, sfoRatings: [1022, 1065, 1071] },
        { name: 'Adam Hammes', pdgaNum: 62613, sfoAvg: 1050, sfoRatings: [1077, 1028, 1046] },
        { name: 'Aaron Gossage', pdgaNum: 35449, sfoAvg: 1042, sfoRatings: [1040, 1022, 1065] },
        { name: 'Anthony Barela', pdgaNum: 44382, sfoAvg: 1030, sfoRatings: [1015, 1046, 1028] },
        { name: 'James Conrad', pdgaNum: 29190, sfoAvg: 989, sfoRatings: [978, 1003, 985] },
        { name: 'Paul Ulibarri', pdgaNum: 28574, sfoAvg: 1003, sfoRatings: [978, 1009, 1022] },
        { name: 'Eagle McMahon', pdgaNum: 37817, sfoAvg: 1034, sfoRatings: [1046, 1046, 1009] },
    ];

    console.log('Fetching current official PDGA ratings...\n');
    
    const results = [];
    for (const p of sample) {
        // Try both endpoints
        let current = await fetchCurrentRating(p.pdgaNum);
        if (!current) current = await fetchRatingFromSearch(p.pdgaNum);
        results.push({ ...p, currentOfficial: current });
        process.stdout.write('.');
    }
    
    console.log('\n\n=== SFO SIMULATION vs CURRENT OFFICIAL PDGA RATING ===');
    console.log('Player                   | Pre-SFO | SFO Rnds          | SFO Avg | Current Official | Diff (Cur-PreSFO)');
    console.log('─'.repeat(110));
    
    for (const r of results) {
        const preSfo = r.sfoRatings[0] ? '?' : '?'; // we only have the official rating at event time
        const diff = r.currentOfficial ? r.currentOfficial - r.sfoAvg : '?';
        const diffStr = typeof diff === 'number' ? (diff > 0 ? `+${diff}` : `${diff}`) : diff;
        console.log(
            `${r.name.padEnd(24)} | SFOAvg: ${r.sfoAvg} | Rnds: [${r.sfoRatings.join(', ')}] | Current: ${r.currentOfficial ?? 'N/A'} | Δ from avg: ${diffStr}`
        );
    }
}
run().catch(console.error);
