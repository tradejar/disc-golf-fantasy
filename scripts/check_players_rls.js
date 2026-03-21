require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);
async function run() {
    // Try selecting with explicit schema 
    const { data, error } = await supabase.from('players').select('id').limit(1);
    console.log('select result:', { data, error: error?.message });

    // Check if it's an RLS issue or schema issue
    // Also check what columns actually exist
    const { data: d2, error: e2 } = await supabase
        .rpc('get_tables', {})
        .limit(1);
    console.log('rpc:', e2?.message);
}
run();
