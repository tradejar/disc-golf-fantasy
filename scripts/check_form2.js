require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // Gossage PDGA: 35449, Barela: 44382
    const { data: gossage } = await supabase
        .from('player_form_history')
        .select('*')
        .eq('pdga_number', 35449)
        .order('completed_at', { ascending: false })
        .limit(5);
    
    const { data: barela } = await supabase
        .from('player_form_history')
        .select('*')
        .eq('pdga_number', 44382)
        .order('completed_at', { ascending: false })
        .limit(5);

    console.log('=== GOSSAGE (35449) recent form ===');
    console.table(gossage?.map(r => ({ tournament: r.tournament_id, finish: r.finish_position, season: r.season })));
    console.log('\n=== BARELA (44382) recent form ===');
    console.table(barela?.map(r => ({ tournament: r.tournament_id, finish: r.finish_position, season: r.season })));
}
run();
