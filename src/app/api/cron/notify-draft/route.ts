import { unsubscribeUrl } from '@/lib/unsubscribe';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { Resend } from 'resend';

export const maxDuration = 60;

function buildEmailHtml(opts: {
    tournamentName: string;
    lockTimeDisplay: string;
    draftUrl: string;
    displayName?: string;
    urgency: 'day' | 'soon'; // 'day' = 24h, 'soon' = 4h
    unsubscribeUrl: string;
}): string {
    const { tournamentName, lockTimeDisplay, draftUrl, displayName, urgency, unsubscribeUrl } = opts;
    const name = displayName ?? 'there';
    const shortName = tournamentName.replace(/^2026\s/, '');
    const headline = urgency === 'soon' ? '⚠️ Draft closes in ~4 hours' : 'Draft closes tomorrow';
    const headerGradient = urgency === 'soon'
        ? 'linear-gradient(135deg,#dc2626,#ea580c)'
        : 'linear-gradient(135deg,#3b82f6,#6366f1)';
    const closingMsg = urgency === 'soon'
        ? `<strong>Don't miss it</strong> — if you don't draft, we'll auto-draft a team for you (free users: $850 cap, premium: $950+).</p>`
        : `If you've already submitted your draft, you can ignore this.</p>`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="background:#0f172a;font-family:Inter,Helvetica,Arial,sans-serif;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden">
        <tr><td style="background:${headerGradient};padding:28px 32px;text-align:center">
          <div style="font-size:2rem;margin-bottom:8px">🥏</div>
          <h1 style="color:white;margin:0;font-size:1.4rem;font-weight:900;letter-spacing:-0.5px">${headline}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <p style="color:#94a3b8;margin:0 0 16px;font-size:1rem">Hey ${name} 👋</p>
          <p style="color:#e2e8f0;margin:0 0 24px;font-size:1rem;line-height:1.6">
            Your <strong style="color:white">DGPT Fantasy</strong> draft for
            <strong style="color:#38bdf8">${shortName}</strong> locks at
            <strong style="color:white">${lockTimeDisplay}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:24px">
              <a href="${draftUrl}" style="display:inline-block;background:${headerGradient};color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:1rem">
                Draft My Team →
              </a>
            </td></tr>
          </table>
          <p style="color:#475569;margin:0;font-size:0.8rem;line-height:1.5;text-align:center">
            You're receiving this because you have an account on DGPT Fantasy.<br/>
            ${closingMsg}
            <a href="${unsubscribeUrl}" style="color:#475569;text-decoration:underline">Unsubscribe</a>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center">
          <p style="color:#475569;margin:0;font-size:0.75rem">
            DGPT Fantasy &middot; <a href="https://eagly.app" style="color:#38bdf8;text-decoration:none">eagly.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const now = new Date();

    // Two notification windows:
    // -1  = "24h" reminder  (tournament locks in 23–25h)
    // -2  = "4h"  reminder  (tournament locks in 3.5–4.5h)
    type Window = { label: string; sentinel: number; start: number; end: number; urgency: 'day' | 'soon' };
    const WINDOWS: Window[] = [
        { label: '24h',  sentinel: -1, start: 23 * 3600 * 1000,   end: 25 * 3600 * 1000,   urgency: 'day'  },
        { label: '4h',   sentinel: -2, start: 3.5 * 3600 * 1000,  end: 4.5 * 3600 * 1000,  urgency: 'soon' },
    ];

    const results: { tournament: string; window: string; sent: number; errors: number }[] = [];

    // Notifiable profiles are identical for every window/tournament — fetch once,
    // and push the unsubscribe filter into the query (IS NOT TRUE keeps nulls).
    const { data: notifiableProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email, display_name, email_unsubscribed')
        .not('email', 'is', null)
        .not('email_unsubscribed', 'is', true);

    for (const window of WINDOWS) {
        const windowStart = new Date(now.getTime() + window.start);
        const windowEnd   = new Date(now.getTime() + window.end);

        const upcoming = SEASON_2026.filter(t => {
            const lock = getLockTime(t);
            return lock >= windowStart && lock <= windowEnd;
        });

        for (const tournament of upcoming) {
            // Check we haven't already sent this window's notification
            const { data: alreadySent } = await supabaseAdmin
                .from('notified_rounds')
                .select('id')
                .eq('tournament_id', tournament.id)
                .eq('round_number', window.sentinel)
                .maybeSingle();

            if (alreadySent) continue;

            const lockTime = getLockTime(tournament);
            const lockTimeDisplay = lockTime.toLocaleString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric',
                hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short',
            });
            const draftUrl = `https://eagly.app/draft/${tournament.id}`;

            if (!notifiableProfiles?.length) continue;

            // Exclude users who already drafted this tournament.
            const { data: existingEntries } = await supabaseAdmin
                .from('entries')
                .select('user_id')
                .eq('tournament_id', tournament.id)
                .limit(10000);

            const draftedUserIds = new Set((existingEntries ?? []).map((e: any) => e.user_id));
            const toNotify = notifiableProfiles.filter((p: any) =>
                !draftedUserIds.has(p.id) && p.email
            );

            let sent = 0;
            let errors = 0;

            for (const profile of toNotify) {
                const { error: sendError } = await resend.emails.send({
                    from: 'DGPT Fantasy <noreply@eagly.app>',
                    to: profile.email,
                    subject: window.urgency === 'soon'
                        ? `⚠️ Draft closes in ~4 hours — ${tournament.name.replace(/^2026\s/, '')}`
                        : `⏰ Draft closes tomorrow — ${tournament.name.replace(/^2026\s/, '')}`,
                    html: buildEmailHtml({
                        tournamentName: tournament.name,
                        lockTimeDisplay,
                        draftUrl,
                        displayName: profile.display_name ?? undefined,
                        urgency: window.urgency,
                        unsubscribeUrl: unsubscribeUrl(profile.id),
                    }),
                });
                if (sendError) {
                    console.error(`notify-draft(${window.label}): Resend error for ${profile.email}:`, sendError);
                    errors++;
                } else {
                    sent++;
                }
                // Resend rate limit: 5 req/sec — wait 250ms between sends
                await new Promise(r => setTimeout(r, 250));
            }

            // Mark this window as sent
            await supabaseAdmin.from('notified_rounds').insert({
                tournament_id: tournament.id,
                round_number: window.sentinel,
                notified_at: now.toISOString(),
            });

            results.push({ tournament: tournament.name, window: window.label, sent, errors });
        }
    }

    return NextResponse.json({ ok: true, results: results.length ? results : [{ message: 'No tournaments in notification windows.' }] });
}
