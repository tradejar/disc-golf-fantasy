/** Gross up so the prize pool receives exactly `entryFee` after Stripe takes its cut.
 *  Formula: (fee + $0.30) / (1 - 2.9%), rounded up to nearest $0.05 for clean display. */
export function grossUp(entryFee: number): number {
    const raw = (entryFee + 0.30) / (1 - 0.029);
    return Math.ceil(raw / 0.05) * 0.05;
}

/** Platform fee: 10% of entry fee, capped at $5. */
export function platformFee(entryFee: number): number {
    return Math.min(Math.round(entryFee * 0.10 * 100) / 100, 5.00);
}
