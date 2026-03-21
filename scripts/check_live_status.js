require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data } = await supabase
        .from('player_stats')
        .select('id, tournament_id, round_number, created_at')
        .eq('tournament_id', '96402')
        .eq('round_number', 1)
        .limit(5);
    console.log('Round 1 stats for 96402:', data);
    console.log('Count:', data?.length ?? 0);
}
run();
