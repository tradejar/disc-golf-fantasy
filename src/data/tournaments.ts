export interface SeasonTournament {
    id: string;
    pdga_id: string;
    name: string;
    startDate: string;
    endDate: string;
    location: string;
    /** Number of rounds played in the tournament. Used to detect completion. */
    rounds: number;
    /** UTC hour (0-23) on startDate when draft locks. Default 13 = 9am ET / 6am PT */
    lockHour?: number;
    distance?: number;
    technical?: number;
    elevation?: number;
    climate?: number;
    bias?: number;
}

/**
 * Returns the exact Date when drafting locks for a given tournament.
 * Uses lockHour UTC (default 13:00 = 9am ET) on the startDate.
 */
export function getLockTime(t: SeasonTournament): Date {
    const hour = String(t.lockHour ?? 13).padStart(2, '0');
    return new Date(`${t.startDate}T${hour}:00:00Z`);
}

export const SEASON_2026: SeasonTournament[] = [
    // ── February / March ──────────────────────────────────────────────────────
    {
        id: '96401', pdga_id: '96401',
        name: '2026 Discraft\u2019s Supreme Flight Open',
        startDate: '2026-02-27', endDate: '2026-03-01', rounds: 3,
        location: 'Brooksville, FL', lockHour: 13,
        distance: 4, technical: 4, elevation: 4, climate: 4, bias: 4
    },
    {
        id: '96402', pdga_id: '96402',
        name: '2026 MVP Big Easy Open',
        startDate: '2026-03-13', endDate: '2026-03-15', rounds: 3,
        location: 'Jefferson Parish, LA', lockHour: 14,
        distance: 4, technical: 4, elevation: 1, climate: 4, bias: 4
    },
    {
        id: '96403', pdga_id: '96403',
        name: '2026 Queen City Classic',
        startDate: '2026-03-27', endDate: '2026-03-29', rounds: 3,
        location: 'Charlotte, NC', lockHour: 13,
        distance: 2, technical: 4, elevation: 3, climate: 3, bias: 3
    },
    // ── April ─────────────────────────────────────────────────────────────────
    {
        id: '96404', pdga_id: '96404',
        name: '2026 PDGA Champions Cup',
        startDate: '2026-04-09', endDate: '2026-04-12', rounds: 4,
        location: 'Lynchburg, VA', lockHour: 13,
        distance: 4, technical: 4, elevation: 3, climate: 3, bias: 4
    },
    {
        id: '96405', pdga_id: '96405',
        name: '2026 Play it Again Sports Jonesboro Open',
        startDate: '2026-04-17', endDate: '2026-04-19', rounds: 3,
        location: 'Jonesboro, AR', lockHour: 14,
        distance: 3, technical: 3, elevation: 3, climate: 4, bias: 3
    },
    {
        id: '96406', pdga_id: '96406',
        name: 'GRIPeq 44th Kansas City Wide Open',
        startDate: '2026-04-24', endDate: '2026-04-26', rounds: 3,
        location: 'Liberty, MO', lockHour: 14,
        distance: 4, technical: 3, elevation: 3, climate: 3, bias: 2
    },
    // ── May ───────────────────────────────────────────────────────────────────
    {
        id: '96407', pdga_id: '96407',
        name: '2026 Waco Annual Charity Open',
        startDate: '2026-05-01', endDate: '2026-05-03', rounds: 3,
        location: 'Waco, TX', lockHour: 14,
        distance: 2, technical: 4, elevation: 2, climate: 3, bias: 3
    },
    {
        id: '96408', pdga_id: '96408',
        name: '2026 Open at Austin',
        startDate: '2026-05-07', endDate: '2026-05-10', rounds: 4,
        location: 'Austin, TX', lockHour: 14,
        distance: 3, technical: 4, elevation: 3, climate: 4, bias: 3
    },
    {
        id: '96409', pdga_id: '96409',
        name: '2026 OTB Open',
        startDate: '2026-05-21', endDate: '2026-05-24', rounds: 4,
        location: 'Stockton, CA', lockHour: 16,
        distance: 4, technical: 1, elevation: 1, climate: 4, bias: 2
    },
    // ── June ──────────────────────────────────────────────────────────────────
    {
        id: '96410', pdga_id: '96410',
        name: '2026 DGPT Northwest Championship',
        startDate: '2026-06-04', endDate: '2026-06-07', rounds: 4,
        location: 'Portland, OR', lockHour: 16,
        distance: 4, technical: 3, elevation: 2, climate: 2, bias: 4
    },
    {
        id: '97339', pdga_id: '97339',
        name: '2026 European Open',
        startDate: '2026-06-18', endDate: '2026-06-21', rounds: 4,
        location: 'Tallinn, Estonia', lockHour: 6,
        distance: 3, technical: 2, elevation: 3, climate: 3, bias: 3
    },
    {
        id: '96411', pdga_id: '96411',
        name: '2026 Swedish Open',
        startDate: '2026-06-26', endDate: '2026-06-28', rounds: 3,
        location: 'Borg\u00e5s, Sweden', lockHour: 7,
        distance: 2, technical: 4, elevation: 4, climate: 2, bias: 3
    },
    // ── July ──────────────────────────────────────────────────────────────────
    {
        id: '96412', pdga_id: '96412',
        name: '2026 Ale Open',
        startDate: '2026-07-03', endDate: '2026-07-05', rounds: 3,
        location: 'Nol, Sweden', lockHour: 7
    },
    {
        id: '96413', pdga_id: '96413',
        name: '2026 Heinola Open',
        startDate: '2026-07-10', endDate: '2026-07-12', rounds: 3,
        location: 'Heinola, Finland', lockHour: 6,
        distance: 3, technical: 4, elevation: 4, climate: 2, bias: 3
    },
    {
        id: '97341', pdga_id: '97341',
        name: '2026 US Women\u2019s Disc Golf Championship',
        startDate: '2026-07-16', endDate: '2026-07-19', rounds: 4,
        location: 'Salt Lake City, UT', lockHour: 15,
        distance: 3, technical: 3, elevation: 4, climate: 4, bias: 3
    },
    // ── Late July / August ────────────────────────────────────────────────────
    {
        id: '96414', pdga_id: '96414',
        name: '2026 Ledgestone Open',
        startDate: '2026-07-30', endDate: '2026-08-02', rounds: 4,
        location: 'Peoria, IL', lockHour: 14,
        distance: 4, technical: 4, elevation: 2, climate: 4, bias: 3
    },
    {
        id: '96415', pdga_id: '96415',
        name: '2026 Discmania Challenge',
        startDate: '2026-08-07', endDate: '2026-08-09', rounds: 3,
        location: 'Indianola, IA', lockHour: 14,
        distance: 3, technical: 3, elevation: 2, climate: 3, bias: 3
    },
    {
        id: '96416', pdga_id: '96416',
        name: '2026 Preserve Championship',
        startDate: '2026-08-14', endDate: '2026-08-16', rounds: 3,
        location: 'Clearwater, MN', lockHour: 14,
        distance: 4, technical: 3, elevation: 1, climate: 2, bias: 3
    },
    {
        id: '97344', pdga_id: '97344',
        name: '2026 PDGA Pro World Championships',
        startDate: '2026-08-26', endDate: '2026-08-30', rounds: 5,
        location: 'Milford, MI', lockHour: 13,
        distance: 4, technical: 4, elevation: 4, climate: 2, bias: 4
    },
    // ── September ─────────────────────────────────────────────────────────────
    {
        id: '96417', pdga_id: '96417',
        name: '2026 LWS Open at Idlewild',
        startDate: '2026-09-04', endDate: '2026-09-06', rounds: 3,
        location: 'Burlington, KY', lockHour: 13,
        distance: 3, technical: 4, elevation: 3, climate: 3, bias: 3
    },
    {
        id: '96418', pdga_id: '96418',
        name: '2026 Green Mountain Championship',
        startDate: '2026-09-17', endDate: '2026-09-20', rounds: 4,
        location: 'Jeffersonville, VT', lockHour: 13,
        distance: 4, technical: 4, elevation: 4, climate: 4, bias: 4
    },
    {
        id: '96419', pdga_id: '96419',
        name: '2026 MVP Open x OTB',
        startDate: '2026-09-24', endDate: '2026-09-27', rounds: 4,
        location: 'Leicester, MA', lockHour: 13,
        distance: 3, technical: 4, elevation: 3, climate: 2, bias: 4
    },
    // ── October ───────────────────────────────────────────────────────────────
    {
        id: '97346', pdga_id: '97346',
        name: '2026 US Disc Golf Championship',
        startDate: '2026-10-08', endDate: '2026-10-11', rounds: 4,
        location: 'Rock Hill, SC', lockHour: 13,
        distance: 4, technical: 4, elevation: 2, climate: 3, bias: 1
    },
    {
        id: '96421', pdga_id: '96421',
        name: '2026 DGPT Powerball Cup',
        startDate: '2026-10-15', endDate: '2026-10-18', rounds: 4,
        location: 'Lynchburg, VA', lockHour: 13,
        distance: 4, technical: 3, elevation: 4, climate: 3, bias: 2
    },
];

