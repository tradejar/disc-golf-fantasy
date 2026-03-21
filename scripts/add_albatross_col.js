require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { error } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE player_stats ADD COLUMN IF NOT EXISTS albatrosses integer NOT NULL DEFAULT 0;' 
    });
    if (error) console.log('RPC error:', error.message);
    
    // Try direct approach
    const { data, error: e2 } = await supabase
        .from('player_stats')
        .update({ albatrosses: 0 })
        .eq('tournament_id', 'nonexistent');
    console.log('Update test:', e2?.message ?? 'OK — column exists now');
}
run();
