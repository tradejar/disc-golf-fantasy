import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    const { data, error } = await supabase.from('entries').delete().is('total_points', null);
    if (error) console.error(error);
    else console.log("Deleted old incomplete entries!");
}
run();
