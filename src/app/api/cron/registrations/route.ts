import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export const maxDuration = 60;
export const revalidate = 0;

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── Types ────────────────────────────────────────────────────────────────────
interface RegistrationRow {
    tournament_id: string;
    pdga_number: number;
    player_name: string;
    first_name: string;
    last_name: string;
    division: 'MPO' | 'FPO';
    rating: number | null;
}

/**
 * Parse registration table from PDGA event page.
 *
 * HTML structure (confirmed from live page):
 *   <details open>
 *     <summary>
 *       <h3 class="division" id="MPO">MPO · Mixed Pro Open …</h3>
 *     </summary>
 *     <table>
 *       <tbody>
 *         <tr>
 *           <td class="player"><a href="/player/12345">First Last</a></td>
 *           <td class="pdga-number">12345</td>
 *           <td class="player-rating propagator">1059</td>
 *           …
 *         </tr>
 *       </tbody>
 *     </table>
 *   </details>
 *   <details open>
 *     <summary><h3 class="division" id="FPO">…</h3></summary>
 *     …
 *   </details>
 */
function parseEventPage(html: string, tournamentId: string): RegistrationRow[] {
    const $ = cheerio.load(html);
    const players: RegistrationRow[] = [];
    const seen = new Set<number>();

    $('details').each((_, details) => {
        const $details = $(details);

        // Determine division from the h3 id inside the summary
        const h3 = $details.find('summary h3.division');
        const divId = h3.attr('id');
        if (divId !== 'MPO' && divId !== 'FPO') return;
        const division = divId as 'MPO' | 'FPO';

        // Each player is a table row in the content area outside the summary
        $details.find('tbody tr').each((_, row) => {
            const $row = $(row);

            const playerLink = $row.find('td.player a').first();
            const pdgaCell = $row.find('td.pdga-number').first();
            const ratingCell = $row.find('td.player-rating').first();

            const name = playerLink.text().trim();
            const pdgaNum = parseInt(pdgaCell.text().trim(), 10);
            const ratingRaw = parseInt(ratingCell.text().trim(), 10);
            const rating = isNaN(ratingRaw) ? null : ratingRaw;

            if (!name || isNaN(pdgaNum) || pdgaNum <= 0) return;
            if (seen.has(pdgaNum)) return;
            seen.add(pdgaNum);

            const parts = name.trim().split(/\s+/);
            const firstName = parts.slice(0, -1).join(' ') || parts[0];
            const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

            players.push({
                tournament_id: tournamentId,
                pdga_number: pdgaNum,
                player_name: name,
                first_name: firstName,
                last_name: lastName,
                division,
                rating,
            });
        });
    });

    return players;
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const activeTournament =
            SEASON_2026.find(t => getLockTime(t) > now) ||
            SEASON_2026[SEASON_2026.length - 1];

        const tournamentId = activeTournament.id;
        const pdgaEventId = activeTournament.pdga_id;

        console.log(`Registrations cron: tournament ${tournamentId} (PDGA event ${pdgaEventId})`);

        const res = await fetch(`https://www.pdga.com/tour/event/${pdgaEventId}`, {
            headers: { 'User-Agent': UA },
        });
        if (!res.ok) throw new Error(`PDGA event page returned ${res.status}`);

        const html = await res.text();
        const players = parseEventPage(html, tournamentId);

        const mpoCount = players.filter(p => p.division === 'MPO').length;
        const fpoCount = players.filter(p => p.division === 'FPO').length;
        const withRating = players.filter(p => p.rating != null).length;

        console.log(`Parsed ${players.length} players (${mpoCount} MPO, ${fpoCount} FPO, ${withRating} with rating)`);

        if (players.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No registrants found — registration may not be open yet',
                tournament_id: tournamentId,
            });
        }

        // Delete existing rows for this tournament first, then insert fresh.
        // This ensures withdrawn players are removed and stale rows from wrong scrapes are cleaned up.
        const { error: deleteError } = await supabase
            .from('tournament_registrations')
            .delete()
            .eq('tournament_id', tournamentId);

        if (deleteError) {
            console.error('Delete error:', JSON.stringify(deleteError));
            throw new Error(deleteError.message || JSON.stringify(deleteError));
        }

        const { error } = await supabase
            .from('tournament_registrations')
            .insert(players);

        if (error) {
            console.error('Insert error:', JSON.stringify(error));
            throw new Error(error.message || JSON.stringify(error));
        }

        console.log(`Upserted ${players.length} players successfully`);

        return NextResponse.json({
            success: true,
            tournament_id: tournamentId,
            total: players.length,
            mpo: mpoCount,
            fpo: fpoCount,
            with_rating: withRating,
        });

    } catch (e: unknown) {
        const msg = (e as Error)?.message || JSON.stringify(e);
        console.error('Registrations cron error:', msg);
        try {
            const { sendErrorWebhook } = await import('@/lib/webhook');
            await sendErrorWebhook(`Registrations Cron Failed: ${msg}`);
        } catch (webhookErr) {
            console.error('Failed to send webhook:', webhookErr);
        }
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
