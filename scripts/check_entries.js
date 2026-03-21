require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: entries } = await supabase.from('entries').select('id, user_id, tournament_id, budget_remaining, roster_data').order('created_at', { ascending: false }).limit(20);
    if (entries) {
        entries.forEach(e => {
            let sum = 0;
            if (e.roster_data) {
                e.roster_data.forEach(p => {
                    sum += (p.price || 0);
                });
            }
            const expectedRem = 950 - sum;
            if (expectedRem !== e.budget_remaining || e.budget_remaining < 0) {
                console.log(`MISMATCH/NEGATIVE: Entry ${e.id} by ${e.user_id}`);
                console.log(`  Saved Rem: ${e.budget_remaining}, Sum: ${sum}, Expected Rem: ${expectedRem}`);
                if (e.roster_data) {
                    console.log(`  Roster count: ${e.roster_data.length}`);
                }
            } else {
                 console.log(`OK: Entry ${e.id} Rem: ${e.budget_remaining}`);
            }
        });
    }
}
check();
