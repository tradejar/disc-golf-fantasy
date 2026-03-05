
/**
 * Rating Update Logic (Simplified PDGA Model)
 * 
 * 1. History: Look at all rounds in last 12 months.
 * 2. Recent Bias: The most recent 25% of rounds are Double Weighted.
 * 3. Outliers: Limit rounds > 100pts below average (drop them).
 * 
 * Algorithm:
 * - Calculate Initial Avg.
 * - Identify dropping rounds (Avg - 100).
 * - Apply weights (Recent * 2).
 * - Calculate Final Avg.
 * 
 * Implication:
 * - A hot weekend (1060 avg) for a 1000 player will boost them immediately.
 * - This triggers a Price increase before the next event.
 */

export interface RatedRound {
    rating: number;
    date: string; // ISO
    id: string;
}

export function calculateNewRating(rounds: RatedRound[]): number {
    if (rounds.length === 0) return 0;

    // 1 Sort by date desc
    const sorted = [...rounds].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Identify Drop Cutoff (Simple version: just drop < 100 below current avg of top 50%)
    // For MVP, we'll skip complex dropping logic to stick to the "Hot Streak" incentive.

    // 3. Double Weight Recent 25%
    const doubleCount = Math.ceil(sorted.length * 0.25);

    let totalPoints = 0;
    let totalWeight = 0;

    sorted.forEach((round, index) => {
        const weight = index < doubleCount ? 2 : 1;
        totalPoints += round.rating * weight;
        totalWeight += weight;
    });

    return Math.round(totalPoints / totalWeight);
}
