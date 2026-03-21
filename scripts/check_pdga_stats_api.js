// Check what PDGA's advanced stats API actually returns for this tournament
async function run() {
    // First get the live round data to get the live_round_id
    const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=96402&Division=MPO&Round=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const raw = await res.json();
    const liveRoundId = raw?.data?.live_round_id;
    console.log('live_round_id:', liveRoundId);
    
    if (liveRoundId) {
        const statsUrl = `https://www.pdga.com/api/v1/feat/stats/round-stats/${liveRoundId}`;
        console.log('Fetching:', statsUrl);
        const statsRes = await fetch(statsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        console.log('Stats status:', statsRes.status);
        const stats = await statsRes.json();
        // Show first player's stats
        const firstPlayer = Array.isArray(stats) ? stats[0] : null;
        console.log('First player stats sample:', JSON.stringify(firstPlayer, null, 2));
        console.log('Total players with stats:', Array.isArray(stats) ? stats.length : 'not array');
    }
}
run().catch(console.error);
