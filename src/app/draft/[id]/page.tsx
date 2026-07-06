import { getTournamentPool } from '@/lib/player-service';
import DraftClient from '@/components/DraftClient';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import { isPremium as checkPremium } from '@/lib/premium';
import { notFound, redirect } from 'next/navigation';

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

    // ── Player pool via the shared pricing path (same as auto-draft) ──────────
    // getTournamentPool runs all independent reads in parallel and prices
    // registrants with base + form + course-fit — the single source of truth,
    // so draft-page and auto-draft prices can't diverge.
    const { players, courseDerived } = await getTournamentPool(tournament, now, {
        display: true,          // attach country flags + StatMando dropdown stats
        fallbackToStatic: true, // registrations cron hasn't run yet → static list
    });

    // Fetch the user's existing entry so DraftClient can pre-populate picks
    // and track entryId — prevents duplicate inserts on re-save
    const { userId } = await auth();
    const isPremium = userId ? await checkPremium(userId) : false;
    let existingEntry: { id: string; roster_data: unknown; budget_remaining: number } | null = null;
    let carryoverBudget = 0;

    if (userId) {
        // The current-entry lookup and the carry-over (previous-entry) lookup are
        // independent — fetch them concurrently.
        const completedTournaments = SEASON_2026
            .filter(t => getLockTime(t) <= now && t.id !== tournament.id)
            .sort((a, b) => getLockTime(b).getTime() - getLockTime(a).getTime()); // most recent first
        const previousTournamentId = completedTournaments[0]?.id;

        const [currentRes, prevRes] = await Promise.all([
            supabaseAdmin
                .from('entries')
                .select('id, roster_data, budget_remaining')
                .eq('user_id', userId)
                .eq('tournament_id', tournament.id)
                .maybeSingle(),
            previousTournamentId
                ? supabaseAdmin
                    .from('entries')
                    .select('budget_remaining')
                    .eq('user_id', userId)
                    .eq('tournament_id', previousTournamentId)
                    .maybeSingle()
                : Promise.resolve({ data: null }),
        ]);

        existingEntry = currentRes.data ?? null;
        if (prevRes.data) {
            // budget_remaining is saved as Math.max(0, …) so it's always non-negative.
            carryoverBudget = Math.max(0, (prevRes.data as { budget_remaining: number }).budget_remaining);
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
                courseDerived={courseDerived}
                isPremium={isPremium}
            />
        </main>
    );
}
