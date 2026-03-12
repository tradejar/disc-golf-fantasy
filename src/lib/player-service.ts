import { ALL_PLAYERS } from '@/data/mock-players';
import { calculatePrice, calculateDynamicPrice, FormHistory } from '@/lib/pricing';
import { Player } from '@/data/mock-schema';
import { SeasonTournament } from '@/data/tournaments';

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
