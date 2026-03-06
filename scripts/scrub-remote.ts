import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function main() {
    const envPreview = fs.readFileSync('.env.preview', 'utf-8');
    const urlMatch = envPreview.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)(?:\\n)?"/);
    const keyMatch = envPreview.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)(?:\\n)?"/);

    if (!urlMatch || !keyMatch) {
        throw new Error("Could not parse env preview");
    }

    const url = urlMatch[1].replace('\\n', '');
    const key = keyMatch[1].replace('\\n', '');

    console.log("Connecting to:", url);
    const admin = createClient(url, key);

    const upcomingTournamentId = '96402';
    console.log(`Targeting MVP Big Easy Open (ID: ${upcomingTournamentId})`);

    const { data: updated, error } = await admin
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
