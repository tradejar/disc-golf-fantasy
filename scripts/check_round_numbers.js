require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    const { data } = await supabase
        .from('player_stats')
        .select('round_number, created_at')
        .eq('tournament_id', '96402')
        .order('round_number')
        .limit(10);
    console.log('Sample rows:', JSON.stringify(data, null, 2));
    
    // Count by round
    const { data: r1 } = await supabase.from('player_stats').select('id', { count: 'exact' }).eq('tournament_id', '96402').eq('round_number', 1);
    const { count: c1 } = await supabase.from('player_stats').select('*', { count: 'exact', head: true }).eq('tournament_id', '96402').eq('round_number', 1);
    console.log('\nRound 1 count:', c1);
    
    const { count: cn } = await supabase.from('player_stats').select('*', { count: 'exact', head: true }).eq('tournament_id', '96402').is('round_number', null);
    console.log('Null round count:', cn);
}
run();
