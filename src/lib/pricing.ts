
/**
 * Pricing Model: "Performance Delta"
 * Price is determined by how much a player's rating exceeds the "Pro Standard" floor.
 * 
 * Logic:
 * Price = max(1, PlayerRating - Floor)
 * 
 * Floors:
 * MPO: 900 (Touring Pro Minimum)
 * FPO: 800
 * 
 * Examples (MPO):
 * 1050 Rating -> 1050 - 900 = 150 Cost
 * 1000 Rating -> 1000 - 900 = 100 Cost
 * 950 Rating  -> 950 - 900  = 50 Cost
 * 
 * This creates a dynamic where a top pro (150) costs 3x an average pro (50).
 */

export const PRICING_CONSTANTS = {
    MPO_FLOOR: 880, // Adjusted slightly lower to keep 900s value-relevant
    FPO_FLOOR: 800,
    MIN_PRICE: 1,
};

export function calculatePrice(rating: number, division: 'MPO' | 'FPO'): number {
    const floor = division === 'MPO' ? PRICING_CONSTANTS.MPO_FLOOR : PRICING_CONSTANTS.FPO_FLOOR;
    const price = rating - floor;
    return Math.max(PRICING_CONSTANTS.MIN_PRICE, price);
}
