require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    // Gossage PDGA: 35449
    const { data } = await supabase
        .from('player_stats')
        .select('*')
        .eq('tournament_id', '96402')
        .eq('pdga_number', 35449);
    console.log(JSON.stringify(data, null, 2));
    
    // Also check if the advanced stats API is returning anything — check a different player with data
    const { data: topPlayer } = await supabase
        .from('player_stats')
        .select('pdga_number, round_number, strokes, fairway_pct, c1_in_reg_pct, c1x_pct, c2_pct, scramble_pct')
        .eq('tournament_id', '96402')
        .gt('fairway_pct', 0)
        .limit(3);
    console.log('\nPlayers WITH fairway data:', JSON.stringify(topPlayer, null, 2));
}
run();
