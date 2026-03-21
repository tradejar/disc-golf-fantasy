import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; msgId: string }> }
) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: leagueId, msgId } = await params;
    const { emoji } = await req.json();

    const ALLOWED = ['👍', '❤️', '😂', '🔥', '😮', '👎'];
    if (!ALLOWED.includes(emoji)) return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });

    // Verify membership
    const { data: member } = await supabaseAdmin
        .from('league_members').select('league_id')
        .eq('league_id', leagueId).eq('user_id', userId).maybeSingle();
    if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch current reactions
    const { data: msg } = await supabaseAdmin
        .from('league_messages').select('reactions').eq('id', msgId).single();
    if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    const reactions: Record<string, string[]> = msg.reactions ?? {};
    const users: string[] = reactions[emoji] ?? [];

    // Toggle: add if not present, remove if already reacted
    const updated = users.includes(userId)
        ? users.filter(u => u !== userId)
        : [...users, userId];

    if (updated.length === 0) delete reactions[emoji];
    else reactions[emoji] = updated;

    const { error } = await supabaseAdmin
        .from('league_messages')
        .update({ reactions })
        .eq('id', msgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reactions });
}
