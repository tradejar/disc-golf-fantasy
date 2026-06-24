// Shapes + display metadata for StatMando season stats surfaced on the draft page.

export type StatCategory = 'main' | 'teegreen' | 'putt';

export interface StatmandoCategory {
    stats: Record<string, number>;
    events: number | null;
    rounds: number | null;
    sourceUpdated?: string | null;
}

export type StatmandoStats = Partial<Record<StatCategory, StatmandoCategory>>;

export const CATEGORY_LABEL: Record<StatCategory, string> = {
    main: 'Overview',
    teegreen: 'Tee → Green',
    putt: 'Putting',
};

// Definition + whether the value is a percentage. Pulled from StatMando's own
// glossary so the dropdown can show a tooltip explaining each stat.
export interface StatMeta {
    label: string;   // short column label as scraped
    desc: string;    // human definition (tooltip)
    pct?: boolean;   // render with a % suffix
}

// Display order + meta per category. Only keys present in the scraped data render.
export const STAT_META: Record<StatCategory, StatMeta[]> = {
    main: [
        { label: 'Birdie Avg', desc: 'Birdies or better per 18 holes tracked.' },
        { label: 'Bogey Avg', desc: 'Bogeys or worse per 18 holes tracked.' },
        { label: 'FWY', desc: 'Fairway hits — % of drives landing in the fairway or on the green.', pct: true },
        { label: 'C1R', desc: 'C1 in Regulation — % of holes reaching Circle 1 in regulation.', pct: true },
        { label: 'C2R', desc: 'C2 in Regulation — % of holes reaching Circle 2 in regulation.', pct: true },
        { label: 'PKD', desc: 'Parked — % of holes with a throw landing within 3.3m of the target in regulation.', pct: true },
        { label: 'SCR', desc: 'Scramble — % of par-or-better saves after missing the green in regulation.', pct: true },
        { label: 'OB/18', desc: 'Out-of-bounds throws per 18 holes tracked.' },
        { label: 'C1X', desc: 'C1X Putting — % of putts made from inside Circle 1 (excluding tap-ins).', pct: true },
        { label: 'C2P', desc: 'C2 Putting — % of putts made from Circle 2.', pct: true },
        { label: 'Tot. SG:TG', desc: 'Total Strokes Gained — Tee to Green.' },
        { label: 'Tot. SG:P', desc: 'Total Strokes Gained — Putting.' },
    ],
    teegreen: [
        { label: 'SLG', desc: 'Slugging — Parked + C1 in Reg + C2 in Reg combined.' },
        { label: 'FWY', desc: 'Fairway hits — % of drives landing in the fairway or on the green.', pct: true },
        { label: 'C1R', desc: 'C1 in Regulation — % of holes reaching Circle 1 in regulation.', pct: true },
        { label: 'C2R', desc: 'C2 in Regulation — % of holes reaching Circle 2 in regulation.', pct: true },
        { label: 'PKD', desc: 'Parked — % of holes with a throw landing within 3.3m in regulation.', pct: true },
        { label: 'SCR', desc: 'Scramble — % of par-or-better saves after missing the green.', pct: true },
        { label: 'Tot. SG:TG', desc: 'Total Strokes Gained — Tee to Green.' },
        { label: 'PKD/18', desc: 'Parked count per 18 holes tracked.' },
        { label: 'C1R/18', desc: 'C1-in-Regulation count per 18 holes tracked.' },
        { label: 'C2R/18', desc: 'C2-in-Regulation count per 18 holes tracked.' },
    ],
    putt: [
        { label: 'C1X', desc: 'C1X Putting — % of putts made from inside Circle 1 (excluding tap-ins).', pct: true },
        { label: 'C2P', desc: 'C2 Putting — % of putts made from Circle 2.', pct: true },
        { label: 'Tot. SG:P', desc: 'Total Strokes Gained — Putting.' },
        { label: 'Avg Putt', desc: 'Average distance (feet) of made putts within C1 or C2.' },
        { label: 'SPB', desc: 'Sexton Putting Barometer — C2 makes minus C1 misses.' },
        { label: 'C1X m', desc: 'Total C1X made putts.' },
        { label: 'C1X a', desc: 'Total C1X putt attempts.' },
        { label: 'C2 m', desc: 'Total C2 made putts.' },
        { label: 'C2 a', desc: 'Total C2 putt attempts.' },
    ],
};
