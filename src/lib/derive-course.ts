// Match a tournament to its most recent StatMando playing (this year if already
// played, else a prior season) and surface the derived course Distance/Technical
// ratings. Matching is venue-name based (sponsor/org noise stripped, token
// Jaccard), since StatMando exposes event ids, not stable course ids.

export interface CourseRatingRow {
    pdga_event_id: string;
    season: number;
    event_name: string;
    round_length_ft: number;
    distance_rating: number;
    technical_rating: number;
}

export interface DerivedCourse {
    distance: number;
    technical: number;
    season: number;
    event: string;
    roundLengthFt: number;
}

// Org/sponsor/filler tokens that carry no venue identity.
const STOP = new Set([
    'dgpt', 'pdga', 'wge', 'the', 'of', 'by', 'a', 'an',
    'presented', 'presents', 'present', 'presen', 'pres', 'powered', 'connected', 's',
]);

function cleanTokens(name: string): Set<string> {
    let n = (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'");
    // Drop the sponsor tail (everything after "presented/powered/connected by").
    n = n.replace(/\s+(presented|powered by|connected by)\b.*$/, '');
    n = n.replace(/[^a-z0-9]+/g, ' ');
    return new Set(
        n.split(' ')
            .filter(Boolean)
            .filter(t => !STOP.has(t))
            .filter(t => !/^\d{4}$/.test(t))        // years
            .filter(t => !/^\d+(st|nd|rd|th)$/.test(t)) // ordinals (43rd/44th)
    );
}

function jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    for (const x of a) if (b.has(x)) inter++;
    return inter / (a.size + b.size - inter);
}

/**
 * Find the best venue match for a tournament among StatMando course ratings.
 * Returns null when nothing clears the similarity threshold (caller falls back
 * to the manual rating). On near-ties, the more recent season wins.
 */
export function deriveCourseRating(
    rows: CourseRatingRow[],
    tournamentName: string,
    threshold = 0.45
): DerivedCourse | null {
    const tk = cleanTokens(tournamentName);
    if (tk.size === 0) return null;

    let best: { r: CourseRatingRow; j: number } | null = null;
    for (const r of rows) {
        const j = jaccard(tk, cleanTokens(r.event_name));
        if (j < threshold) continue;
        if (!best || j > best.j || (Math.abs(j - best.j) < 0.08 && r.season > best.r.season)) {
            best = { r, j };
        }
    }
    if (!best) return null;
    return {
        distance: best.r.distance_rating,
        technical: best.r.technical_rating,
        season: best.r.season,
        event: best.r.event_name,
        roundLengthFt: best.r.round_length_ft,
    };
}
