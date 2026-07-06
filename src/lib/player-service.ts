import { ALL_PLAYERS } from '@/data/mock-players';
import { calculatePrice, calculateDynamicPrice, FormHistory } from '@/lib/pricing';
import { Player } from '@/data/mock-schema';
import { SeasonTournament, SEASON_2026, getLockTime } from '@/data/tournaments';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deriveStars, StatRowLite, Abilities } from '@/lib/derive-stars';
import { deriveCourseRating, CourseRatingRow, DerivedCourse } from '@/lib/derive-course';
import { statKeyForPlayer } from '@/lib/name-utils';
import { StatmandoStats, StatCategory } from '@/data/statmando-types';

/**
 * Fetches the StatMando-derived inputs the pricing model needs for a tournament:
 * per-player 0-100 ability ratings (keyed `${normName}|${division}`), the full
 * per-player stat dropdown data (`statMap`), and the course's derived
 * Distance/Technical (matched to its most recent playing).
 * Shared by every pricing path so prices stay consistent.
 */
export interface DerivedPricingContext {
    starMap: Map<string, Abilities>;
    /** Full StatMando stat categories per player — feeds the premium dropdown. */
    statMap: Map<string, StatmandoStats>;
    course: { distance?: number; technical?: number };
    /** Full derived-course match (season/event/length) for display; null if no venue match. */
    courseDerived: DerivedCourse | null;
}

export async function getDerivedPricingContext(
    tournament: SeasonTournament,
    divisions: ('MPO' | 'FPO')[]
): Promise<DerivedPricingContext> {
    let starMap = new Map<string, Abilities>();
    const statMap = new Map<string, StatmandoStats>();
    const course: { distance?: number; technical?: number } = {};
    let courseDerived: DerivedCourse | null = null;

    // Both reads are independent and non-fatal — run in parallel, degrade to
    // empty data on failure so pricing falls back to base + form only.
    const [statRes, courseRes] = await Promise.all([
        Promise.resolve(
            supabaseAdmin
                .from('statmando_stats')
                .select('norm_name, division, category, stats, events, rounds, source_updated')
                .in('division', divisions)
        ).catch(e => {
            console.warn('Derived abilities fetch failed (non-fatal):', e);
            return { data: null };
        }),
        Promise.resolve(
            supabaseAdmin
                .from('statmando_course_ratings')
                .select('pdga_event_id, season, event_name, round_length_ft, distance_rating, technical_rating')
        ).catch(e => {
            console.warn('Derived course fetch failed (non-fatal):', e);
            return { data: null };
        }),
    ]);

    try {
        const statRows = statRes.data;
        if (statRows && statRows.length > 0) {
            for (const row of statRows) {
                const key = `${row.norm_name}|${row.division}`;
                const entry = statMap.get(key) ?? {};
                entry[row.category as StatCategory] = {
                    stats: (row.stats ?? {}) as Record<string, number>,
                    events: row.events ?? null,
                    rounds: row.rounds ?? null,
                    sourceUpdated: row.source_updated ?? null,
                };
                statMap.set(key, entry);
            }
            starMap = deriveStars(statRows as StatRowLite[]);
        }
    } catch (e) {
        console.warn('Derived abilities fetch failed (non-fatal):', e);
    }
    try {
        const courseRows = courseRes.data;
        if (courseRows && courseRows.length > 0) {
            courseDerived = deriveCourseRating(courseRows as CourseRatingRow[], tournament.name);
            if (courseDerived) {
                course.distance = courseDerived.distance;
                course.technical = courseDerived.technical;
            }
        }
    } catch (e) {
        console.warn('Derived course fetch failed (non-fatal):', e);
    }
    return { starMap, statMap, course, courseDerived };
}

export function getPlayersWithPrices(
    course?: Partial<SeasonTournament>,
    formMap?: Map<number, FormHistory[]>
): Player[] {
    return ALL_PLAYERS.map(player => {
        const basePrice = calculatePrice(player.rating, player.division);
        const dynamicPrice = course
            ? calculateDynamicPrice(basePrice, player, course, formMap?.get(player.pdgaNumber || 0) || [])
            : basePrice;

        return {
            ...player,
            price: dynamicPrice
        };
    }).sort((a, b) => b.rating - a.rating);
}

/** Derive per-player recent form (final-round placement + cashed flag) from prefetched player_stats rows. */
type FormStatRow = { pdga_number: number; tournament_id: string; round_number: number; placement: number | null; division: string };

function buildFormMap(statsRows: FormStatRow[], completedIds: string[]): Map<number, FormHistory[]> {
    const formMap = new Map<number, FormHistory[]>();
    try {
        if (statsRows.length > 0) {
            const bestRow = new Map<string, FormStatRow>();
            for (const row of statsRows) {
                const key = `${row.pdga_number}_${row.tournament_id}`;
                const prev = bestRow.get(key);
                if (!prev || row.round_number > prev.round_number) bestRow.set(key, row);
            }
            const fieldSize = new Map<string, number>();
            for (const [, row] of bestRow) {
                const k = `${row.tournament_id}_${row.division}`;
                fieldSize.set(k, (fieldSize.get(k) ?? 0) + 1);
            }
            for (const tid of completedIds) {
                for (const [, row] of bestRow) {
                    if (row.tournament_id !== tid) continue;
                    const cashLine = Math.ceil((fieldSize.get(`${tid}_${row.division}`) ?? 100) * 0.4);
                    const cashed = row.placement != null && row.placement <= cashLine;
                    if (!formMap.has(row.pdga_number)) formMap.set(row.pdga_number, []);
                    formMap.get(row.pdga_number)!.push({ finish_position: row.placement ?? 999, cashed });
                }
            }
        }
    } catch (e) {
        console.warn('Form history derivation failed (non-fatal):', e);
    }
    return formMap;
}

