import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export const revalidate = 0;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get('tournamentId');

    if (!tournamentId) {
        return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    const tournament = SEASON_2026.find(t => t.id === tournamentId);
    if (!tournament) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // A tournament is "live" when our ingest cron has placed round 1 data into player_stats.
    // The ingest cron runs every 10 minutes on Fri/Sat/Sun and calls the PDGA live API.
    // The moment the first card tees off, PDGA returns real scores and ingest saves them here.
    const { data, error } = await supabaseAdmin
        .from('player_stats')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('round_number', 1)
        .limit(1);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isLive = Array.isArray(data) && data.length > 0;
    const lockTime = getLockTime(tournament);

    return NextResponse.json({
        tournamentId,
        isLive,
        // Fallback hard-lock still applies if PDGA data never shows up
        hardLockTime: lockTime.toISOString(),
        checkedAt: new Date().toISOString(),
    });
}
