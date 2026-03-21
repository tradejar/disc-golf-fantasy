require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data } = await supabase.from('tournament_registrations').select('*').eq('tournament_id', '96402');
    const alexIds = [133547, 38008, 56511, 35449, 32654, 78817];
    if (data) {
        const team = data.filter(r => alexIds.includes(r.pdga_number));
        team.forEach(r => {
            console.log(r.first_name, r.last_name, "Rating:", r.rating);
        });
    }
}
check();
