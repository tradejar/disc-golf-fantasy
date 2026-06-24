/**
 * Shared name normalization so the StatMando scraper and the draft page
 * derive the SAME key for a player. Without an identical transform on both
 * sides, the stats join silently misses.
 *
 * Normalization: lowercase, strip diacritics (Väinö -> vaino), drop anything
 * that isn't a letter/number/space, collapse whitespace.
 */
export function normalizeName(name: string): string {
    return (name || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // strip combining accents
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')    // punctuation -> space (O'Reilly, J.J.)
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Known name mismatches between PDGA (our registrations) and StatMando.
 * Keys are normalized PDGA names, values are normalized StatMando names.
 * Extend as the verification step surfaces more.
 */
const PDGA_TO_STATMANDO: Record<string, string> = {
    'ricky wysocki': 'richard wysocki',
};

/**
 * Normalized lookup key for a fantasy player, applying known aliases so
 * PDGA-side names line up with how StatMando lists them.
 */
export function statKeyForPlayer(firstName: string, lastName: string): string {
    const norm = normalizeName(`${firstName} ${lastName}`);
    return PDGA_TO_STATMANDO[norm] ?? norm;
}
