import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
    console.log('Testing league query...');

    // First, find ANY league
    const { data: leagues, error: fetchErr } = await supabaseAdmin
        .from('leagues')
        .select('id, name')
        .limit(1);

    if (fetchErr) {
        console.error('Failed to fetch a league:', fetchErr);
        return;
    }

    if (!leagues || leagues.length === 0) {
        console.log('No leagues found to test!');
        return;
    }

    const leagueId = leagues[0].id;
    console.log(`Testing with league ID: ${leagueId}`);

    const { data: league, error: leagueErr } = await supabaseAdmin
        .from('leagues')
        .select(`
            id,
            name,
            access_code,
            entry_fee,
            payout_structure,
            owner_id,
            league_members (
                user_id,
                joined_at,
                profiles ( display_name )
            )
        `)
        .eq('id', leagueId)
        .single();

    if (leagueErr) {
        console.error('Query Error:', leagueErr);
    } else {
        console.log('Query Success:', JSON.stringify(league, null, 2));
    }
}

main().catch(console.error);
