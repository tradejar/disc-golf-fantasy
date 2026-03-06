import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
    console.log('Scrubbing ghost points from upcoming tournaments...');

    // Hardcode the Big Easy Open tournament ID to ensure we only wipe test simulation data 
    // ID comes directly from src/data/tournaments.ts
    const upcomingTournamentId = '96402';

    console.log(`Targeting MVP Big Easy Open (ID: ${upcomingTournamentId})`);

    const { data: updated, error } = await supabaseAdmin
        .from('entries')
        .update({
            total_points: null,
            tournament_rank: null,
            breakdown_data: null
        })
        .eq('tournament_id', upcomingTournamentId)
        .select();

    if (error) {
        console.error('Error scrubbing points:', error);
    } else {
        console.log(`Successfully scrubbed ${updated?.length || 0} ghost entries.`);
    }
}

main().catch(console.error);
