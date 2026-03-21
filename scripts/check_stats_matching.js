async function run() {
    // Get the advanced stats + scores together to understand the join key
    const scoreRes = await fetch('https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=96402&Division=MPO&Round=1', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const scoreData = (await scoreRes.json())?.data;
    const liveRoundId = scoreData?.live_round_id;
    
    // Find Gossage in scores to get his resultId
    const gossage = scoreData?.scores?.find(s => s.PDGANum === 35449);
    console.log('Gossage score entry keys:', gossage ? Object.keys(gossage) : 'NOT FOUND');
    console.log('Gossage score entry:', JSON.stringify(gossage, null, 2));
    
    // Get stats
    const statsRes = await fetch(`https://www.pdga.com/api/v1/feat/stats/round-stats/${liveRoundId}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const stats = await statsRes.json();
    
    // Show what the score/liveResult object looks like — find Gossage by name
    const gossageStat = stats.find(s => s.score?.liveResult?.lastName === 'Gossage');
    console.log('\nGossage stat entry score object:', JSON.stringify(gossageStat?.score, null, 2));
    
    // Show first stat's full score object to understand the structure
    console.log('\nFirst stat score object:', JSON.stringify(stats[0]?.score, null, 2));
}
run().catch(console.error);
