import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { isPremium } from '@/lib/premium';

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId, userId: targetUserId } = await params;

    // Verify membership
    const { data: member } = await supabaseAdmin
        .from('league_members').select('league_id')
        .eq('league_id', leagueId).eq('user_id', currentUserId).maybeSingle();
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Get tournament context from query params
    const url = new URL(_req.url);
    const tournamentId = url.searchParams.get('tournamentId');
    if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 });

    // Enforce: only show after tournament lock
    const tourn = SEASON_2026.find(t => t.id === tournamentId);
    if (!tourn || getLockTime(tourn) > new Date()) {
        return NextResponse.json({ error: 'Draft not yet public — comments open after tournament locks', locked: true }, { status: 403 });
    }

    const { data: comments, error } = await supabaseAdmin
        .from('draft_comments')
        .select('id, commenter_user_id, content, created_at')
        .eq('league_id', leagueId)
        .eq('tournament_id', tournamentId)
        .eq('target_user_id', targetUserId)
        .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Batch-resolve display names (no FK required)
    const commenterIds = [...new Set((comments ?? []).map((c: any) => c.commenter_user_id))];
    let profileMap: Record<string, string> = {};
    if (commenterIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, display_name, email')
            .in('id', commenterIds);
        for (const p of profiles ?? []) profileMap[p.id] = p.display_name ?? p.email?.split('@')[0] ?? 'User';
    }

    const enriched = (comments ?? []).map((c: any) => ({
        ...c,
        display_name: profileMap[c.commenter_user_id] ?? 'Unknown',
    }));

    return NextResponse.json({ comments: enriched });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId, userId: targetUserId } = await params;
    const body = await req.json();
    const { content, tournamentId } = body;

    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });
    if (!tournamentId) return NextResponse.json({ error: 'tournamentId required' }, { status: 400 });

    // Verify membership
    const { data: member } = await supabaseAdmin
        .from('league_members').select('league_id')
        .eq('league_id', leagueId).eq('user_id', currentUserId).maybeSingle();
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Premium gate — only premium users can post draft comments
    const premium = await isPremium(currentUserId);
    if (!premium) {
        return NextResponse.json({ error: 'premiumOnly' }, { status: 403 });
    }

    // Enforce lock
    const tourn = SEASON_2026.find(t => t.id === tournamentId);
    if (!tourn || getLockTime(tourn) > new Date()) {
        return NextResponse.json({ error: 'Comments not allowed until tournament locks' }, { status: 403 });
    }

    const { data: comment, error } = await supabaseAdmin
        .from('draft_comments')
        .insert({
            league_id: leagueId,
            tournament_id: tournamentId,
            target_user_id: targetUserId,
            commenter_user_id: currentUserId,
            content: content.trim(),
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ comment });
}
