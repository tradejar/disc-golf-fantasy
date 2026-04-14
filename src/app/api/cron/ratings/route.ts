import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export const maxDuration = 120;
export const revalidate = 0;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const MPO_FLOOR = 880;
const FPO_FLOOR = 800;
function calculatePrice(rating: number, division: 'MPO' | 'FPO'): number {
    const floor = division === 'MPO' ? MPO_FLOOR : FPO_FLOOR;
    return Math.max(1, rating - floor);
}

/**
 * Build a pdgaNumber → rating map by reading Rating from a tournament's live results.
 * Tries rounds 4→1, stops at the first round that returns data for each division.
 */
async function buildRatingsMapFromTournament(tournId: string): Promise<Map<number, number>> {
    const map = new Map<number, number>();

    // Discover the correct round schedule — some events (e.g. Champions Cup) use
    // non-sequential finals round IDs (e.g. Round 12 for the finals, not Round 4).
    let roundsToTry: number[] = [4, 3, 2, 1]; // default fallback
    try {
        const eventRes = await fetch(
            `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_event?TournID=${tournId}`,
            { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
        );
        if (eventRes.ok) {
            const eventData = await eventRes.json();
            const finalRound: number = eventData.data?.FinalRound ?? 0;
            const totalAppRounds: number = eventData.data?.MaxRound ?? 4;
            if (finalRound > 0 && finalRound > totalAppRounds) {
                // Non-sequential finals: try finals round first, then sequential rounds descending
                const seqRounds = Array.from({ length: totalAppRounds - 1 }, (_, i) => totalAppRounds - 1 - i);
                roundsToTry = [finalRound, ...seqRounds];
            }
        }
    } catch { /* fall through to default */ }

    for (const division of ['MPO', 'FPO']) {
        for (const round of roundsToTry) {
            try {
                const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${tournId}&Division=${division}&Round=${round}`;
                const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
                if (!res.ok) continue;
                const scores = (await res.json() as any)?.data?.scores || [];
                let found = 0;
                for (const p of scores) {
                    if (p.PDGANum && p.Rating && p.Rating > 800) {
                        map.set(p.PDGANum, p.Rating);
                        found++;
                    }
                }
                if (found > 0) break;
            } catch { /* skip */ }
        }
    }
    return map;
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Next 2 upcoming tournaments — gate and rating priority apply to both
    const upcomingTwo = SEASON_2026
        .filter(t => getLockTime(t) > now)
        .slice(0, 2);
    const nextTournament = upcomingTwo[0] ?? null;

    // Build a Set of tournament IDs that already have draft entries.
    // CONSERVATIVE GATE: if ANY of the next 2 upcoming tournaments has entries,
    // all rating changes are held as pending (not per-player). This is intentionally
    // over-restrictive: it's safer than letting a player exploit a loophole by knowing
    // their tournament isn't gated yet.
    const tournIdsWithEntries = new Set<string>();
    for (const t of upcomingTwo) {
        const { count } = await supabase
            .from('entries')
            .select('id', { count: 'exact', head: true })
            .eq('tournament_id', t.id);
        if ((count ?? 0) > 0) tournIdsWithEntries.add(t.id);
    }
    console.log(`Upcoming: ${upcomingTwo.map(t => t.name).join(', ')}`);
    console.log(`Tournaments with existing entries: [${[...tournIdsWithEntries].join(', ')}]`);

    // --- Flush pending ratings ---
    // At the start of each run, flush all pending values to current. The gate below
    // will re-pend any that are still blocked. This way pending values are automatically
    // promoted once the draft window that gated them has closed.
    const { data: pendingPlayers } = await supabase
        .from('players')
        .select('id, pending_rating, pending_price')
        .not('pending_rating', 'is', null);

    if (pendingPlayers && pendingPlayers.length > 0) {
        console.log(`Flushing ${pendingPlayers.length} pending rating(s)...`);
        for (const p of pendingPlayers) {
            if (!p.pending_rating || !p.pending_price) continue;
            await supabase.from('players')
                .update({
                    current_rating: p.pending_rating,
                    current_price: p.pending_price,
                    pending_rating: null,
                    pending_price: null,
                    ratings_updated_at: now.toISOString(),
                })
                .eq('id', p.id);
        }
        console.log('Pending flush complete.');
    }

    // Load all players from DB (after flush so current_rating reflects flushed values)
    const { data: players, error: loadErr } = await supabase
        .from('players')
        .select('id, pdga_number, division, current_rating');

    if (loadErr || !players) {
        return NextResponse.json({ error: loadErr?.message ?? 'Failed to load players' }, { status: 500 });
    }

    const results = { checked: 0, changed: 0, appliedImmediately: 0, pendingHeld: 0, skipped: 0, errors: 0 };
    const changes: Array<{ name: string; old: number; new: number; action: string }> = [];

    // --- Build bulk ratings map ---
    // Priority order (first-write-wins, so earlier sources take precedence):
    //   1. Next 2 upcoming tournaments (most relevant for upcoming drafts)
    //   2. Most recently completed tournament (broadens coverage)
    // Deduped via Set to avoid fetching the same tournament twice.
    const bulkRatings = new Map<number, number>();
    const recentTourn = [...SEASON_2026].reverse().find(t => new Date(t.endDate) < now) ?? null;

    const seenIds = new Set<string>();
    const tournsToFetch = [
        ...upcomingTwo,
        ...(recentTourn ? [recentTourn] : []),
    ].filter(t => {
        if (seenIds.has(t.pdga_id)) return false;
        seenIds.add(t.pdga_id);
        return true;
    });

    for (const tourn of tournsToFetch) {
        console.log(`Fetching bulk ratings from ${tourn.name} (${tourn.pdga_id})`);
        const map = await buildRatingsMapFromTournament(tourn.pdga_id);
        map.forEach((rating, pdgaNum) => {
            if (!bulkRatings.has(pdgaNum)) bulkRatings.set(pdgaNum, rating);
        });
        console.log(`  → ${map.size} players loaded, total coverage: ${bulkRatings.size}`);
    }

    // --- Process each player ---
    const shouldGate = tournIdsWithEntries.size > 0;

    for (const player of players) {
        results.checked++;
        const newRating = bulkRatings.get(player.pdga_number) ?? null;

        if (!newRating) {
            results.skipped++;
            continue; // Not in any recent/upcoming event field — skip until they appear
        }

        if (newRating < 800 || newRating > 1200) {
            results.errors++;
            continue;
        }

        if (newRating === player.current_rating) {
            await supabase.from('players')
                .update({ ratings_checked_at: now.toISOString() })
                .eq('id', player.id);
            continue;
        }

        // Rating changed ≥1 pt
        const newPrice = calculatePrice(newRating, player.division as 'MPO' | 'FPO');
        results.changed++;

        if (shouldGate) {
            // Conservative gate: ANY upcoming tournament has entries → hold all changes in pending
            await supabase.from('players')
                .update({ pending_rating: newRating, pending_price: newPrice, ratings_checked_at: now.toISOString() })
                .eq('id', player.id);
            results.pendingHeld++;
            changes.push({ name: player.id, old: player.current_rating, new: newRating, action: 'pending' });
        } else {
            // No entries for any upcoming tournament — apply immediately
            await supabase.from('players')
                .update({
                    current_rating: newRating, current_price: newPrice,
                    pending_rating: null, pending_price: null,
                    ratings_checked_at: now.toISOString(),
                    ratings_updated_at: now.toISOString(),
                })
                .eq('id', player.id);
            results.appliedImmediately++;
            changes.push({ name: player.id, old: player.current_rating, new: newRating, action: 'applied' });
        }
    }

    console.log('Ratings cron complete:', results);
    if (changes.length > 0) {
        console.log('Changes:', changes.map(c => `${c.name}: ${c.old}→${c.new} (${c.action})`).join(', '));
    }

    return NextResponse.json({
        ok: true,
        nextTournament: nextTournament?.name ?? null,
        tournIdsWithEntries: [...tournIdsWithEntries],
        ...results,
        changes,
        checkedAt: now.toISOString(),
    });
}
