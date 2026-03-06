import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
    const { data: entries, error } = await supabaseAdmin
        .from('entries')
        .select('id, user_id, tournament_id, total_points');

    if (error) {
        console.error(error);
        return;
    }

    // Group by tournament_id
    const byTournament = entries.reduce((acc, e) => {
        if (!acc[e.tournament_id]) acc[e.tournament_id] = [];
        acc[e.tournament_id].push(e);
        return acc;
    }, {} as Record<string, any[]>);

    for (const [tid, list] of Object.entries(byTournament)) {
        console.log(`\nTournament ID: ${tid} has ${list.length} entries`);
        console.log(list.slice(0, 3)); // show first few
    }
}

main().catch(console.error);
