
/**
 * calculates price based on different models for comparison
 */

// Model 1: The "Hold My Bag" style (Linear, weak differentiation)
// 1050 -> 1050
// 1000 -> 1000
// Ratio: 1.05x


// Model 2: Linear Steep (Simple, easy math)
// Formula: (Rating - 800) * 40
// 1050 -> 250 * 40 = $10,000
// 1000 -> 200 * 40 = $8,000
// 900 -> 100 * 40 = $4,000
// Ratio: 2.5x
export function pricingLinearSteep(rating: number): number {
    const floor = 800;
    const val = Math.max(0, rating - floor);
    return val * 40;
}


// Model 3: Quadratic (Curve, but not wall)
// Formula: ((Rating - 800) ^ 2) / 6
// 1050 -> 250^2 / 6 = $10,416
// 1000 -> 200^2 / 6 = $6,666
// 900 -> 100^2 / 6 = $1,666
// Ratio: 1.5x (1050 vs 1000) but 6x (1050 vs 900)
export function pricingQuadratic(rating: number): number {
    const floor = 800;
    const val = Math.max(0, rating - floor);
    return Math.round((val * val) / 6);
}

// Model 4: Tiered (Buckets)
// Very clear to explain: "1040+ costs $11k"
export function pricingTiered(rating: number): number {
    if (rating >= 1050) return 12000;
    if (rating >= 1040) return 11000;
    if (rating >= 1030) return 10000;
    if (rating >= 1020) return 9000;
    if (rating >= 1010) return 8000;
    if (rating >= 1000) return 7000; // Average pro costs $7k
    if (rating >= 950) return 5000;
    return 4000;
}

export const PRICING_OPTIONS = {
    linearSteep: pricingLinearSteep,
    quadratic: pricingQuadratic,
    tiered: pricingTiered
};
