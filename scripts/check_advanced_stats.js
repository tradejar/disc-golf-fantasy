require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    // Check Chocek (189702) and Handley (133547) round 1 stats
    const { data } = await supabase
        .from('player_stats')
        .select('pdga_number, round_number, strokes, birdies, fairway_pct, c1_in_reg_pct, c2_in_reg_pct, c1x_pct, c2_pct, scramble_pct')
        .eq('tournament_id', '96402')
        .in('pdga_number', [189702, 133547])
        .gt('strokes', 0);
    console.table(data);
}
run();
