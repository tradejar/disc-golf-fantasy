import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { getPlayersWithPrices } from '@/lib/player-service';
import { Player } from '@/data/mock-schema';

export const maxDuration = 60;

// Option B: auto-draft runs for ALL users.
// Budget is tiered: free = $850 (penalty), premium = $950 + carryover from previous tournament.
const BUDGET_FREE = 850;
const BUDGET_PREMIUM = 950;
const SLOTS_MPO = 4;
const SLOTS_FPO = 2;

/**
 * Picks a random valid roster (4 MPO + 2 FPO) within the budget.
 * Uses a tier-spread approach: pick from different price bands so the
 * team feels realistic, not just all-elites or all-cheapest.
 */
function generateAutoDraft(players: Player[], budgetCap: number): Player[] | null {
    const mpo = players.filter(p => p.division === 'MPO');
    const fpo = players.filter(p => p.division === 'FPO');

    // Shuffle helper
    const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    // Try up to 50 random attempts; the tier-spread maximises budget fit
    for (let attempt = 0; attempt < 50; attempt++) {
        // Price tiers for MPO
        const mpoT1 = shuffle(mpo.filter(p => p.price >= 180));
        const mpoT2 = shuffle(mpo.filter(p => p.price >= 160 && p.price < 180));
        const mpoT3 = shuffle(mpo.filter(p => p.price >= 130 && p.price < 160));
        const mpoT4 = shuffle(mpo.filter(p => p.price < 130));

        // Pick 1 from T1, 1 from T2, 1 from T3, 1 from any (spreads budget)
        const mpoPool = [...mpoT1.slice(0, 3), ...mpoT2.slice(0, 3), ...mpoT3.slice(0, 3), ...mpoT4.slice(0, 3)];
        const pickedMpo = shuffle(mpoPool).slice(0, SLOTS_MPO);
        if (pickedMpo.length < SLOTS_MPO) continue;

        // Price tiers for FPO
        const fpoAll = shuffle(fpo);
        const pickedFpo = fpoAll.slice(0, SLOTS_FPO);
        if (pickedFpo.length < SLOTS_FPO) continue;

        const total = [...pickedMpo, ...pickedFpo].reduce((s, p) => s + p.price, 0);
        if (total <= budgetCap) {
            return [...pickedMpo, ...pickedFpo];
        }
    }

    // Fallback: cheapest valid combo
    const cheapMpo = mpo.sort((a, b) => a.price - b.price).slice(0, SLOTS_MPO);
    const cheapFpo = fpo.sort((a, b) => a.price - b.price).slice(0, SLOTS_FPO);
    const total = [...cheapMpo, ...cheapFpo].reduce((s, p) => s + p.price, 0);
    return total <= budgetCap ? [...cheapMpo, ...cheapFpo] : null;
}

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        // Same pattern as ingest: only enforce secret when it's actually configured
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const players = getPlayersWithPrices();

        // ?force=<tournamentId> bypasses the 24h time window — for testing/simulation only
        const { searchParams } = new URL(request.url);
        const forceTournId = searchParams.get('force');

        let recentlyLocked: typeof SEASON_2026;

        if (forceTournId) {
            const forceTournament = SEASON_2026.find(t => t.id === forceTournId);
            if (!forceTournament) {
                return NextResponse.json({ error: `Unknown tournament: ${forceTournId}` }, { status: 400 });
            }
            console.log(`Auto-draft FORCE mode for tournament: ${forceTournament.name}`);
            recentlyLocked = [forceTournament];
        } else {
            const candidates: typeof SEASON_2026 = [];

            for (const t of SEASON_2026) {
                const lock = getLockTime(t);
                const msSinceLock = now.getTime() - lock.getTime();

                // Skip if lock is more than 24h ago or hasn't happened yet
                if (msSinceLock < 0 || msSinceLock > 24 * 60 * 60 * 1000) continue;

                // Check if PDGA live data exists (first card teed off)
                const { data: liveData } = await supabaseAdmin
                    .from('player_stats')
                    .select('id')
                    .eq('tournament_id', t.id)
                    .eq('round_number', 1)
                    .limit(1);

                const isLive = Array.isArray(liveData) && liveData.length > 0;
                const recentlyLockedCheck = msSinceLock <= 2 * 60 * 60 * 1000;

                if (isLive || recentlyLockedCheck) {
                    candidates.push(t);
                }
            }

            recentlyLocked = candidates;
        }

        if (recentlyLocked.length === 0) {
            return NextResponse.json({ message: 'No tournaments ready for auto-draft', checked: now });
        }

        const results: Record<string, { autoDrafted: number; alreadyEntered: number; errors: string[] }> = {};

        for (const tournament of recentlyLocked) {
            const tournamentId = tournament.id;
            results[tournamentId] = { autoDrafted: 0, alreadyEntered: 0, errors: [] };

            // Fetch registered players for this tournament
            // Filter the global player pool to only include confirmed registrants.
            // Fall back to full player list if registrations haven't been scraped yet.
            const { data: registrations } = await supabaseAdmin
                .from('tournament_registrations')
                .select('pdga_number')
                .eq('tournament_id', tournamentId);

            const registeredPdgaNums = new Set((registrations || []).map(r => r.pdga_number));
            const eligiblePlayers = registeredPdgaNums.size > 0
                ? players.filter(p => p.pdgaNumber && registeredPdgaNums.has(p.pdgaNumber))
                : players;

            console.log(`Auto-draft: ${eligiblePlayers.length} eligible players for ${tournamentId} (${registeredPdgaNums.size} registered)`);

            // Get all user profiles
            const { data: profiles, error: profileErr } = await supabaseAdmin
                .from('profiles')
                .select('id');

            if (profileErr || !profiles) {
                results[tournamentId].errors.push('Failed to fetch profiles');
                continue;
            }

            // Get premium users — auto-draft is premium-only
            const { data: premiumRows } = await supabaseAdmin
                .from('user_premium')
                .select('user_id')
                .eq('active', true);
            const premiumUserIds = new Set((premiumRows ?? []).map(r => r.user_id));

            // Get users who already have an entry for this tournament
            // High limit prevents silent truncation at the default Supabase 1000-row cap
            const { data: existingEntries } = await supabaseAdmin
                .from('entries')
                .select('user_id')
                .eq('tournament_id', tournamentId)
                .limit(10000);

            const enteredUserIds = new Set((existingEntries || []).map(e => e.user_id));

            // Only auto-draft users who haven't entered yet (all tiers)
            const usersWithoutEntry = profiles.filter(p => !enteredUserIds.has(p.id));
            results[tournamentId].alreadyEntered = enteredUserIds.size;

            // Batch-fetch carryover budgets from the most recent completed tournament
            // so each user's auto-draft respects their banked carry-in budget.
            const completedTournaments = SEASON_2026
                .filter(t => getLockTime(t) <= now && t.id !== tournamentId)
                .sort((a, b) => getLockTime(b).getTime() - getLockTime(a).getTime());
            const prevTournamentId = completedTournaments[0]?.id;

            const carryoverMap = new Map<string, number>();
            if (prevTournamentId && usersWithoutEntry.length > 0) {
                const { data: prevEntries } = await supabaseAdmin
                    .from('entries')
                    .select('user_id, budget_remaining')
                    .eq('tournament_id', prevTournamentId)
                    .in('user_id', usersWithoutEntry.map(p => p.id));
                for (const e of prevEntries || []) {
                    carryoverMap.set(e.user_id, Math.max(0, e.budget_remaining ?? 0));
                }
            }

            for (const profile of usersWithoutEntry) {
                const isPremiumUser = premiumUserIds.has(profile.id);
                const carryover = isPremiumUser ? (carryoverMap.get(profile.id) ?? 0) : 0;
                const effectiveBudget = (isPremiumUser ? BUDGET_PREMIUM : BUDGET_FREE) + carryover;
                const roster = generateAutoDraft(eligiblePlayers, effectiveBudget);
                if (!roster) {
                    results[tournamentId].errors.push(`Could not generate roster for user ${profile.id}`);
                    continue;
                }

                const budgetRemaining = effectiveBudget - roster.reduce((s, p) => s + p.price, 0);
                // Store tier so the UI can show an upsell message to free users
                const autodraftTier = isPremiumUser ? 'premium' : 'free';

                // Upsert: if user already has an entry for this tournament, do nothing (ignoreDuplicates).
                // This makes the cron idempotent — safe to run every 10 minutes.
                const insertResult = await supabaseAdmin
                    .from('entries')
                    .upsert({
                        user_id: profile.id,
                        tournament_id: tournamentId,
                        roster_data: roster,
                        budget_remaining: budgetRemaining,
                        auto_drafted: true,
                        auto_drafted_tier: autodraftTier,
                        created_at: new Date().toISOString(),
                    }, { onConflict: 'user_id, tournament_id', ignoreDuplicates: true });

                if (insertResult.error) {
                    results[tournamentId].errors.push(`Insert failed for ${profile.id}: ${insertResult.error.message}`);
                } else {
                    results[tournamentId].autoDrafted++;
                }
            }
        }

        return NextResponse.json({ ok: true, tournaments: recentlyLocked.map(t => t.id), results });
    } catch (e: any) {
        console.error('Auto-draft error:', e);
        try {
            const { sendErrorWebhook } = await import('@/lib/webhook');
            await sendErrorWebhook(`Auto-Draft Cron Failed: ${e.message}`);
        } catch (webhookErr) {
            console.error('Failed to send webhook:', webhookErr);
        }
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
