import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("Initiating Production Database Reset for 2026 Season Launch...");

    // Delete all entries
    const { error: entryError } = await supabase.from('entries').delete().neq('user_id', 'FORCE_DELETE_ALL');
    // ^ neq with a fake string will match all real string rows, allowing bulk delete
    if (entryError) {
        console.error("Failed to delete entries:", entryError);
    } else {
        console.log("✅ Wiped all legacy drafts from the `entries` table.");
    }

    // Delete all player_stats
    const { error: statsError } = await supabase.from('player_stats').delete().neq('tournament_id', 'FORCE_DELETE_ALL');
    if (statsError) {
        console.error("Failed to delete player_stats:", statsError);
    } else {
        console.log("✅ Wiped all mock stats from the `player_stats` table.");
    }

    console.log("Supabase Production Database is successfully reset and ready for true 2026 Live ingestion.");
}

run();
