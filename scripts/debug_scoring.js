require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    // 1. Find Chocek's PDGA number in player_stats
    const { data: chocekStats } = await supabase
        .from('player_stats')
        .select('pdga_number, strokes, to_par, round_number, updated_at')
        .eq('tournament_id', '96402')
        .gt('strokes', 0)
        .limit(30);
    
    console.log('All non-zero stats rows for 96402 (pdga nums only):');
    console.log(chocekStats?.map(r => r.pdga_number));

    // 2. Find Chocek in registrations/players
    const { data: chocekReg } = await supabase
        .from('tournament_registrations')
        .select('pdga_number, first_name, last_name')
        .ilike('last_name', 'chocek');
    console.log('\nChocek in registrations:', chocekReg);

    // 3. Check an entry's roster_data to see what PDGA number is stored
    const { data: entry } = await supabase
        .from('entries')
        .select('roster_data')
        .eq('tournament_id', '96402')
        .limit(1);
    
    const roster = entry?.[0]?.roster_data;
    console.log('\nSample roster_data player pdgaNumbers:', roster?.map((p) => ({ name: p.lastName, pdga: p.pdgaNumber })));
}
run();
