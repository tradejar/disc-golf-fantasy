require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data, error } = await supabase.from('player_stats').select('albatrosses').limit(1);
    if (error) console.log('ERROR - column missing:', error.message);
    else console.log('Column exists ✅, sample:', data);
}
run();
