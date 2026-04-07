import { getPlayersWithPrices } from '@/lib/player-service';
import { ALL_PLAYERS } from '@/data/mock-players';
import DraftClient from '@/components/DraftClient';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { calculatePrice, calculateDynamicPrice, FormHistory } from '@/lib/pricing';
import { Player } from '@/data/mock-schema';

// Must always render fresh — isLocked is time-sensitive and must never be cached
export const dynamic = 'force-dynamic';


export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const tournament = SEASON_2026.find(t => t.id === id);

    if (!tournament) {
        notFound();
    }

    // Rule: only the NEXT upcoming (unlocked) tournament can be drafted.
    const now = new Date();
    const nextTournament = SEASON_2026.find(t => getLockTime(t) > now);
    if (!nextTournament) notFound();
    if (tournament.id !== nextTournament.id) {
        redirect(`/draft/${nextTournament.id}`);
    }

    const lockTime = getLockTime(tournament);
    const isLocked = now >= lockTime;

    // ── Build player pool from DB registrations ───────────────────────────────
    // The registrations cron runs daily and stores name + division + rating.
    const { data: registrations } = await supabaseAdmin
        .from('tournament_registrations')
        .select('pdga_number, first_name, last_name, division, rating')
        .eq('tournament_id', tournament.id)
        .not('rating', 'is', null)   // only players with a fetched rating
        .not('first_name', 'is', null);

    // ── Derive Recent Form from player_stats (no separate form history table needed) ─
    // Only include tournaments that completed BEFORE this one.
    // Champions Cup and future tournaments are naturally excluded here —
    // so this fix kicks in for the NEXT draft after Champions Cup settles.
    const formMap = new Map<number, FormHistory[]>();
    const completedIds = SEASON_2026
        .filter(t => getLockTime(t) < now && t.id !== tournament.id)
        .sort((a, b) => getLockTime(b).getTime() - getLockTime(a).getTime()) // most recent first
        .map(t => t.id);

    if (completedIds.length > 0) {
        try {
            const { data: statsRows } = await supabaseAdmin
                .from('player_stats')
                .select('pdga_number, tournament_id, round_number, placement, division')
                .in('tournament_id', completedIds);

            if (statsRows && statsRows.length > 0) {
                // Keep only the final-round row per player/tournament
                const bestRow = new Map<string, typeof statsRows[0]>();
                for (const row of statsRows) {
                    const key = `${row.pdga_number}_${row.tournament_id}`;
                    const prev = bestRow.get(key);
                    if (!prev || row.round_number > prev.round_number) bestRow.set(key, row);
                }

                // Compute division field size per tournament for cash line (top 40%)
                const fieldSize = new Map<string, number>();
                for (const [, row] of bestRow) {
                    const k = `${row.tournament_id}_${row.division}`;
                    fieldSize.set(k, (fieldSize.get(k) ?? 0) + 1);
                }

                // Build formMap ordered by tournament recency (completedIds is already newest-first)
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
    }

    let players: Player[];

    if (registrations && registrations.length > 0) {
        // Dynamic pool from DB — the source of truth
        players = registrations.map(r => {
            const staticPlayer = ALL_PLAYERS.find(p => p.pdgaNumber === r.pdga_number);
            return {
                id: String(r.pdga_number),
                firstName: r.first_name as string,
                lastName: r.last_name as string,
                rating: r.rating as number,
                division: r.division as 'MPO' | 'FPO',
                pdgaNumber: r.pdga_number as number,
                price: calculateDynamicPrice(
                    calculatePrice(r.rating as number, r.division as 'MPO' | 'FPO'),
                    staticPlayer || {},
                    tournament,
                    formMap.get(r.pdga_number as number) || []
                ),
                tier: 'A' as const,
                power: staticPlayer?.power,
                accuracy: staticPlayer?.accuracy,
                recovery: staticPlayer?.recovery,
                resilience: staticPlayer?.resilience,
                versatility: staticPlayer?.versatility,
            };
        }).sort((a, b) => b.price - a.price);
    } else {
        // Fallback: cron hasn't run yet — use static list (unfiltered)
        players = getPlayersWithPrices(tournament, formMap);
    }

    // Fetch the user's existing entry so DraftClient can pre-populate picks
    // and track entryId — prevents duplicate inserts on re-save
    const { userId } = await auth();
    let existingEntry: { id: string; roster_data: unknown; budget_remaining: number } | null = null;
    let carryoverBudget = 0;

    if (userId) {
        // Fetch the current tournament entry (for pre-populating picks)
        const { data: currentEntry } = await supabaseAdmin
            .from('entries')
            .select('id, roster_data, budget_remaining')
            .eq('user_id', userId)
            .eq('tournament_id', tournament.id)
            .maybeSingle();
        existingEntry = currentEntry ?? null;

        // ── Budget Carry-Over ─────────────────────────────────────────────────
        // Find the most recently COMPLETED tournament (locked before now, in season order)
        // and carry its leftover budget into this draft's cap.
        // budget_remaining is saved as Math.max(0, …) so it's always non-negative.
        const completedTournaments = SEASON_2026
            .filter(t => getLockTime(t) <= now && t.id !== tournament.id)
            .sort((a, b) => getLockTime(b).getTime() - getLockTime(a).getTime()); // most recent first

        if (completedTournaments.length > 0) {
            const previousTournamentId = completedTournaments[0].id;
            const { data: prevEntry } = await supabaseAdmin
                .from('entries')
                .select('budget_remaining')
                .eq('user_id', userId)
                .eq('tournament_id', previousTournamentId)
                .maybeSingle();

            if (prevEntry) {
                carryoverBudget = Math.max(0, prevEntry.budget_remaining);
            }
        }
    }

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', paddingTop: '1rem', overflowX: 'clip' }}>
            <DraftClient
                players={players}
                tournamentId={tournament.id}
                tournamentName={tournament.name}
                isLocked={isLocked}
                lockTime={lockTime.toISOString()}
                existingEntry={existingEntry}
                carryoverBudget={carryoverBudget}
            />
        </main>
    );
}
