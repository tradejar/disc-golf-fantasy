import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
    const { data: entries, error } = await supabaseAdmin
        .from('entries')
        .select('id, user_id, tournament_id, total_points')
        .in('tournament_id', ['96401', '96402']);

    if (error) {
        console.error(error);
        return;
    }

    console.log("Supreme Flight (96401):", entries.filter(e => e.tournament_id === '96401'));
    console.log("Big Easy Open (96402):", entries.filter(e => e.tournament_id === '96402'));
}

main().catch(console.error);
