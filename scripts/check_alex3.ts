import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { calculatePrice, calculateDynamicPrice } from '../src/lib/pricing';
import { SEASON_2026 } from '../src/data/tournaments';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    const { data } = await supabase.from('tournament_registrations').select('*').eq('tournament_id', '96402');
    
    // Output specific parsed prices of Alex's team:
    const alexIds = [133547, 38008, 56511, 35449, 32654, 78817];
    let totalCurrent = 0;
    if (data) {
        const team = data.filter(r => alexIds.includes(r.pdga_number));
        team.forEach(r => {
            let base = calculatePrice(r.rating, r.division);
            let p = calculateDynamicPrice(base, { power: undefined }, tournament, formMap.get(r.pdga_number) || []);
            console.log(r.first_name, r.last_name, "Base:", base, "Live Dynamic Price:", p);
            totalCurrent += p;
        });
        console.log("Total Live Price:", totalCurrent);
        console.log("Expected Budget Rem (using LIVE prices):", 950 - totalCurrent);
    }
}
check();
