import { ALL_PLAYERS } from '@/data/mock-players';
import { calculatePrice, calculateDynamicPrice, FormHistory } from '@/lib/pricing';
import { Player } from '@/data/mock-schema';
import { SeasonTournament, SEASON_2026, getLockTime } from '@/data/tournaments';
import { supabaseAdmin } from '@/lib/supabase-admin';

export function getPlayersWithPrices(
    course?: Partial<SeasonTournament>,
    formMap?: Map<number, FormHistory[]>
): Player[] {
    return ALL_PLAYERS.map(player => {
        const basePrice = calculatePrice(player.rating, player.division);
        const dynamicPrice = course
            ? calculateDynamicPrice(basePrice, player, course, formMap?.get(player.pdgaNumber || 0) || [])
            : basePrice;

        return {
            ...player,
            price: dynamicPrice
        };
    }).sort((a, b) => b.rating - a.rating);
}

/**
 * Returns the draftable player pool for a tournament: live PDGA registrants
 * priced via the same dynamic-price path as `/draft/[id]`. ALL_PLAYERS is used
 * only as a stats sidecar (power/accuracy/recovery/resilience/versatility) for
 * the course-fit modifier — registrants without a sidecar entry still receive a
 * price from rating + form modifier alone.
 *
 * Mirrors the inline logic in `src/app/draft/[id]/page.tsx:36-122`. When the
 * page is migrated to call this helper, that ~85 LOC of duplication goes away.
 */
export async function getRegisteredPlayersForTournament(
    tournament: SeasonTournament,
    now: Date = new Date()
): Promise<Player[]> {
    const { data: registrations } = await supabaseAdmin
        .from('tournament_registrations')
        .select('pdga_number, first_name, last_name, division, rating')
        .eq('tournament_id', tournament.id)
        .not('rating', 'is', null)
        .not('first_name', 'is', null);

    if (!registrations || registrations.length === 0) return [];

    const completedIds = SEASON_2026
        .filter(t => getLockTime(t) < now && t.id !== tournament.id)
        .sort((a, b) => getLockTime(b).getTime() - getLockTime(a).getTime())
        .map(t => t.id);

    const formMap = new Map<number, FormHistory[]>();
    if (completedIds.length > 0) {
        try {
            const { data: statsRows } = await supabaseAdmin
                .from('player_stats')
                .select('pdga_number, tournament_id, round_number, placement, division')
                .in('tournament_id', completedIds);

            if (statsRows && statsRows.length > 0) {
                const bestRow = new Map<string, typeof statsRows[0]>();
                for (const row of statsRows) {
                    const key = `${row.pdga_number}_${row.tournament_id}`;
                    const prev = bestRow.get(key);
                    if (!prev || row.round_number > prev.round_number) bestRow.set(key, row);
                }

                const fieldSize = new Map<string, number>();
                for (const [, row] of bestRow) {
                    const k = `${row.tournament_id}_${row.division}`;
                    fieldSize.set(k, (fieldSize.get(k) ?? 0) + 1);
                }

                for (const tid of completedIds) {
                    for (const [, row] of bestRow) {
                        if (row.tournament_id !== tid) continue;
                        const cashLine = Math.ceil((fieldSize.get(`${tid}_${row.division}`) ?? 100) * 0.4);
                        const cashed = row.placement != null && row.placement <= cashLine;
                        if (!formMap.has(row.pdga_number)) formMap.set(row.pdga_number, []);
                        formMap.get(row.pdga_number)!.push({ finish_position: row.placement ?? 999, cashed });
                    }
                }
            }
        } catch (e) {
            console.warn('Form history derivation failed (non-fatal):', e);
        }
    }

    return registrations.map(r => {
        const staticPlayer = ALL_PLAYERS.find(p => p.pdgaNumber === r.pdga_number);
        return {
            id: String(r.pdga_number),
            firstName: r.first_name as string,
            lastName: r.last_name as string,
            rating: r.rating as number,
            division: r.division as 'MPO' | 'FPO',
            pdgaNumber: r.pdga_number as number,
            price: calculateDynamicPrice(
                calculatePrice(r.rating as number, r.division as 'MPO' | 'FPO'),
                staticPlayer || {},
                tournament,
                formMap.get(r.pdga_number as number) || []
            ),
            tier: 'A' as const,
            power: staticPlayer?.power,
            accuracy: staticPlayer?.accuracy,
            recovery: staticPlayer?.recovery,
            resilience: staticPlayer?.resilience,
            versatility: staticPlayer?.versatility,
        };
    }).sort((a, b) => b.price - a.price);
}
