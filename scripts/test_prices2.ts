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
    const tournament = SEASON_2026.find(t => t.id === '96401');
    const { data: formHistory } = await supabase.from('player_form_history').select('*');
    const formMap = new Map();
    if (formHistory) {
        for (const record of formHistory) {
            if (!formMap.has(record.pdga_number)) formMap.set(record.pdga_number, []);
            formMap.get(record.pdga_number).push(record);
        }
    }
    const { data } = await supabase.from('tournament_registrations').select('*').eq('tournament_id', '96401');
    let prices: any[] = [];
    if (data) {
        data.forEach(r => {
            let base = calculatePrice(r.rating, r.division);
            let p = calculateDynamicPrice(base, {}, tournament, formMap.get(r.pdga_number) || []);
            prices.push({
                name: r.first_name + ' ' + r.last_name,
                rating: r.rating,
                base: base,
                price: p
            });
            if (p < 0 || base < 0) {
                 console.log("NEGATIVE PRICE FOUND:", r.first_name, r.last_name, p, base);
            }
        });
        const sorted = prices.sort((a,b) => a.price - b.price);
        console.log("Lowest prices:", sorted.slice(0, 10));
    }
}
check();
