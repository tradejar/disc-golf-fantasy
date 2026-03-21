require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data } = await supabase
        .from('player_stats')
        .select('*')
        .eq('tournament_id', '96402')
        .limit(5);
    console.log(JSON.stringify(data, null, 2));
}
run();
