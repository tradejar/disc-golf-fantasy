require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);
async function run() {
    const { data, error, count } = await supabase.from('players').select('*', { count: 'exact' }).limit(3);
    console.log('Row count:', count);
    console.log('Columns:', data?.[0] ? Object.keys(data[0]).join(', ') : 'empty table');
    console.log('Sample rows:', JSON.stringify(data?.slice(0,2), null, 2));
}
run();
