require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
    // Check for any non-zero scores (real data)
    const { count: realCount } = await supabase
        .from('player_stats')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', '96402')
        .eq('round_number', 1)
        .gt('strokes', 0);

    // Get most recent update time
    const { data: latest } = await supabase
        .from('player_stats')
        .select('pdga_number, strokes, to_par, birdies, updated_at')
        .eq('tournament_id', '96402')
        .eq('round_number', 1)
        .gt('strokes', 0)
        .order('updated_at', { ascending: false })
        .limit(5);

    // When was the last ingest run?
    const { data: anyRow } = await supabase
        .from('player_stats')
        .select('updated_at')
        .eq('tournament_id', '96402')
        .order('updated_at', { ascending: false })
        .limit(1);

    console.log('Non-zero score rows (real data):', realCount ?? 0);
    console.log('Last ingest ran at:', anyRow?.[0]?.updated_at ?? 'unknown');
    console.log('Sample real scores:', JSON.stringify(latest, null, 2));
}
run();
