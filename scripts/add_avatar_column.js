require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addAvatarColumn() {
  const { error } = await supabase.rpc('execute_sql', {
    sql_query: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;"
  });
  
  if (error) {
    if (error.message.includes('execute_sql')) {
        console.log("RPC execute_sql missing. Running raw query via REST is not possible. You must use the Supabase Dashboard SQL editor, or we can just try to upsert and see if REST handles missing columns gracefully.");
    } else {
        console.error("Error:", error);
    }
  } else {
    console.log("Successfully added avatar_url column");
  }
}

addAvatarColumn();
