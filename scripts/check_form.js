require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Gossage PDGA: 54423, Barela: 52891 (approximate — let's search by name)
    const { data } = await supabase
        .from('player_form_history')
        .select('pdga_number, finish_position, cashed, completed_at')
        .in('pdga_number', [54423, 52891, 61539, 54423])
        .eq('season', 2026)
        .order('completed_at', { ascending: false });
    
    // Also check by searching profiles/registrations for their PDGA numbers
    const { data: regs } = await supabase
        .from('tournament_registrations')
        .select('pdga_number, first_name, last_name')
        .ilike('last_name', 'gossage')
        .limit(3);
    
    const { data: barela } = await supabase
        .from('tournament_registrations')
        .select('pdga_number, first_name, last_name')
        .ilike('last_name', 'barela')
        .limit(3);

    console.log('Gossage registrations:', regs);
    console.log('Barela registrations:', barela);
    console.log('\nForm history:', JSON.stringify(data, null, 2));
}
run();
