import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// POST /api/leagues/[id]/archive — any member: archive or restore the league for themselves
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId } = await params;
    const body = await req.json();
    const { archive } = body; // true = archive, false = restore
    if (typeof archive !== 'boolean') {
        return NextResponse.json({ error: 'archive (boolean) required' }, { status: 400 });
    }

    // Verify membership
    const { data: member } = await supabaseAdmin
        .from('league_members').select('league_id')
        .eq('league_id', leagueId).eq('user_id', userId).maybeSingle();
    if (!member) return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });

    const { error } = await supabaseAdmin
        .from('league_members')
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq('league_id', leagueId)
        .eq('user_id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ archived: archive });
}
