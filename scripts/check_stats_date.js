require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data } = await supabase
        .from('player_stats')
        .select('id, round_number, created_at, updated_at')
        .eq('tournament_id', '96402')
        .eq('round_number', 1)
        .order('created_at', { ascending: false })
        .limit(3);
    console.log('Most recent round 1 rows:', JSON.stringify(data, null, 2));
}
run();
