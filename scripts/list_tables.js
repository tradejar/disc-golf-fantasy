require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);
async function run() {
    // Query pg_tables directly via a known table that works
    const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');
    if (error) {
        console.log('information_schema blocked, trying fallback...');
        // Probe each known table directly
        for (const t of ['players', 'entries', 'player_stats', 'profiles', 'tournaments', 'leagues', 'league_members', 'registrations']) {
            const { error: e } = await supabase.from(t).select('*', { count: 'exact', head: true });
            console.log(`${t}: ${e ? '❌ ' + e.message.slice(0, 50) : '✅ exists'}`);
        }
    } else {
        console.log('Tables:', data?.map(r => r.table_name).join(', '));
    }
}
run();
