require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: users } = await supabase.from('profiles').select('id, display_name');
    let userId = null;
    if (users) {
        const user = users.find(u => u.display_name && u.display_name.toLowerCase().includes('alexandru'));
        if (user) {
            userId = user.id;
            console.log("Found user:", user.display_name, userId);
        }
    }
    
    if (userId) {
        const { data: entries } = await supabase.from('entries').select('*').eq('user_id', userId);
        console.log("Entries:", JSON.stringify(entries, null, 2));
    }
}
check();
