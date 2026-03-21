import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isPremium } from '@/lib/premium';

const RATE_LIMIT_SECONDS = 3 * 60; // 3 minutes for free users

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId } = await params;

    // Verify membership
    const { data: member } = await supabaseAdmin
        .from('league_members')
        .select('league_id')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch top-level messages with their reply counts
    const { data: messages, error } = await supabaseAdmin
        .from('league_messages')
        .select(`
            id, user_id, display_name, content, reactions, created_at, parent_id,
            replies:league_messages!parent_id (
                id, user_id, display_name, content, reactions, created_at, parent_id
            )
        `)
        .eq('league_id', leagueId)
        .is('parent_id', null)
        .order('created_at', { ascending: true })
        .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Retroactively resolve display names by profiles.id (fixes 'Anonymous' messages stored before this fix)
    const allMsgs = messages ?? [];
    // Collect ALL user IDs: message authors + reactors
    const allUserIds = [...new Set([
        ...allMsgs.map((m: any) => m.user_id),
        ...allMsgs.flatMap((m: any) => (m.replies ?? []).map((r: any) => r.user_id)),
        ...allMsgs.flatMap((m: any) => Object.values(m.reactions ?? {}).flat()),
        ...allMsgs.flatMap((m: any) => (m.replies ?? []).flatMap((r: any) => Object.values(r.reactions ?? {}).flat())),
    ])] as string[];
    let nameMap: Record<string, string> = {};
    if (allUserIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('profiles').select('id, display_name').in('id', allUserIds);
        for (const p of profiles ?? []) if (p.display_name) nameMap[p.id] = p.display_name;
    }
    // Build reactionNames: { emoji: [displayName, ...] }
    const resolveReactionNames = (reactions: Record<string, string[]>) =>
        Object.fromEntries(Object.entries(reactions ?? {}).map(([emoji, ids]) =>
            [emoji, (ids as string[]).map(id => nameMap[id] ?? 'Unknown')]
        ));
    const enrich = (m: any) => ({
        ...m,
        display_name: nameMap[m.user_id] ?? m.display_name,
        reactionNames: resolveReactionNames(m.reactions ?? {}),
        replies: (m.replies ?? []).map((r: any) => ({
            ...r,
            display_name: nameMap[r.user_id] ?? r.display_name,
            reactionNames: resolveReactionNames(r.reactions ?? {}),
        })),
    });
    return NextResponse.json({ messages: allMsgs.map(enrich) });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId } = await params;
    const body = await req.json();
    const { content, parentId } = body;

    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    // Verify membership + get display name
    const { data: member } = await supabaseAdmin
        .from('league_members')
        .select('league_id')
        .eq('league_id', leagueId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Rate-limit free users: 1 message per 3 minutes
    const premium = await isPremium(userId);
    if (!premium) {
        const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
        const { data: recentMsgs } = await supabaseAdmin
            .from('league_messages')
            .select('created_at')
            .eq('league_id', leagueId)
            .eq('user_id', userId)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(1);
        if (recentMsgs && recentMsgs.length > 0) {
            const lastMsgAt = new Date(recentMsgs[0].created_at).getTime();
            const retryAfterSeconds = Math.ceil((lastMsgAt + RATE_LIMIT_SECONDS * 1000 - Date.now()) / 1000);
            return NextResponse.json(
                { error: 'rateLimited', retryAfterSeconds: Math.max(1, retryAfterSeconds) },
                { status: 429 }
            );
        }
    }

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('display_name, email')
        .eq('id', userId)
        .maybeSingle();

    const displayName = profile?.display_name ?? profile?.email?.split('@')[0] ?? 'User';

    const { data: message, error } = await supabaseAdmin
        .from('league_messages')
        .insert({
            league_id: leagueId,
            user_id: userId,
            display_name: displayName,
            content: content.trim(),
            parent_id: parentId ?? null,
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message });
}
