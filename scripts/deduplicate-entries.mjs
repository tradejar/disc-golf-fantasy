// Run: node scripts/deduplicate-entries.mjs [envFile]
// e.g.  node scripts/deduplicate-entries.mjs .env.preview  (staging)
//       node scripts/deduplicate-entries.mjs .env.local    (prod)

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = process.argv[2] || '.env.local';
// Parse env file — handle quotes around values
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

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: entries, error } = await supabase
    .from('entries')
    .select('id, user_id, tournament_id, total_points, created_at')
    .order('total_points', { ascending: false, nullsFirst: false });

if (error) { console.error('Fetch error:', error); process.exit(1); }

const best = new Map();
const toDelete = [];

for (const entry of entries) {
    const key = `${entry.user_id}::${entry.tournament_id}`;
    if (!best.has(key)) {
        best.set(key, entry.id);
    } else {
        toDelete.push(entry.id);
    }
}

console.log(`Found ${entries.length} entries, ${toDelete.length} duplicates to remove.`);

if (toDelete.length === 0) {
    console.log('Nothing to do!');
    process.exit(0);
}

const { error: delError } = await supabase
    .from('entries')
    .delete()
    .in('id', toDelete);

if (delError) { console.error('Delete error:', delError); process.exit(1); }

console.log(`✅ Removed ${toDelete.length} duplicate entries. ${best.size} unique entries remain.`);
