require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { calculatePrice, calculateDynamicPrice } = require('./src/lib/pricing');
const { SEASON_2026 } = require('./src/data/tournaments');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const tournament = SEASON_2026.find(t => t.id === '96402');
    const { data: formHistory } = await supabase.from('player_form_history').select('*');
    const formMap = new Map();
    if (formHistory) {
        for (const record of formHistory) {
            if (!formMap.has(record.pdga_number)) formMap.set(record.pdga_number, []);
            formMap.get(record.pdga_number).push(record);
        }
    }
    const { data: regs } = await supabase.from('tournament_registrations').select('*').eq('tournament_id', '96402');
    
    // Build "players" pool identically to DraftPage.tsx
    let players = [];
    if (regs) {
        players = regs.map(r => {
            const base = calculatePrice(r.rating, r.division);
            const p = calculateDynamicPrice(base, { power: undefined }, tournament, formMap.get(r.pdga_number) || []);
            return {
                id: (r.division === 'MPO' ? 'm_' : 'f_') + r.pdga_number,
                division: r.division,
                firstName: r.first_name,
                lastName: r.last_name,
                pdgaNumber: r.pdga_number,
                price: p,
                rating: r.rating
            };
        });
    }

    // Now fetch Alexandru's existing entry identically
    const { data } = await supabase.from('entries').select('id, roster_data, budget_remaining').eq('user_id', 'user_3ATDe7MTeNDsqGfC86K9NV8s0sf').eq('tournament_id', '96402').single();
    
    if (data && data.roster_data) {
        const rawRoster = data.roster_data;
        const mappedRoster = rawRoster.map(saved => {
            const currentPoolPlayer = players.find(p =>
                (saved.pdgaNumber && p.pdgaNumber === saved.pdgaNumber) ||
                (p.firstName === saved.firstName && p.lastName === saved.lastName)
            );
            if (currentPoolPlayer) {
                return { ...currentPoolPlayer, price: saved.price ?? currentPoolPlayer.price };
            }
            return saved;
        });

        const currentSpend = mappedRoster.reduce((sum, p) => sum + p.price, 0);
        console.log("MAPPED ROSTER SPEND:", currentSpend);
        console.log("REMAINING BUDGET:", 950 - currentSpend);
        console.log("MAPPED PRICES:", mappedRoster.map(p => p.price));
    }
}
check();
