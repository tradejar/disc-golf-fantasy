import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { getRegisteredPlayersForTournament } from '@/lib/player-service';
import { Player } from '@/data/mock-schema';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function buildAutoDraftEmailHtml(opts: {
    displayName?: string;
    tournamentName: string;
    roster: Player[];
    budgetUsed: number;
    effectiveBudget: number;
    isPremium: boolean;
    carryover: number;
    unsubscribeUrl: string;
}): string {
    const { displayName, tournamentName, roster, budgetUsed, effectiveBudget, isPremium, carryover, unsubscribeUrl } = opts;
    const name = displayName ?? 'there';
    const shortName = tournamentName.replace(/^2026\s/, '');
    const mpo = roster.filter(p => p.division === 'MPO');
    const fpo = roster.filter(p => p.division === 'FPO');
    const budgetLabel = isPremium
        ? `$950${carryover > 0 ? ` + $${carryover} carry` : ''} = $${effectiveBudget} (Premium)`
        : `$850 (Free — upgrade for full $950 cap)`;
    const makeRow = (p: Player) =>
        `<tr><td style="padding:7px 0;color:#e2e8f0;font-size:0.9rem">${p.firstName} ${p.lastName} <span style="color:#64748b;font-size:0.75rem">${p.division}</span></td><td style="padding:7px 0;text-align:right;color:#f8fafc;font-weight:600">$${p.price}</td></tr>`;

    const upsellBanner = !isPremium ? `
        <div style="background:#1e3a5f;border:1px solid #3b82f6;border-radius:8px;padding:12px 16px;margin:16px 0;font-size:0.85rem;color:#93c5fd;line-height:1.5">
            ⭐ <strong style="color:#60a5fa">Go Premium</strong> to get the full $950 cap + carry-over budget on future auto-drafts.
        </div>` : '';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="background:#0f172a;font-family:Inter,Helvetica,Arial,sans-serif;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#0f766e,#0369a1);padding:24px 32px;text-align:center">
          <div style="font-size:2rem;margin-bottom:6px">🤖</div>
          <h1 style="color:white;margin:0;font-size:1.3rem;font-weight:900;letter-spacing:-0.5px">We drafted your team</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:0.85rem">${shortName}</p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <p style="color:#94a3b8;margin:0 0 4px">Hey ${name} 👋</p>
          <p style="color:#e2e8f0;margin:0 0 16px;font-size:0.95rem;line-height:1.6">
            You missed the draft window, so we picked a team for you. Here's who you've got:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #334155">
            ${[...mpo, ...fpo].map(makeRow).join('')}
            <tr><td colspan="2" style="padding:8px 0;border-top:1px solid #334155"></td></tr>
            <tr>
              <td style="color:#94a3b8;font-size:0.85rem">Budget used</td>
              <td style="text-align:right;color:#f8fafc;font-weight:700">$${budgetUsed} / $${effectiveBudget}</td>
            </tr>
            <tr>
              <td style="color:#94a3b8;font-size:0.8rem;padding-bottom:8px">${budgetLabel}</td>
              <td></td>
            </tr>
          </table>
          ${upsellBanner}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">
            <tr><td align="center">
              <a href="https://eagly.app/leaderboard" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#0369a1);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:0.95rem">View Leaderboard →</a>
            </td></tr>
          </table>
          <p style="color:#475569;margin:20px 0 0;font-size:0.78rem;text-align:center;line-height:1.5">
            You're receiving this because you missed the draft window for DGPT Fantasy.<br/>
            <a href="${unsubscribeUrl}" style="color:#475569;text-decoration:underline">Unsubscribe</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center">
          <p style="color:#475569;margin:0;font-size:0.75rem">DGPT Fantasy &middot; <a href="https://eagly.app" style="color:#38bdf8;text-decoration:none">eagly.app</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const maxDuration = 60;

// Option B: auto-draft runs for ALL users.
// Budget is tiered: free = $850 (penalty), premium = $950 + carryover from previous tournament.
const BUDGET_FREE = 850;
const BUDGET_PREMIUM = 950;
const SLOTS_MPO = 4;
const SLOTS_FPO = 2;

/**
 * Spend maximizer: after building a valid roster, repeatedly try to upgrade
 * cheaper players to more expensive ones until budget is nearly exhausted.
 * Upgrade order is randomized so users don't all get the same upgrades.
 */
function spendMaximizer(roster: Player[], budgetCap: number, mpo: Player[], fpo: Player[]): Player[] {
    const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
    let improved = true;
    while (improved) {
        improved = false;
        const spent = roster.reduce((s, p) => s + p.price, 0);
        const remaining = budgetCap - spent;
        if (remaining < 5) break;

        for (const player of shuffle([...roster])) {
            const pool = player.division === 'MPO' ? mpo : fpo;
            const rosterIds = new Set(roster.map(p => p.id));
            // Candidates: not already rostered, more expensive, fits in remaining budget
            const upgrades = pool
                .filter(p => !rosterIds.has(p.id) && p.price > player.price && p.price <= player.price + remaining)
                .sort((a, b) => b.price - a.price)
                .slice(0, 4); // top 4 options only → pick one randomly for variety
            if (upgrades.length === 0) continue;
            roster[roster.indexOf(player)] = shuffle(upgrades)[0];
            improved = true;
            break; // restart with updated roster
        }
    }
    return roster;
}

/**
 * Smart auto-draft: quality-pool + jitter approach.
 *
 * MPO (4 slots):
 *   - Mandatory 1 elite pick  (top 20 by price, proxy for rating)
 *   - Mandatory 1 mid pick    (next 30)
 *   - 2 flex picks randomly from the elite+mid combined pool
 *   → guarantees quality while giving every user a unique roster
 *
 * FPO (2 slots):
 *   - Random 2 from top-20 FPO players
 *
 * Spend Maximizer:
 *   - After selection, iteratively swap cheap players for pricier ones
 *     until budget is within $20 of cap. Upgrade order is randomised.
 */
function generateAutoDraft(players: Player[], budgetCap: number): Player[] | null {
    const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    // Sort by price DESC (price is derived from PDGA rating, so best proxy for quality)
    const mpo = [...players.filter(p => p.division === 'MPO')].sort((a, b) => b.price - a.price);
    const fpo = [...players.filter(p => p.division === 'FPO')].sort((a, b) => b.price - a.price);

    if (mpo.length < SLOTS_MPO || fpo.length < SLOTS_FPO) return null;

    // Quality pools
    const mpoElite = mpo.slice(0, 20);          // top 20 MPO
    const mpoMid   = mpo.slice(20, 50);          // next 30 MPO
    const fpoPool  = fpo.slice(0, Math.min(20, fpo.length)); // top 20 FPO

    // Try up to 40 attempts (different random samples each time)
    for (let attempt = 0; attempt < 40; attempt++) {
        // Mandate 1 elite + 1 mid to ensure quality floor
        const elite = shuffle(mpoElite)[0];
        const mid   = shuffle(mpoMid)[0];

        // 2 flex picks from the combined elite+mid pool (excluding mandatories)
        const flexPool = shuffle([...mpoElite, ...mpoMid]).filter(
            p => p.id !== elite.id && p.id !== mid.id
        );
        if (flexPool.length < 2) continue;
        const flex = flexPool.slice(0, 2);

        const pickedMpo = [elite, mid, ...flex];
        const pickedFpo = shuffle(fpoPool).slice(0, SLOTS_FPO);
        if (pickedFpo.length < SLOTS_FPO) continue;

        const total = [...pickedMpo, ...pickedFpo].reduce((s, p) => s + p.price, 0);
        if (total <= budgetCap) {
            // Spend maximizer: push spending close to budget cap
            return spendMaximizer([...pickedMpo, ...pickedFpo], budgetCap, mpo, fpo);
        }
    }

    // Fallback: cheapest valid combo
    const cheapMpo = [...mpo].sort((a, b) => a.price - b.price).slice(0, SLOTS_MPO);
    const cheapFpo = [...fpo].sort((a, b) => a.price - b.price).slice(0, SLOTS_FPO);
    const total = [...cheapMpo, ...cheapFpo].reduce((s, p) => s + p.price, 0);
    return total <= budgetCap ? spendMaximizer([...cheapMpo, ...cheapFpo], budgetCap, mpo, fpo) : null;
}

// ── Permanently blocked user IDs ────────────────────────────────────────────
// These are known secondary accounts for real users who already have an entry
// under their primary account. Blocking them prevents the auto-draft from
// creating duplicate leaderboard entries.
// To add more: find the user_id via the profiles table and append here.
const BLOCKED_AUTO_DRAFT_USER_IDS = new Set([
    'user_3C0HwyNv8fasm4RV4yKa3q4ZJjs', // Vlad Alexandru Corut (Apple login — real account: Ba Roz / vladcorut@gmail.com)
    'user_39zXeIKgchOBKdu7VOKG0S02cRs', // Sabrina (Apple login — real account: Sabrina Cioc / andreeageorgiana.b27@gmail.com)
    'user_3BQlVIYZcZ1862YSJmr0f5MHwNF', // Eli Lester (eliplester@gmail.com — real account: eli@trvln.com)
]);

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');
        // Same pattern as ingest: only enforce secret when it's actually configured
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();

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

            // Build draftable pool from PDGA registrations, priced via the same
            // dynamic-price path as /draft/[id]. ALL_PLAYERS contributes course-fit
            // stats only — registrants without a sidecar entry still get priced.
            const eligiblePlayers = await getRegisteredPlayersForTournament(tournament, now);

            if (eligiblePlayers.length === 0) {
                results[tournamentId].errors.push('No registrations — skipping auto-draft');
                continue;
            }

            console.log(`Auto-draft: ${eligiblePlayers.length} eligible players for ${tournamentId}`);

            // Get all user profiles
            const { data: profiles, error: profileErr } = await supabaseAdmin
                .from('profiles')
                .select('id, email, display_name, email_unsubscribed');

            if (profileErr || !profiles) {
                results[tournamentId].errors.push('Failed to fetch profiles');
                continue;
            }

            // Get premium users — determines budget tier (all users are auto-drafted; premium get higher cap)
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

            // ── Apple private relay duplicate guard ───────────────────────────────
            // "Sign in with Apple" creates a new Clerk user_id every time someone
            // uses it, even if they already have an account via email/Google.
            // These secondary accounts get auto-drafted as if they were new users,
            // creating duplicate leaderboard entries for the same real person.
            // Guard: if a user's email is an Apple private relay address AND there's
            // already an entered user whose display_name starts with the same first
            // name, skip auto-drafting them — they already have an entry.
            const alreadyEnteredNames = new Set(
                profiles
                    .filter(p => enteredUserIds.has(p.id) && p.display_name)
                    .map(p => (p.display_name as string).trim().toLowerCase().split(' ')[0])
            );

            const isAppleRelayDuplicate = (profile: { id: string; email?: string; display_name?: string }) => {
                if (!profile.email?.includes('privaterelay.appleid.com')) return false;
                const firstName = (profile.display_name ?? '').trim().toLowerCase().split(' ')[0];
                return !!firstName && alreadyEnteredNames.has(firstName);
            };

            // Only auto-draft users who haven't entered yet and aren't a known duplicate account
            const usersWithoutEntry = profiles.filter(p =>
                !enteredUserIds.has(p.id) &&
                !BLOCKED_AUTO_DRAFT_USER_IDS.has(p.id) &&
                !isAppleRelayDuplicate(p) &&
                !(p as any).email_unsubscribed
            );

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

                    // Send auto-draft notification if user has email and hasn't unsubscribed
                    if (profile.email && !(profile as any).email_unsubscribed) {
                        const budgetUsed = roster.reduce((s, p) => s + p.price, 0);
                        try {
                            await resend.emails.send({
                                from: 'DGPT Fantasy <noreply@eagly.app>',
                                to: profile.email,
                                subject: `🤖 We auto-drafted your team — ${tournament.name.replace(/^2026\s/, '')}`,
                                html: buildAutoDraftEmailHtml({
                                    displayName: profile.display_name ?? undefined,
                                    tournamentName: tournament.name,
                                    roster,
                                    budgetUsed,
                                    effectiveBudget,
                                    isPremium: isPremiumUser,
                                    carryover,
                                    unsubscribeUrl: `https://eagly.app/api/unsubscribe?uid=${profile.id}`,
                                }),
                            });
                        } catch (emailErr) {
                            console.error(`auto-draft email failed for ${profile.email}`, emailErr);
                        }
                    }
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
