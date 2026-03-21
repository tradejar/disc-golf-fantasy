import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export async function POST(req: Request) {
    try {
        // 1. Authenticate with Clerk
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log("DEBUG: Full Clerk user payload:", {
            id: user.id,
            imageUrl: user.imageUrl,
            hasImage: user.hasImage,
            firstName: user.firstName,
            email: user.emailAddresses[0]?.emailAddress
        });

        // 2. Parse Body
        const body = await req.json();
        const { roster, budgetRemaining, tournamentId } = body;

        if (!body.entryId && (!roster || roster.length === 0)) {
            return NextResponse.json({ error: 'Invalid roster' }, { status: 400 });
        }

        // ── Draft rule validation (only applies to new entries, not simulation updates) ──
        if (!body.entryId && tournamentId) {
            const now = new Date();

            // Rule 1: next event only AND enforce time-lock
            const tournament = SEASON_2026.find(t => t.id === tournamentId);
            if (!tournament) {
                return NextResponse.json({ error: 'Tournament not found' }, { status: 400 });
            }

            if (now >= getLockTime(tournament)) {
                return NextResponse.json(
                    { error: 'Drafts for this tournament are locked and can no longer be edited.' },
                    { status: 403 }
                );
            }

            const nextTournament = SEASON_2026.find(t => getLockTime(t) > now);
            if (!nextTournament || nextTournament.id !== tournamentId) {
                return NextResponse.json(
                    { error: 'You can only submit a draft for the next upcoming tournament.' },
                    { status: 400 }
                );
            }

            // Rule 2: registered players only
            // Fetch registrations — skip check if none scraped yet (avoids blocking early drafters)
            const { data: registrations } = await supabaseAdmin
                .from('tournament_registrations')
                .select('pdga_number')
                .eq('tournament_id', tournamentId);

            if (registrations && registrations.length > 0) {
                const registeredSet = new Set(registrations.map(r => r.pdga_number));
                const unregistered = (roster as { pdgaNumber?: number }[])
                    .filter(p => p.pdgaNumber && !registeredSet.has(p.pdgaNumber))
                    .map(p => p.pdgaNumber);

                if (unregistered.length > 0) {
                    return NextResponse.json(
                        { error: `Roster contains players not registered for this tournament: ${unregistered.join(', ')}` },
                        { status: 400 }
                    );
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────────────────

        // 3. Ensure User Exists in Supabase 'profiles'
        // We update it every time to keep email/name in sync
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: user.emailAddresses[0]?.emailAddress,
                display_name: user.firstName ? `${user.firstName} ${user.lastName}` : 'Anonymous',
                avatar_url: user.imageUrl || null,
            });

        if (profileError) {
            console.error('Profile Error:', profileError);
            return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
        }

        // 4. Create/Update Entry
        if (body.entryId) {
            // Update existing entry with simulation results.
            // CRITICAL FIX: Ensure user_id matches to prevent IDOR
            const { data, error: updateError } = await supabaseAdmin
                .from('entries')
                .update({
                    total_points: body.totalPoints,
                    tournament_rank: body.tournamentRank,
                    breakdown_data: body.breakdownData
                })
                .eq('id', body.entryId)
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) {
                console.error('Update Error:', updateError);
                return NextResponse.json({ error: 'Failed to update entry or unauthorized' }, { status: 500 });
            }
            return NextResponse.json({ success: true, entry: data });
        } else {
            // Insert or Update entry (Roster changes)
            // Utilizes the new unique constraint on (user_id, tournament_id) 
            // to perform an atomic upsert, eliminating race conditions from double-clicks.
            const { data, error: upsertError } = await supabaseAdmin
                .from('entries')
                .upsert(
                    {
                        user_id: userId,
                        tournament_id: tournamentId,
                        roster_data: roster,
                        budget_remaining: Math.max(0, budgetRemaining),
                        total_points: null,
                        tournament_rank: null,
                        breakdown_data: null
                    },
                    { onConflict: 'user_id, tournament_id' }
                )
                .select()
                .single();

            if (upsertError) {
                console.error('Entry Upsert Error:', upsertError);
                return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
            }
            return NextResponse.json({ success: true, entry: data });
        }

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
