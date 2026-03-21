require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data } = await supabase.from('entries').select('id, roster_data, budget_remaining').eq('user_id', 'user_3ATDe7MTeNDsqGfC86K9NV8s0sf').eq('tournament_id', '96402').single();
    if (data) {
        console.log("Roster Array:", Array.isArray(data.roster_data));
        console.log("Holyn's Keys:", Object.keys(data.roster_data[0]));
        console.log("Holyn's price:", data.roster_data[0].price);
        console.log("Type of price:", typeof data.roster_data[0].price);
    }
}
check();
