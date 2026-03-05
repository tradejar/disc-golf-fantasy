import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function check() {
    const { data, error } = await supabase.from('entries').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) console.error(error);
    else {
        data?.forEach(d => {
            console.log(`ID: ${d.id}, Points: ${d.total_points}, Rank: ${d.tournament_rank}`);
        });
    }
}
check();
