// Run: node scripts/add-unique-constraint.mjs [envFile]
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = process.argv[2] || '.env.local';
const env = Object.fromEntries(
    readFileSync(envFile, 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => {
            const i = l.indexOf('=');
            const key = l.slice(0, i).trim();
            const val = l.slice(i + 1).trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '').trim();
            return [key, val];
        })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Use raw SQL via rpc if available, otherwise just attempt the alter
const { error } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE public.entries ADD CONSTRAINT IF NOT EXISTS entries_user_tournament_unique UNIQUE (user_id, tournament_id);`
}).catch(() => ({ error: 'rpc not available' }));

if (error) {
    console.log(`Note: Could not run via rpc (${JSON.stringify(error)}). Run this SQL manually in Supabase dashboard:`);
    console.log(`  ALTER TABLE public.entries ADD CONSTRAINT entries_user_tournament_unique UNIQUE (user_id, tournament_id);`);
} else {
    console.log('✅ Unique constraint added.');
}
