require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: members } = await supabase.from('league_members').select('*');
    if (members) {
        members.forEach(m => {
            console.log(`Member ${m.user_id} in League ${m.league_id}: ${m.credits} credits`);
            if (m.credits < 0) {
                 console.log("NEGATIVE CREDITS FOUND!");
            }
        });
    } else {
        console.log("No league members found.");
    }
}
check();
