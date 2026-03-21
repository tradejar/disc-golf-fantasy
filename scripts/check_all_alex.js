require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: entries } = await supabase.from('entries').select('*').eq('user_id', 'user_3ATDe7MTeNDsqGfC86K9NV8s0sf');
    console.log("All entries for user:");
    entries.forEach(e => {
        let sum = 0;
        e.roster_data.forEach(r => sum += (r.price || 0));
        console.log(`Tournament: ${e.tournament_id}, ID: ${e.id}, Budget: ${e.budget_remaining}, Roster Price Sum: ${sum}`);
    });
}
check();
