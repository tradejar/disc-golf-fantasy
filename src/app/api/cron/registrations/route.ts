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

function makeRow(tournamentId: string, pdgaNum: number, name: string, division: 'MPO' | 'FPO', rating: number | null): RegistrationRow {
    const parts = name.trim().split(/\s+/);
    return {
        tournament_id: tournamentId,
        pdga_number: pdgaNum,
        player_name: name,
        first_name: parts.slice(0, -1).join(' ') || parts[0],
        last_name: parts.length > 1 ? parts[parts.length - 1] : '',
        division,
        rating,
    };
}

// ── Strategy 1: PDGA Live-Round API ──────────────────────────────────────────
// Fetches the actual playing field from the Round 1 live feed.
// This is the authoritative source — only players with an assigned tee time
// appear here, so withdrawals and no-shows are automatically excluded.
async function fetchViaLiveRoundApi(pdgaId: string, tournamentId: string): Promise<RegistrationRow[]> {
    const rows: RegistrationRow[] = [];
    const cb = Date.now();

    for (const division of ['MPO', 'FPO'] as const) {
        const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${pdgaId}&Division=${division}&Round=1&_cb=${cb}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' },
            cache: 'no-store',
        });
        if (!res.ok) continue;
        const raw = await res.json() as any;
        const scores: any[] = raw?.data?.scores ?? [];

        for (const s of scores) {
            if (!s.PDGANum || s.PDGANum <= 0) continue;
            const name = `${s.FirstName ?? ''} ${s.LastName ?? ''}`.trim();
            if (!name) continue;
            rows.push(makeRow(tournamentId, s.PDGANum, name, division, s.Rating ?? null));
        }
    }

    return rows;
}

// ── Strategy 2: PDGA Event Page HTML (fallback) ───────────────────────────────
// Used before tee times are assigned (live-round API is empty).
// Includes all sign-ups, some of whom may later withdraw — less accurate
// but better than nothing in the pre-tournament window.
async function fetchViaEventPage(pdgaId: string, tournamentId: string): Promise<RegistrationRow[]> {
    const res = await fetch(`https://www.pdga.com/tour/event/${pdgaId}`, {
        headers: { 'User-Agent': UA },
    });
    if (!res.ok) throw new Error(`PDGA event page returned ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const players: RegistrationRow[] = [];
    const seen = new Set<number>();

    $('details').each((_, details) => {
        const $details = $(details);
        const h3 = $details.find('summary h3.division');
        const divId = h3.attr('id');
        if (divId !== 'MPO' && divId !== 'FPO') return;
        const division = divId as 'MPO' | 'FPO';

        $details.find('tbody tr').each((_, row) => {
            const $row = $(row);
            const name = $row.find('td.player a').first().text().trim();
            const pdgaNum = parseInt($row.find('td.pdga-number').first().text().trim(), 10);
            const ratingRaw = parseInt($row.find('td.player-rating').first().text().trim(), 10);
            if (!name || isNaN(pdgaNum) || pdgaNum <= 0) return;
            if (seen.has(pdgaNum)) return;
            seen.add(pdgaNum);
            players.push(makeRow(tournamentId, pdgaNum, name, division, isNaN(ratingRaw) ? null : ratingRaw));
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

        // ── Fetch from PDGA ───────────────────────────────────────────────────
        // Strategy 1: live-round API (accurate confirmed field, post-tee-time-assignment)
        // Strategy 2: HTML event page (full sign-up list, pre-tee-time-assignment fallback)
        let players: RegistrationRow[] = [];
        let source = 'live_round_api';

        try {
            players = await fetchViaLiveRoundApi(pdgaEventId, tournamentId);
            console.log(`Live-round API: ${players.length} players`);
        } catch (e: any) {
            console.warn('Live-round API failed:', e.message);
        }

        if (players.length === 0) {
            source = 'event_page_html';
            console.log('Live-round returned 0 — falling back to event page HTML scrape');
            try {
                players = await fetchViaEventPage(pdgaEventId, tournamentId);
                console.log(`Event page HTML: ${players.length} players`);
            } catch (e: any) {
                console.warn('HTML scrape also failed:', e.message);
            }
        }

        if (players.length === 0) {
            return NextResponse.json({
                success: true,
                source: 'none',
                message: 'No players found from either source — registration may not be open yet',
                tournament_id: tournamentId,
            });
        }

        // ── Diff against existing rows ─────────────────────────────────────────
        // Compare fresh PDGA data against what's already in the DB to report changes.
        const { data: existingRows } = await supabase
            .from('tournament_registrations')
            .select('pdga_number, player_name')
            .eq('tournament_id', tournamentId);

        const existingNums = new Set((existingRows ?? []).map(r => r.pdga_number as number));
        const freshNums = new Set(players.map(p => p.pdga_number));

        const added   = players.filter(p => !existingNums.has(p.pdga_number)).map(p => p.player_name);
        const removed = (existingRows ?? []).filter(r => !freshNums.has(r.pdga_number as number)).map(r => r.player_name);

        if (added.length)   console.log(`Adding ${added.length} new players:`, added.slice(0, 10));
        if (removed.length) console.log(`Removing ${removed.length} withdrawn players:`, removed.slice(0, 10));

        // ── Upsert fresh data ─────────────────────────────────────────────────
        const { error: upsertErr } = await supabase
            .from('tournament_registrations')
            .upsert(players, { onConflict: 'tournament_id,pdga_number' });

        if (upsertErr) {
            console.error('Upsert error:', JSON.stringify(upsertErr));
            throw new Error(upsertErr.message || JSON.stringify(upsertErr));
        }

        // ── Remove withdrawn players ──────────────────────────────────────────
        // Anyone in the DB for this tournament but NOT in the fresh PDGA list has
        // withdrawn, been disqualified, or was a scrape artefact — delete them.
        if (freshNums.size > 0) {
            await supabase
                .from('tournament_registrations')
                .delete()
                .eq('tournament_id', tournamentId)
                .not('pdga_number', 'in', `(${[...freshNums].join(',')})`);
        }

        const mpoCount = players.filter(p => p.division === 'MPO').length;
        const fpoCount = players.filter(p => p.division === 'FPO').length;

        console.log(`Done: ${players.length} players (${mpoCount} MPO, ${fpoCount} FPO) — source: ${source}`);

        return NextResponse.json({
            success: true,
            source,
            tournament_id: tournamentId,
            total: players.length,
            mpo: mpoCount,
            fpo: fpoCount,
            added: added.length,
            removed: removed.length,
            added_players: added.slice(0, 20),
            removed_players: removed.slice(0, 20),
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
