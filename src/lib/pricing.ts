import { Player } from '@/data/mock-schema';
import { SeasonTournament } from '@/data/tournaments';

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

export interface FormHistory {
    finish_position: number;
    cashed: boolean;
}

export function calculateDynamicPrice(
    basePrice: number,
    player: Partial<Player>,
    course?: Partial<SeasonTournament>,
    recentForm?: FormHistory[]
): number {
    if (process.env.NEXT_PUBLIC_DISABLE_DYNAMIC_PRICING === 'true') return basePrice;

    let ratingMod = 0;

    // 1. Mechanical Course Fit (1% per star difference)
    if (course && player.power !== undefined) {
        const mapping = [
            { p: player.accuracy, c: course.technical },
            { p: player.recovery, c: course.elevation },
            { p: player.resilience, c: course.climate },
            { p: player.versatility, c: course.bias }
        ];

        for (const m of mapping) {
            if (m.p !== undefined && m.c !== undefined) {
                ratingMod += (m.p - m.c) * 1;
            }
        }

        // Distance exception
        if (player.power !== undefined && course.distance !== undefined) {
            if (player.power === 5 && course.distance === 5) {
                ratingMod += 5; // 5% specific bump for 5/5 arm on 5/5 bomber course
            } else {
                ratingMod += (player.power - course.distance) * 1; // standard
            }
        }
    }

    // 2. Recent Form Modifiers (+3/-3% progressive)
    let formMod = 0;
    if (recentForm && recentForm.length > 0) {
        // Evaluate only up to the last 5 tournament finishes
        const past5 = recentForm.slice(0, 5);
        for (const form of past5) {
            if (form.finish_position === 1) formMod += 3;
            else if (form.finish_position === 2) formMod += 2;
            else if (form.finish_position === 3) formMod += 1;
            else if (form.cashed === false) formMod -= 3;
            // ITM is +0%
        }
    }

    const totalMod = ratingMod + formMod;
    const multiplier = 1.0 + (totalMod / 100.0);

    return Math.max(PRICING_CONSTANTS.MIN_PRICE, Math.round(basePrice * multiplier));
}
