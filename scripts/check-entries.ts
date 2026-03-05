import { supabaseAdmin } from '../src/lib/supabase-admin';

async function main() {
    console.log('Checking all entries...');

    const { data: entries, error } = await supabaseAdmin
        .from('entries')
        .select(`
            id,
            user_id,
            tournament_id,
            created_at,
            profiles ( display_name )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching entries:', error);
    } else {
        console.log('Recent Entries:', JSON.stringify(entries, null, 2));
    }
}

main().catch(console.error);
