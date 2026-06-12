import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ── Types ────────────────────────────────────────────────────────────────────
export interface RegistrationRow {
    tournament_id: string;
    pdga_number: number;
    player_name: string;
    first_name: string;
    last_name: string;
    division: 'MPO' | 'FPO';
    rating: number | null;
}

export interface SyncResult {
    success: true;
    source: 'live_round_api' | 'event_page_html' | 'none';
    tournament_id: string;
    total: number;
    mpo: number;
    fpo: number;
    added: number;
    removed: number;
    added_players: string[];
    removed_players: string[];
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
// Also harvests each player's nationality (PDGA `Nationality` falls back to
// `Country`, both ISO alpha-2) — the feed carries it for free, and we persist
// it in player_countries so flags survive across events (the HTML fallback
// below has no country data).
async function fetchViaLiveRoundApi(
    pdgaId: string,
    tournamentId: string
): Promise<{ rows: RegistrationRow[]; countries: Map<number, string> }> {
    const rows: RegistrationRow[] = [];
    const countries = new Map<number, string>();
    const cb = Date.now();

    for (const division of ['MPO', 'FPO'] as const) {
        const url = `https://www.pdga.com/apps/tournament/live-api/live_results_fetch_round?TournID=${pdgaId}&Division=${division}&Round=1&_cb=${cb}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': UA, 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' },
            cache: 'no-store',
        });
        if (!res.ok) continue;
        const raw = await res.json() as { data?: { scores?: Array<{ PDGANum?: number; FirstName?: string; LastName?: string; Rating?: number | null; Country?: string | null; Nationality?: string | null }> } };
        const scores = raw?.data?.scores ?? [];

        for (const s of scores) {
            if (!s.PDGANum || s.PDGANum <= 0) continue;
            const name = `${s.FirstName ?? ''} ${s.LastName ?? ''}`.trim();
            if (!name) continue;
            rows.push(makeRow(tournamentId, s.PDGANum, name, division, s.Rating ?? null));
            const code = (s.Nationality ?? s.Country ?? '').trim().toUpperCase();
            if (code.length === 2) countries.set(s.PDGANum, code);
        }
    }

    return { rows, countries };
}

// ── Strategy 2: PDGA Event Page HTML (fallback) ───────────────────────────────
// Used before tee times are assigned (live-round API is empty).
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

function getServiceClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

/**
 * Pulls the active tournament's field from PDGA, diffs against Supabase,
 * upserts new/changed rows, deletes withdrawals. Shared by the daily cron
 * and the manual "Refresh" button on the draft page.
 */
export async function syncRegistrations(): Promise<SyncResult> {
    const supabase = getServiceClient();
    const now = new Date();
    const activeTournament =
        SEASON_2026.find(t => getLockTime(t) > now) ||
        SEASON_2026[SEASON_2026.length - 1];

    const tournamentId = activeTournament.id;
    const pdgaEventId = activeTournament.pdga_id;

    console.log(`Registrations sync: tournament ${tournamentId} (PDGA event ${pdgaEventId})`);

    let players: RegistrationRow[] = [];
    let countries = new Map<number, string>();
    let source: SyncResult['source'] = 'live_round_api';

    try {
        const api = await fetchViaLiveRoundApi(pdgaEventId, tournamentId);
        players = api.rows;
        countries = api.countries;
        console.log(`Live-round API: ${players.length} players (${countries.size} with country)`);
    } catch (e) {
        console.warn('Live-round API failed:', (e as Error).message);
    }

    if (players.length === 0) {
        source = 'event_page_html';
        console.log('Live-round returned 0 — falling back to event page HTML scrape');
        try {
            players = await fetchViaEventPage(pdgaEventId, tournamentId);
            console.log(`Event page HTML: ${players.length} players`);
        } catch (e) {
            console.warn('HTML scrape also failed:', (e as Error).message);
        }
    }

    if (players.length === 0) {
        return {
            success: true,
            source: 'none',
            tournament_id: tournamentId,
            total: 0, mpo: 0, fpo: 0,
            added: 0, removed: 0,
            added_players: [], removed_players: [],
        };
    }

    // ── Diff against existing rows ─────────────────────────────────────────
    const { data: existingRows } = await supabase
        .from('tournament_registrations')
        .select('pdga_number, player_name')
        .eq('tournament_id', tournamentId);

    const existingNums = new Set((existingRows ?? []).map(r => r.pdga_number as number));
    const freshNums = new Set(players.map(p => p.pdga_number));

    const added   = players.filter(p => !existingNums.has(p.pdga_number)).map(p => p.player_name);
    const removed = (existingRows ?? []).filter(r => !freshNums.has(r.pdga_number as number)).map(r => r.player_name as string);

    if (added.length)   console.log(`Adding ${added.length} new players:`, added.slice(0, 10));
    if (removed.length) console.log(`Removing ${removed.length} withdrawn players:`, removed.slice(0, 10));

    const { error: upsertErr } = await supabase
        .from('tournament_registrations')
        .upsert(players, { onConflict: 'tournament_id,pdga_number' });

    if (upsertErr) {
        console.error('Upsert error:', JSON.stringify(upsertErr));
        throw new Error(upsertErr.message || JSON.stringify(upsertErr));
    }

    if (freshNums.size > 0) {
        await supabase
            .from('tournament_registrations')
            .delete()
            .eq('tournament_id', tournamentId)
            .not('pdga_number', 'in', `(${[...freshNums].join(',')})`);
    }

    // Persist nationality codes (pdga_number → ISO alpha-2) for flag display.
    // Accumulates across events so players keep their flag even when the next
    // event's data comes from the HTML fallback (which has no country field).
    if (countries.size > 0) {
        const countryRows = [...countries].map(([pdga_number, country]) => ({
            pdga_number, country, updated_at: new Date().toISOString(),
        }));
        const { error: countryErr } = await supabase
            .from('player_countries')
            .upsert(countryRows, { onConflict: 'pdga_number' });
        if (countryErr) console.warn('player_countries upsert failed (non-fatal):', countryErr.message);
    }

    const mpo = players.filter(p => p.division === 'MPO').length;
    const fpo = players.filter(p => p.division === 'FPO').length;

    console.log(`Done: ${players.length} players (${mpo} MPO, ${fpo} FPO) — source: ${source}`);

    return {
        success: true,
        source,
        tournament_id: tournamentId,
        total: players.length,
        mpo, fpo,
        added: added.length,
        removed: removed.length,
        added_players: added.slice(0, 20),
        removed_players: removed.slice(0, 20),
    };
}
