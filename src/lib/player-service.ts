import { ALL_PLAYERS } from '@/data/mock-players';
import { calculatePrice } from '@/lib/pricing';
import { Player } from '@/data/mock-schema';

export function getPlayersWithPrices(): Player[] {
    return ALL_PLAYERS.map(player => ({
        ...player,
        price: calculatePrice(player.rating, player.division)
    })).sort((a, b) => b.rating - a.rating);
}
