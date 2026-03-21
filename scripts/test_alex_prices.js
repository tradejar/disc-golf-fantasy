require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data } = await supabase.from('entries').select('id, roster_data, budget_remaining').eq('user_id', 'user_3ATDe7MTeNDsqGfC86K9NV8s0sf').eq('tournament_id', '96402').single();
    if (data) {
        console.log("Roster Length:", data.roster_data.length);
        let currentSpendDB = 0;
        data.roster_data.forEach(p => {
             console.log(`Player: ${p.firstName} ${p.lastName}, DB Price: ${p.price}, Type: ${typeof p.price}`);
             currentSpendDB += (p.price || 0);
        });
        console.log("Sum of DB Prices:", currentSpendDB);
    }
}
check();
