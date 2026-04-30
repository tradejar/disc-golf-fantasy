import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { syncRegistrations } from '@/lib/registrations-sync';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes — global, all users share it

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

interface AppStateRow {
    last_registrations_refresh_at: string | null;
    last_registrations_refresh_by: string | null;
}

/**
 * GET — return cooldown status without triggering a refresh.
 * Used by the draft page to render the button's disabled state on load.
 */
export async function GET() {
    const { data } = await supabase
        .from('app_state')
        .select('last_registrations_refresh_at')
        .eq('id', 1)
        .maybeSingle<Pick<AppStateRow, 'last_registrations_refresh_at'>>();

    const lastAt = data?.last_registrations_refresh_at ? new Date(data.last_registrations_refresh_at).getTime() : 0;
    const nextAllowedAt = lastAt + COOLDOWN_MS;
    const now = Date.now();
    const onCooldown = now < nextAllowedAt;

    return NextResponse.json({
        on_cooldown: onCooldown,
        next_allowed_at: new Date(nextAllowedAt).toISOString(),
        seconds_remaining: onCooldown ? Math.ceil((nextAllowedAt - now) / 1000) : 0,
    });
}

/**
 * POST — trigger a manual refresh from the draft page.
 * Server-enforces a global 30-minute cooldown across all users so
 * one click blocks everyone else (prevents abuse and rate-limits PDGA hits).
 */
export async function POST() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Cooldown check ────────────────────────────────────────────────────
    const { data: state } = await supabase
        .from('app_state')
        .select('last_registrations_refresh_at, last_registrations_refresh_by')
        .eq('id', 1)
        .maybeSingle<AppStateRow>();

    const lastAt = state?.last_registrations_refresh_at ? new Date(state.last_registrations_refresh_at).getTime() : 0;
    const nextAllowedAt = lastAt + COOLDOWN_MS;
    const now = Date.now();

    if (now < nextAllowedAt) {
        return NextResponse.json({
            error: 'cooldown',
            message: 'Registrations were refreshed recently. Try again shortly.',
            next_allowed_at: new Date(nextAllowedAt).toISOString(),
            seconds_remaining: Math.ceil((nextAllowedAt - now) / 1000),
        }, { status: 429 });
    }

    // ── Claim the slot BEFORE running the sync ────────────────────────────
    // The pre-check above (now < nextAllowedAt) handles the cooldown case.
    // For the rare race where two clicks pass that check simultaneously,
    // we accept a tiny double-fire — the cost is one extra PDGA fetch,
    // and syncRegistrations is idempotent (upserts).
    const claimAt = new Date().toISOString();
    const { error: claimErr } = await supabase
        .from('app_state')
        .update({
            last_registrations_refresh_at: claimAt,
            last_registrations_refresh_by: userId,
        })
        .eq('id', 1);

    if (claimErr) {
        console.error('Cooldown claim failed:', claimErr);
        return NextResponse.json({
            error: 'Internal error',
            message: `Cooldown claim failed: ${claimErr.message}`,
        }, { status: 500 });
    }

    // ── Run the actual sync ───────────────────────────────────────────────
    try {
        const result = await syncRegistrations();
        return NextResponse.json({
            ...result,
            next_allowed_at: new Date(Date.now() + COOLDOWN_MS).toISOString(),
        });
    } catch (e) {
        const msg = (e as Error)?.message || 'Refresh failed';
        console.error('Manual refresh error:', msg);
        // We still consume the cooldown — preventing rapid retries on PDGA failure
        // is the whole point. The error message tells the user to wait.
        return NextResponse.json({
            error: 'sync_failed',
            message: msg,
            next_allowed_at: new Date(Date.now() + COOLDOWN_MS).toISOString(),
        }, { status: 502 });
    }
}
