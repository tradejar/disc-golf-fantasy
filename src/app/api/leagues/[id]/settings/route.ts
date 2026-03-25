import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// PATCH /api/leagues/[id]/settings — creator only: toggle invite_paused
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId } = await params;
    const body = await req.json();
    const { invitePaused, tournamentIds } = body;
    if (invitePaused !== undefined && typeof invitePaused !== 'boolean') {
        return NextResponse.json({ error: 'invitePaused must be a boolean' }, { status: 400 });
    }

    // Verify ownership
    const { data: league } = await supabaseAdmin
        .from('leagues').select('owner_id').eq('id', leagueId).single();
    if (!league || league.owner_id !== userId) {
        return NextResponse.json({ error: 'Only the league creator can change settings' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (invitePaused !== undefined) updates.invite_paused = invitePaused;
    if (tournamentIds !== undefined && Array.isArray(tournamentIds)) updates.tournament_ids = tournamentIds;
    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('leagues').update(updates).eq('id', leagueId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, ...updates });
}
