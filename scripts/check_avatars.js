require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAvatars() {
    const { data, error } = await supabase.from('profiles').select('display_name, avatar_url');
    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Profiles in DB:", data);
    }
}
checkAvatars();
