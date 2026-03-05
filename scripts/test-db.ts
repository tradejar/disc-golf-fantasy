import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Testing Supabase Connection...");
console.log("URL:", supabaseUrl);
console.log("Key Length:", supabaseServiceKey?.length);

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing keys!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function test() {
    try {
        // Try to select from profiles (even if empty, should not error)
        const { data, error } = await supabase.from('profiles').select('*').limit(1);

        if (error) {
            console.error("CONNECTION FAILED:", error);
        } else {
            console.log("CONNECTION SUCCESSFUL!");
            console.log("Data:", data);
        }
    } catch (e) {
        console.error("EXCEPTION:", e);
    }
}

test();
