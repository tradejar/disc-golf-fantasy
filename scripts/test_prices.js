require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data } = await supabase.from('tournament_registrations').select('pdga_number, first_name, last_name, division, rating').eq('tournament_id', '96401');
    let nullCount = 0;
    const prices = [];
    if (data) {
        data.forEach(p => {
            if (!p.pdga_number) nullCount++;
            prices.push(p);
        });
    }
    console.log("Total registrations:", data?.length);
    console.log("Players with missing pdga_number:", nullCount);
    const duplicates = {};
    data.forEach(p => {
        duplicates[p.pdga_number] = (duplicates[p.pdga_number] || 0) + 1;
    });
    let hasDups = false;
    for (const [k, v] of Object.entries(duplicates)) {
        if (v > 1) {
            console.log("Duplicate PDGA number found:", k, "Count:", v);
            hasDups = true;
        }
    }
    if (!hasDups) console.log("No duplicate PDGA numbers.");
}
check();
