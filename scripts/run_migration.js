require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);
async function run() {
    const sql = `
    CREATE TABLE IF NOT EXISTS players (
      id                  text PRIMARY KEY,
      pdga_number         integer UNIQUE NOT NULL,
      first_name          text NOT NULL,
      last_name           text NOT NULL,
      division            text NOT NULL,
      current_rating      integer NOT NULL,
      pending_rating      integer,
      current_price       integer NOT NULL,
      pending_price       integer,
      ratings_checked_at  timestamptz,
      ratings_updated_at  timestamptz,
      created_at          timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_players_pdga_number ON players(pdga_number);
    CREATE INDEX IF NOT EXISTS idx_players_division ON players(division);
    `;
    // Try via rpc
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) console.log('RPC unavailable (expected):', error.message.slice(0, 60));
    
    // Check if table exists by doing a simple query
    const { error: tblErr } = await supabase.from('players').select('id').limit(1);
    if (tblErr) {
        console.log('❌ players table does not exist yet:', tblErr.message);
        console.log('\nPlease run this SQL in Supabase SQL Editor:\n');
        console.log(`CREATE TABLE IF NOT EXISTS players (
  id                  text PRIMARY KEY,
  pdga_number         integer UNIQUE NOT NULL,
  first_name          text NOT NULL,
  last_name           text NOT NULL,
  division            text NOT NULL,
  current_rating      integer NOT NULL,
  pending_rating      integer,
  current_price       integer NOT NULL,
  pending_price       integer,
  ratings_checked_at  timestamptz,
  ratings_updated_at  timestamptz,
  created_at          timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_players_pdga_number ON players(pdga_number);
CREATE INDEX IF NOT EXISTS idx_players_division ON players(division);`);
    } else {
        console.log('✅ players table already exists or was just created');
    }
}
run();
