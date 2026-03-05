import { getPlayersWithPrices } from '@/lib/player-service';
import DraftClient from '@/components/DraftClient';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { calculatePrice } from '@/lib/pricing';
import { Player } from '@/data/mock-schema';

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

    let players: Player[];

    if (registrations && registrations.length > 0) {
        // Dynamic pool from DB — the source of truth
        players = registrations.map(r => ({
            id: String(r.pdga_number),
            firstName: r.first_name as string,
            lastName: r.last_name as string,
            rating: r.rating as number,
            division: r.division as 'MPO' | 'FPO',
            pdgaNumber: r.pdga_number as number,
            price: calculatePrice(r.rating as number, r.division as 'MPO' | 'FPO'),
            tier: 'A' as const,
        })).sort((a, b) => b.rating - a.rating);
    } else {
        // Fallback: cron hasn't run yet — use static list (unfiltered)
        players = getPlayersWithPrices();
    }

    // Fetch the user's existing entry so DraftClient can pre-populate picks
    // and track entryId — prevents duplicate inserts on re-save
    const { userId } = await auth();
    let existingEntry: { id: string; roster_data: unknown; budget_remaining: number } | null = null;

    if (userId) {
        const { data } = await supabaseAdmin
            .from('entries')
            .select('id, roster_data, budget_remaining')
            .eq('user_id', userId)
            .eq('tournament_id', tournament.id)
            .maybeSingle();
        existingEntry = data ?? null;
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
            />
        </main>
    );
}
