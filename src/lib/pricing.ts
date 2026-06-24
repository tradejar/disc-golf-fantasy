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

    // 1. Course Fit (StatMando-derived, two axes).
    //    Each axis = how good the player is × how much the course demands it:
    //      modifier = K · ((ability − 50) / 50) · (courseDemand / 5)
    //    - ability is the 0-100 rating (50 = tour average; >50 adds, <50 subtracts)
    //    - courseDemand is the 1-5 Distance/Technical rating (a demand weight)
    //    A demanding course amplifies the swing; a course that doesn't ask for a
    //    skill makes it near-irrelevant. Players without tracked abilities (no
    //    `abilities`) contribute 0 on that axis. Power↔Distance, Accuracy↔Technical.
    const COURSE_FIT_K = 6;
    if (course) {
        const a = player.abilities;
        if (a?.power != null && course.distance != null) {
            ratingMod += COURSE_FIT_K * ((a.power - 50) / 50) * (course.distance / 5);
        }
        if (a?.accuracy != null && course.technical != null) {
            ratingMod += COURSE_FIT_K * ((a.accuracy - 50) / 50) * (course.technical / 5);
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
