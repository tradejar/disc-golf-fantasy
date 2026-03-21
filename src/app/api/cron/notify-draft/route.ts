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
}): string {
    const { tournamentName, lockTimeDisplay, draftUrl, displayName } = opts;
    const name = displayName ?? 'there';
    const shortName = tournamentName.replace(/^2026\s/, '');
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="background:#0f172a;font-family:Inter,Helvetica,Arial,sans-serif;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:28px 32px;text-align:center">
          <div style="font-size:2rem;margin-bottom:8px">🥏</div>
          <h1 style="color:white;margin:0;font-size:1.4rem;font-weight:900;letter-spacing:-0.5px">Draft closes soon</h1>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <p style="color:#94a3b8;margin:0 0 16px;font-size:1rem;line-height:1.6">Hey ${name} 👋</p>
          <p style="color:#e2e8f0;margin:0 0 24px;font-size:1rem;line-height:1.6">
            Your <strong style="color:white">DGPT Fantasy</strong> draft for
            <strong style="color:#38bdf8">${shortName}</strong> locks at
            <strong style="color:white">${lockTimeDisplay}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:24px">
              <a href="${draftUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:1rem">
                Draft My Team →
              </a>
            </td></tr>
          </table>
          <p style="color:#475569;margin:0;font-size:0.8rem;line-height:1.5;text-align:center">
            You're receiving this because you have an account on DGPT Fantasy.<br/>
            If you've already submitted your draft, you can ignore this.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #334155;text-align:center">
          <p style="color:#475569;margin:0;font-size:0.75rem">
            DGPT Fantasy &middot; <a href="https://disc-golf-fantasy.vercel.app" style="color:#38bdf8;text-decoration:none">disc-golf-fantasy.vercel.app</a>
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
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const now = new Date();

    // Find tournaments locking in the next 23–25 hours
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcoming = SEASON_2026.filter(t => {
        const lock = getLockTime(t);
        return lock >= windowStart && lock <= windowEnd;
    });

    if (upcoming.length === 0) {
        return NextResponse.json({ ok: true, message: 'No tournaments locking in next 24h.' });
    }

    const results: { tournament: string; sent: number; errors: number }[] = [];

    for (const tournament of upcoming) {
        const lockTime = getLockTime(tournament);
        const lockTimeDisplay = lockTime.toLocaleString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short',
        });
        const draftUrl = `https://disc-golf-fantasy.vercel.app/draft/${tournament.id}`;

        const { data: profiles, error: profilesErr } = await supabaseAdmin
            .from('profiles')
            .select('id, email, display_name')
            .not('email', 'is', null);

        if (profilesErr || !profiles?.length) {
            results.push({ tournament: tournament.name, sent: 0, errors: 1 });
            continue;
        }

        // Exclude users who already have an entry for this tournament
        const { data: existingEntries } = await supabaseAdmin
            .from('entries')
            .select('user_id')
            .eq('tournament_id', tournament.id);

        const draftedUserIds = new Set((existingEntries ?? []).map((e: any) => e.user_id));
        const toNotify = profiles.filter((p: any) => !draftedUserIds.has(p.id) && p.email);

        let sent = 0;
        let errors = 0;

        for (const profile of toNotify) {
            try {
                const html = buildEmailHtml({
                    tournamentName: tournament.name,
                    lockTimeDisplay,
                    draftUrl,
                    displayName: profile.display_name ?? undefined,
                });

                await resend.emails.send({
                    from: 'DGPT Fantasy <onboarding@resend.dev>',
                    to: profile.email,
                    subject: `⏰ Draft closes tomorrow — ${tournament.name.replace(/^2026\s/, '')}`,
                    html,
                });
                sent++;
            } catch (e) {
                console.error(`notify-draft: failed for ${profile.email}`, e);
                errors++;
            }
        }

        results.push({ tournament: tournament.name, sent, errors });
        console.log(`notify-draft: ${tournament.name} → ${sent} sent, ${errors} errors`);
    }

    return NextResponse.json({ ok: true, results });
}
