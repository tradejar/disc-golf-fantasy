import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

export async function DELETE(req: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tournamentId } = await req.json();
    if (!tournamentId) {
        return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    const tournament = SEASON_2026.find(t => t.id === tournamentId);
    if (!tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Block deletions after the draft locks
    if (new Date() >= getLockTime(tournament)) {
        return NextResponse.json(
            { error: 'Draft is locked — you can no longer delete your entry.' },
            { status: 403 }
        );
    }

    const { error } = await supabaseAdmin
        .from('entries')
        .delete()
        .eq('user_id', userId)
        .eq('tournament_id', tournamentId);

    if (error) {
        console.error('delete-entry error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
