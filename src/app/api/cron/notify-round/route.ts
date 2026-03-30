import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { Resend } from 'resend';

export const maxDuration = 60;

function buildRoundEmailHtml(opts: {
    displayName?: string;
    tournamentName: string;
    roundNumber: number;
    players: { name: string; points: number; division: string }[];
    totalRoundPoints: number;
    leaderboardUrl: string;
    unsubscribeUrl: string;
}): string {
    const { displayName, tournamentName, roundNumber, players, totalRoundPoints, leaderboardUrl, unsubscribeUrl } = opts;
    const name = displayName ?? 'there';
    const shortName = tournamentName.replace(/^2026\s/, '');
    const sign = totalRoundPoints >= 0 ? '+' : '';
    const rows = players.map(p => {
        const pts = p.points >= 0 ? `+${p.points.toFixed(1)}` : p.points.toFixed(1);
        const color = p.points > 0 ? '#4ade80' : p.points < 0 ? '#f87171' : '#94a3b8';
        return `<tr><td style="padding:8px 0;color:#e2e8f0;font-size:0.9rem">${p.name} <span style="color:#64748b;font-size:0.75rem">${p.division}</span></td><td style="padding:8px 0;text-align:right;font-weight:700;color:${color}">${pts} pts</td></tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="background:#0f172a;font-family:Inter,Helvetica,Arial,sans-serif;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:24px 32px;text-align:center">
          <div style="font-size:2rem;margin-bottom:6px">🥏</div>
          <h1 style="color:white;margin:0;font-size:1.3rem;font-weight:900;letter-spacing:-0.5px">Round ${roundNumber} complete</h1>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:0.85rem">${shortName}</p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <p style="color:#94a3b8;margin:0 0 16px;font-size:1rem">Hey ${name} 👋</p>
          <p style="color:#e2e8f0;margin:0 0 20px;font-size:0.95rem;line-height:1.6">
            Here's how your roster performed in Round ${roundNumber}:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #334155">
            ${rows}
            <tr><td colspan="2" style="padding:12px 0;border-top:1px solid #334155"></td></tr>
            <tr>
              <td style="color:#f8fafc;font-weight:700;font-size:1rem">Round total</td>
              <td style="text-align:right;font-weight:900;font-size:1.2rem;color:${totalRoundPoints >= 0 ? '#4ade80' : '#f87171'}">${sign}${totalRoundPoints.toFixed(1)} pts</td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
            <tr><td align="center">
              <a href="${leaderboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8,#7c3aed);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:0.95rem">
                View Leaderboard →
              </a>
            </td></tr>
          </table>
          <p style="color:#475569;margin:20px 0 0;font-size:0.78rem;text-align:center;line-height:1.5">
            You're receiving this because you have a drafted team in DGPT Fantasy.<br/>
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

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const now = new Date();

    // Find currently active tournaments (locked, not yet complete)
    const activeTournaments = SEASON_2026.filter(t => {
        const lock = getLockTime(t);
        const endPlus = new Date(t.endDate);
        endPlus.setUTCDate(endPlus.getUTCDate() + 1);
        endPlus.setUTCHours(23, 59, 59, 999);
        return lock <= now && now <= endPlus;
    });

    if (activeTournaments.length === 0) {
        return NextResponse.json({ ok: true, message: 'No active tournaments.' });
    }

    const results: Record<string, { notified: number; errors: number; skipped: string }> = {};

    for (const tournament of activeTournaments) {
        const tId = tournament.id;
        results[tId] = { notified: 0, errors: 0, skipped: '' };

        // Find the highest completed round
        const { data: roundData } = await supabaseAdmin
            .from('player_stats')
            .select('round_number')
            .eq('tournament_id', tId)
            .order('round_number', { ascending: false })
            .limit(1);

        const latestRound = roundData?.[0]?.round_number;
        if (!latestRound) { results[tId].skipped = 'no round data yet'; continue; }

        // Fetch all entries for this tournament (need roster_data for player check)
        const { data: entries } = await supabaseAdmin
            .from('entries')
            .select('user_id, roster_data, breakdown_data')
            .eq('tournament_id', tId)
            .not('breakdown_data', 'is', null);

        if (!entries?.length) { results[tId].skipped = 'no scored entries'; continue; }

        // Wait for 100% of players actually in fantasy rosters to have scores —
        // not all registered players (some may withdraw mid-round).
        const allDraftedPdgaNums = [...new Set(
            entries.flatMap(e => (e.roster_data as any[]).map((p: any) => p.pdgaNumber).filter(Boolean))
        )];

        const { count: scoredCount } = await supabaseAdmin
            .from('player_stats')
            .select('*', { count: 'exact', head: true })
            .eq('tournament_id', tId)
            .eq('round_number', latestRound)
            .in('pdga_number', allDraftedPdgaNums);

        if ((scoredCount ?? 0) < allDraftedPdgaNums.length) {
            results[tId].skipped = `${allDraftedPdgaNums.length - (scoredCount ?? 0)} drafted players still missing round ${latestRound} score`;
            continue;
        }

        // Check if we already sent notifications for this round
        const { data: alreadySent } = await supabaseAdmin
            .from('notified_rounds')
            .select('id')
            .eq('tournament_id', tId)
            .eq('round_number', latestRound)
            .maybeSingle();

        if (alreadySent) { results[tId].skipped = `round ${latestRound} already notified`; continue; }

        // Fetch profiles — exclude unsubscribed users
        const userIds = entries.map(e => e.user_id);
        const { data: profilesRaw } = await supabaseAdmin
            .from('profiles')
            .select('id, email, display_name')
            .in('id', userIds)
            .not('email', 'is', null);

        const profiles = (profilesRaw ?? []).filter((p: any) => !p.email_unsubscribed);

        const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

        // Fetch round stats for each player in each entry
        const allPdgaNums = [...new Set(
            entries.flatMap(e => (e.roster_data as any[]).map((p: any) => p.pdgaNumber).filter(Boolean))
        )];

        const { data: roundStats } = await supabaseAdmin
            .from('player_stats')
            .select('pdga_number, fantasy_points, round_number')
            .eq('tournament_id', tId)
            .eq('round_number', latestRound)
            .in('pdga_number', allPdgaNums);

        const statsMap = new Map(
            (roundStats ?? []).map(s => [s.pdga_number, s.fantasy_points ?? 0])
        );

        // Send email to each user
        for (const entry of entries) {
            const profile = profileMap.get(entry.user_id);
            if (!profile?.email) continue;

            const roster = (entry.roster_data as any[]) ?? [];
            const players = roster.map((p: any) => ({
                name: `${p.firstName} ${p.lastName}`,
                division: p.division ?? '',
                points: statsMap.get(p.pdgaNumber) ?? 0,
            }));
            const totalRoundPoints = players.reduce((s, p) => s + p.points, 0);

            try {
                await resend.emails.send({
                    from: 'DGPT Fantasy <noreply@eagly.app>',
                    to: profile.email,
                    subject: `🥏 Round ${latestRound} results — ${tournament.name.replace(/^2026\s/, '')}`,
                    html: buildRoundEmailHtml({
                        displayName: profile.display_name ?? undefined,
                        tournamentName: tournament.name,
                        roundNumber: latestRound,
                        players,
                        totalRoundPoints,
                        leaderboardUrl: 'https://eagly.app/leaderboard',
                        unsubscribeUrl: `https://eagly.app/api/unsubscribe?uid=${profile.id}`,
                    }),
                });
                results[tId].notified++;
            } catch (e) {
                console.error(`notify-round: failed for ${profile.email}`, e);
                results[tId].errors++;
            }
        }

        // Mark round as notified to prevent re-sending
        await supabaseAdmin.from('notified_rounds').insert({
            tournament_id: tId,
            round_number: latestRound,
            notified_at: now.toISOString(),
        });
    }

    return NextResponse.json({ ok: true, results });
}
