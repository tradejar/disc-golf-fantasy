import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026 } from '@/data/tournaments';
import { Resend } from 'resend';

export const maxDuration = 60;

function buildTournamentEmailHtml(opts: {
    displayName?: string;
    tournamentName: string;
    totalPoints: number;
    tournamentRank: number | null;
    totalEntries: number;
    roster: { name: string; totalPoints: number; division: string }[];
    leagues: { name: string; rank: number; totalMembers: number }[];
    leaderboardUrl: string;
    unsubscribeUrl: string;
}): string {
    const { displayName, tournamentName, totalPoints, tournamentRank, totalEntries, roster, leagues, leaderboardUrl, unsubscribeUrl } = opts;
    const name = displayName ?? 'there';
    const shortName = tournamentName.replace(/^2026\s/, '');
    const rankStr = tournamentRank ? `#${tournamentRank} of ${totalEntries}` : '—';
    const sign = totalPoints >= 0 ? '+' : '';

    const rosterRows = roster
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .map(p => {
            const pts = p.totalPoints >= 0 ? `+${p.totalPoints.toFixed(1)}` : p.totalPoints.toFixed(1);
            const color = p.totalPoints > 0 ? '#4ade80' : p.totalPoints < 0 ? '#f87171' : '#94a3b8';
            return `<tr><td style="padding:7px 0;color:#e2e8f0;font-size:0.9rem">${p.name} <span style="color:#64748b;font-size:0.75rem">${p.division}</span></td><td style="padding:7px 0;text-align:right;font-weight:700;color:${color}">${pts} pts</td></tr>`;
        }).join('');

    const leagueRows = leagues.length > 0
        ? leagues.map(l =>
            `<tr><td style="padding:6px 0;color:#e2e8f0;font-size:0.85rem">${l.name}</td><td style="padding:6px 0;text-align:right;color:#38bdf8;font-weight:700">#${l.rank} of ${l.totalMembers}</td></tr>`
        ).join('')
        : `<tr><td colspan="2" style="padding:6px 0;color:#475569;font-size:0.85rem;font-style:italic">Not in any leagues</td></tr>`;

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="background:#0f172a;font-family:Inter,Helvetica,Arial,sans-serif;margin:0;padding:0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:24px 32px;text-align:center">
          <div style="font-size:2.2rem;margin-bottom:6px">🏆</div>
          <h1 style="color:white;margin:0;font-size:1.3rem;font-weight:900;letter-spacing:-0.5px">Tournament complete</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:0.85rem">${shortName}</p>
        </td></tr>
        <tr><td style="padding:24px 32px">
          <p style="color:#94a3b8;margin:0 0 4px;font-size:1rem">Hey ${name} 👋</p>
          <p style="color:#e2e8f0;margin:0 0 20px;font-size:0.95rem;line-height:1.6">
            The tournament is over — here's your final recap.
          </p>

          <!-- Summary -->
          <div style="background:#0f172a;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;text-align:center">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="text-align:center;padding:0 8px">
                  <div style="color:#94a3b8;font-size:0.75rem;margin-bottom:4px">TOTAL POINTS</div>
                  <div style="color:${totalPoints >= 0 ? '#4ade80' : '#f87171'};font-size:1.6rem;font-weight:900">${sign}${totalPoints.toFixed(1)}</div>
                </td>
                <td style="text-align:center;padding:0 8px;border-left:1px solid #334155">
                  <div style="color:#94a3b8;font-size:0.75rem;margin-bottom:4px">RANK</div>
                  <div style="color:#f8fafc;font-size:1.6rem;font-weight:900">${rankStr}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Roster breakdown -->
          <p style="color:#f8fafc;font-size:0.85rem;font-weight:700;margin:0 0 8px;letter-spacing:0.05em;text-transform:uppercase">Your Roster</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #334155">
            ${rosterRows}
          </table>

          <!-- League standings -->
          <p style="color:#f8fafc;font-size:0.85rem;font-weight:700;margin:20px 0 8px;letter-spacing:0.05em;text-transform:uppercase">League Standings</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #334155">
            ${leagueRows}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
            <tr><td align="center">
              <a href="${leaderboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:0.95rem">
                Full Leaderboard →
              </a>
            </td></tr>
          </table>
          <p style="color:#475569;margin:20px 0 0;font-size:0.78rem;text-align:center;line-height:1.5">
            You're receiving this because you drafted a team in DGPT Fantasy.<br/>
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

    // Tournaments that ended (endDate + 1 day past) but ended within the last 48h
    const completedTournaments = SEASON_2026.filter(t => {
        const end = new Date(t.endDate);
        end.setUTCHours(23, 59, 59, 999);
        const endPlusPlus = new Date(end.getTime() + 48 * 60 * 60 * 1000);
        return now > end && now <= endPlusPlus;
    });

    if (completedTournaments.length === 0) {
        return NextResponse.json({ ok: true, message: 'No recently completed tournaments.' });
    }

    const results: Record<string, { notified: number; errors: number; skipped: string }> = {};

    for (const tournament of completedTournaments) {
        const tId = tournament.id;
        results[tId] = { notified: 0, errors: 0, skipped: '' };

        // Check if we already sent final notifications for this tournament
        const { data: alreadySent } = await supabaseAdmin
            .from('notified_rounds')
            .select('id')
            .eq('tournament_id', tId)
            .eq('round_number', 999) // 999 = tournament final sentinel
            .maybeSingle();

        if (alreadySent) { results[tId].skipped = 'already notified'; continue; }

        // Fetch all scored entries
        const { data: entries } = await supabaseAdmin
            .from('entries')
            .select('user_id, roster_data, total_points, tournament_rank')
            .eq('tournament_id', tId)
            .not('total_points', 'is', null)
            .order('total_points', { ascending: false });

        if (!entries?.length) { results[tId].skipped = 'no scored entries'; continue; }

        const totalEntries = entries.length;
        const userIds = entries.map(e => e.user_id);

        // Fetch profiles
        const { data: profilesRaw } = await supabaseAdmin
            .from('profiles')
            .select('id, email, display_name, email_unsubscribed')
            .in('id', userIds)
            .not('email', 'is', null);

        // Filter unsubscribed in JS so the query doesn't break if the column doesn't exist yet
        const profiles = (profilesRaw ?? []).filter((p: any) => !p.email_unsubscribed);

        const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));

        // Fetch all league memberships + league names for these users
        const { data: memberships } = await supabaseAdmin
            .from('league_members')
            .select('user_id, league_id, leagues(id, name, tournament_ids)')
            .in('user_id', userIds);

        // Build a map: userId → [{leagueName, rank, totalMembers}]
        const leagueMap = new Map<string, { name: string; rank: number; totalMembers: number }[]>();

        if (memberships?.length) {
            // Get unique league IDs
            const leagueIds = [...new Set(memberships.map((m: any) => m.league_id))];

            // For each league, compute each member's total season points
            for (const leagueId of leagueIds) {
                const leagueMemberships = memberships.filter((m: any) => m.league_id === leagueId);
                const leagueName = (leagueMemberships[0] as any)?.leagues?.name ?? 'League';
                const leagueMemberIds = leagueMemberships.map((m: any) => m.user_id);

                // Fetch all entries for this league's tournaments for ranking
                const leagueTournamentIds: string[] = (leagueMemberships[0] as any)?.leagues?.tournament_ids ?? SEASON_2026.map(t => t.id);
                const { data: leagueEntries } = await supabaseAdmin
                    .from('entries')
                    .select('user_id, total_points')
                    .in('tournament_id', leagueTournamentIds)
                    .in('user_id', leagueMemberIds)
                    .not('total_points', 'is', null);

                // Aggregate total points per user
                const leaguePoints = new Map<string, number>();
                for (const e of leagueEntries ?? []) {
                    leaguePoints.set(e.user_id, (leaguePoints.get(e.user_id) ?? 0) + (e.total_points ?? 0));
                }

                const ranked = [...leaguePoints.entries()]
                    .sort((a, b) => b[1] - a[1]);

                ranked.forEach(([uid], idx) => {
                    if (!leagueMap.has(uid)) leagueMap.set(uid, []);
                    leagueMap.get(uid)!.push({ name: leagueName, rank: idx + 1, totalMembers: ranked.length });
                });
            }
        }

        // Fetch player round stats for roster breakdown (cumulative)
        const allPdgaNums = [...new Set(
            entries.flatMap(e => (e.roster_data as any[]).map((p: any) => p.pdgaNumber).filter(Boolean))
        )];

        const { data: allStats } = await supabaseAdmin
            .from('player_stats')
            .select('pdga_number, fantasy_points')
            .eq('tournament_id', tId)
            .in('pdga_number', allPdgaNums);

        // Sum per player across all rounds
        const playerTotals = new Map<number, number>();
        for (const s of allStats ?? []) {
            playerTotals.set(s.pdga_number, (playerTotals.get(s.pdga_number) ?? 0) + (s.fantasy_points ?? 0));
        }

        // Send final email to each user
        for (const entry of entries) {
            const profile = profileMap.get(entry.user_id);
            if (!profile?.email) continue;

            const roster = (entry.roster_data as any[]).map((p: any) => ({
                name: `${p.firstName} ${p.lastName}`,
                division: p.division ?? '',
                totalPoints: playerTotals.get(p.pdgaNumber) ?? 0,
            }));

            try {
                await resend.emails.send({
                    from: 'DGPT Fantasy <noreply@eagly.app>',
                    to: profile.email,
                    subject: `🏆 Final results — ${tournament.name.replace(/^2026\s/, '')}`,
                    html: buildTournamentEmailHtml({
                        displayName: profile.display_name ?? undefined,
                        tournamentName: tournament.name,
                        totalPoints: entry.total_points ?? 0,
                        tournamentRank: entry.tournament_rank,
                        totalEntries,
                        roster,
                        leagues: leagueMap.get(entry.user_id) ?? [],
                        leaderboardUrl: 'https://eagly.app/leaderboard',
                        unsubscribeUrl: `https://eagly.app/api/unsubscribe?uid=${profile.id}`,
                    }),
                });
                results[tId].notified++;
            } catch (e) {
                console.error(`notify-tournament: failed for ${profile.email}`, e);
                results[tId].errors++;
            }
        }

        // Mark tournament as fully notified (round 999 = final sentinel)
        await supabaseAdmin.from('notified_rounds').insert({
            tournament_id: tId,
            round_number: 999,
            notified_at: now.toISOString(),
        });
    }

    return NextResponse.json({ ok: true, results });
}
