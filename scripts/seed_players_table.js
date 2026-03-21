require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// Inline the pricing constants (mirrors src/lib/pricing.ts)
const MPO_FLOOR = 880;
const FPO_FLOOR = 800;
function calculatePrice(rating, division) {
    const floor = division === 'MPO' ? MPO_FLOOR : FPO_FLOOR;
    return Math.max(1, rating - floor);
}

// Read players.ts by running a small TS-to-JSON extraction via node
// We'll use the compiled output from the next build's cache, or parse manually
const fs = require('fs');
const path = require('path');

// Parse the players.ts file
const playersFile = fs.readFileSync(
    path.join(__dirname, '../src/data/players.ts'), 'utf8'
);

// Extract player objects via regex (handles both MPO and FPO arrays)
const playerRegex = /\{\s*id:\s*'([^']+)',\s*firstName:\s*'([^']+)',\s*lastName:\s*'([^']+)',\s*division:\s*'([^']+)',\s*price:\s*(\d+),\s*pdgaNumber:\s*(\d+),\s*rating:\s*(\d+)/g;

const players = [];
let match;
while ((match = playerRegex.exec(playersFile)) !== null) {
    const [, id, firstName, lastName, division, , pdgaNumber, rating] = match;
    const ratingNum = parseInt(rating);
    const price = calculatePrice(ratingNum, division);
    players.push({
        id,
        pdga_number: parseInt(pdgaNumber),
        first_name: firstName,
        last_name: lastName,
        division,
        current_rating: ratingNum,
        pending_rating: null,
        current_price: price,
        pending_price: null,
        ratings_checked_at: null,
        ratings_updated_at: null,
    });
}

console.log(`Parsed ${players.length} players from players.ts`);
console.log(`Sample:`, players.slice(0, 3).map(p => `${p.first_name} ${p.last_name} (${p.division}) r${p.current_rating} $${p.current_price}`).join(', '));

async function run() {
    const { error } = await supabase
        .from('players')
        .upsert(players, { onConflict: 'id' });

    if (error) {
        console.error('❌ Upsert failed:', error.message);
        process.exit(1);
    }

    const { count } = await supabase.from('players').select('*', { count: 'exact', head: true });
    console.log(`✅ Seeded. Players table now has ${count} rows.`);
}
run();