export interface TournamentPool {
    /** Priced pool, sorted by price desc. Empty if no registrations (unless fallbackToStatic). */
    players: Player[];
    /** Derived course match for display; null when no venue match. */
    courseDerived: DerivedCourse | null;
}

export interface TournamentPoolOptions {
    /** Attach display-only data: country flags + full StatMando dropdown stats. */
    display?: boolean;
    /** When no registrations exist yet (cron hasn't run), fall back to the static ALL_PLAYERS list. */
    fallbackToStatic?: boolean;
}

/**
 * The single pool-construction path: live PDGA registrants priced via
 * base (rating) + form + course-fit modifiers. Used by both the draft page
 * and the auto-draft cron so their prices can never diverge. ALL_PLAYERS is
 * only a stats sidecar — registrants without an entry still get priced from
 * rating + form alone.
 *
 * All independent reads (registrations, form stats, StatMando stats, course
 * ratings) run in parallel.
 */
export async function getTournamentPool(
    tournament: SeasonTournament,
    now: Date = new Date(),
    opts: TournamentPoolOptions = {}
): Promise<TournamentPool> {
    const completedIds = SEASON_2026
        .filter(t => getLockTime(t) < now && t.id !== tournament.id)
        .sort((a, b) => getLockTime(b).getTime() - getLockTime(a).getTime()) // most recent first
        .map(t => t.id);

    const [regRes, formRes, context] = await Promise.all([
        supabaseAdmin
            .from('tournament_registrations')
            .select('pdga_number, first_name, last_name, division, rating')
            .eq('tournament_id', tournament.id)
            .not('rating', 'is', null)
            .not('first_name', 'is', null),
        completedIds.length > 0
            ? supabaseAdmin
                .from('player_stats')
                .select('pdga_number, tournament_id, round_number, placement, division')
                .in('tournament_id', completedIds)
            : Promise.resolve({ data: [] as FormStatRow[] }),
        getDerivedPricingContext(tournament, ['MPO', 'FPO']),
    ]);

    const registrations = regRes.data;
    const formMap = buildFormMap((formRes.data ?? []) as FormStatRow[], completedIds);
    const { starMap, statMap, courseDerived } = context;

    const effectiveCourse: SeasonTournament = {
        ...tournament,
        distance: courseDerived?.distance ?? tournament.distance,
        technical: courseDerived?.technical ?? tournament.technical,
    };

    // Attach dropdown stats + 0-100 abilities by normalized name (display only for statmando).
    const attachDerived = (p: Player): Player => {
        const key = `${statKeyForPlayer(p.firstName, p.lastName)}|${p.division}`;
        const stats = opts.display ? statMap.get(key) : undefined;
        const abilities = starMap.get(key);
        if (!stats && !abilities) return p;
        return { ...p, ...(stats ? { statmando: stats } : {}), ...(abilities ? { abilities } : {}) };
    };

    if (!registrations || registrations.length === 0) {
        // Fallback: cron hasn't run yet — static list (unfiltered), or empty pool.
        const players = opts.fallbackToStatic
            ? getPlayersWithPrices(tournament, formMap).map(attachDerived)
            : [];
        return { players, courseDerived };
    }

    // Nationality codes for flag display (needs registration pdga numbers).
    const countryMap = new Map<number, string>();
    if (opts.display) {
        try {
            const { data: countryRows } = await supabaseAdmin
                .from('player_countries')
                .select('pdga_number, country')
                .in('pdga_number', registrations.map(r => r.pdga_number));
            for (const row of countryRows ?? []) {
                if (row.country) countryMap.set(row.pdga_number as number, row.country as string);
            }
        } catch (e) {
            console.warn('player_countries fetch failed (non-fatal):', e);
        }
    }

    const players = registrations.map(r => {
        const staticPlayer = ALL_PLAYERS.find(p => p.pdgaNumber === r.pdga_number);
        const abilities = starMap.get(`${statKeyForPlayer(r.first_name as string, r.last_name as string)}|${r.division}`);
        return attachDerived({
            id: String(r.pdga_number),
            firstName: r.first_name as string,
            lastName: r.last_name as string,
            rating: r.rating as number,
            division: r.division as 'MPO' | 'FPO',
            pdgaNumber: r.pdga_number as number,
            country: countryMap.get(r.pdga_number as number),
            price: calculateDynamicPrice(
                calculatePrice(r.rating as number, r.division as 'MPO' | 'FPO'),
                { ...(staticPlayer || {}), abilities },
                effectiveCourse,
                formMap.get(r.pdga_number as number) || []
            ),
            tier: 'A' as const,
            power: staticPlayer?.power,
            accuracy: staticPlayer?.accuracy,
            recovery: staticPlayer?.recovery,
            resilience: staticPlayer?.resilience,
            versatility: staticPlayer?.versatility,
        });
    }).sort((a, b) => b.price - a.price);

    return { players, courseDerived };
}

/**
 * Registrant pool for pricing-only consumers (auto-draft cron).
 * Thin wrapper over getTournamentPool — same prices as the draft page by construction.
 */
export async function getRegisteredPlayersForTournament(
    tournament: SeasonTournament,
    now: Date = new Date()
): Promise<Player[]> {
    const { players } = await getTournamentPool(tournament, now);
    return players;
}
