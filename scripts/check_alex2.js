require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: entries } = await supabase.from('entries').select('*').eq('user_id', 'user_3ATDe7MTeNDsqGfC86K9NV8s0sf').eq('tournament_id', '96402');
    console.log("Entries count:", entries.length);
    if (entries.length > 0) {
        entries.forEach(e => console.log("Entry ID:", e.id, "Budget:", e.budget_remaining));
    }
}
check();
