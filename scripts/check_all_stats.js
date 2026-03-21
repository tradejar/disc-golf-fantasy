require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    // Check player_stats table
    const { data: stats } = await supabase.from('player_stats').select('tournament_id, round_number').eq('tournament_id', '96402');
    console.log('player_stats for 96402:', stats?.length ?? 0, 'rows');
    
    // Check if there's a different table for live data
    const { data: tables } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    console.log('\nAll tables:', tables?.map(t => t.table_name));
}
run();
