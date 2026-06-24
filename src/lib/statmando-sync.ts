import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { normalizeName } from '@/lib/name-utils';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export type StatCategory = 'main' | 'teegreen' | 'putt';
export type Division = 'MPO' | 'FPO';

// StatMando StatZone season-stats pages. One per category x division.
const SLUG: Record<StatCategory, string> = {
    main: 'main',
    teegreen: 'teegreen',
    putt: 'putt',
};

function pageUrl(category: StatCategory, division: Division): string {
    return `https://statmando.com/stats/season-stats-${SLUG[category]}-dgpt-2026-${division.toLowerCase()}`;
}

// Column headers that are not "stats" — handled as their own columns.
const EVENTS_LABELS = new Set(['Events', 'Events Tr.']);
const ROUNDS_LABELS = new Set(['Rounds', 'Rounds Tr.']);

export interface StatRow {
    norm_name: string;
    division: Division;
    category: StatCategory;
    display_name: string;
    slug: string | null;
    stats: Record<string, number>;
    events: number | null;
    rounds: number | null;
    source_updated: string | null;
}

function toNumber(raw: string): number | null {
    const cleaned = (raw || '').replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === '—') return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}

/**
 * Parse a single StatMando season-stats page into per-player rows.
 * Exported so it can be unit-tested against saved HTML without a live fetch.
 */
export function parseStatmandoHtml(
    html: string,
    category: StatCategory,
    division: Division
): { rows: StatRow[]; sourceUpdated: string | null } {
    const $ = cheerio.load(html);

    // "Last Updated: 2026-06-23 23:46:12 CT"
    const bodyText = $('body').text();
    const updatedMatch = bodyText.match(/Last Updated:\s*([0-9\-: ]+(?:CT|ET|PT)?)/i);
    const sourceUpdated = updatedMatch ? updatedMatch[1].trim() : null;

    // Find the data table: the one whose rows include a "Player" header cell.
    let header: string[] | null = null;
    let $dataTable: cheerio.Cheerio<never> | null = null;

    $('table').each((_, table) => {
        if ($dataTable) return;
        const $table = $(table);
        let headerCells: string[] | null = null;
        $table.find('tr').each((__, tr) => {
            if (headerCells) return;
            const cells = $(tr).find('th, td').map((___, c) => $(c).text().trim()).get();
            if (cells.some(c => c === 'Player')) headerCells = cells;
        });
        if (headerCells) {
            header = headerCells;
            $dataTable = $table as never;
        }
    });

    if (!header || !$dataTable) return { rows: [], sourceUpdated };

    const rows: StatRow[] = [];
    const hdr = header as string[];

    ($dataTable as cheerio.Cheerio<never>).find('tr').each((_, tr) => {
        const $tr = $(tr);
        const cells = $tr.find('td');
        if (cells.length < 2) return;

        const $link = $tr.find('td a').first();
        const name = ($link.text() || $(cells[0]).text()).trim();
        if (!name || name === 'Player') return;

        const href = $link.attr('href') || '';
        const slugMatch = href.match(/\/player\/([^/]+)\/profile/);
        const slug = slugMatch ? slugMatch[1] : null;

        const stats: Record<string, number> = {};
        let events: number | null = null;
        let rounds: number | null = null;

        cells.each((i, cell) => {
            const label = hdr[i];
            if (!label || label === 'Player') return;
            const val = toNumber($(cell).text());
            if (val === null) return;
            if (EVENTS_LABELS.has(label)) { events = val; return; }
            if (ROUNDS_LABELS.has(label)) { rounds = val; return; }
            stats[label] = val;
        });

        if (Object.keys(stats).length === 0) return;

        rows.push({
            norm_name: normalizeName(name),
            division,
            category,
            display_name: name,
            slug,
            stats,
            events,
            rounds,
            source_updated: sourceUpdated,
        });
    });

    return { rows, sourceUpdated };
}

async function fetchPage(category: StatCategory, division: Division): Promise<StatRow[]> {
    const url = pageUrl(category, division);
    const res = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    const html = await res.text();
    const { rows } = parseStatmandoHtml(html, category, division);
    return rows;
}

function getServiceClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export interface StatmandoSyncResult {
    success: true;
    total: number;
    byPage: { category: StatCategory; division: Division; rows: number }[];
}

/**
 * Scrapes all 6 StatMando season-stats pages and upserts them into
 * statmando_stats. Shared by the daily cron route.
 */
export async function syncStatmandoStats(): Promise<StatmandoSyncResult> {
    const supabase = getServiceClient();
    const categories: StatCategory[] = ['main', 'teegreen', 'putt'];
    const divisions: Division[] = ['MPO', 'FPO'];

    const allRows: StatRow[] = [];
    const byPage: StatmandoSyncResult['byPage'] = [];

    for (const division of divisions) {
        for (const category of categories) {
            try {
                const rows = await fetchPage(category, division);
                byPage.push({ category, division, rows: rows.length });
                allRows.push(...rows);
                console.log(`StatMando ${category} ${division}: ${rows.length} players`);
            } catch (e) {
                console.warn(`StatMando ${category} ${division} failed:`, (e as Error).message);
                byPage.push({ category, division, rows: 0 });
            }
        }
    }

    if (allRows.length > 0) {
        const payload = allRows.map(r => ({ ...r, scraped_at: new Date().toISOString() }));
        const { error } = await supabase
            .from('statmando_stats')
            .upsert(payload, { onConflict: 'norm_name,division,category' });
        if (error) throw new Error(error.message || JSON.stringify(error));
    }

    return { success: true, total: allRows.length, byPage };
}
