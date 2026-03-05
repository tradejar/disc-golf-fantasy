import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// One-time cleanup endpoint — removes duplicate entries keeping the best version
// (highest total_points, or most recent if no points scored yet)
// Protected by CRON_SECRET so only admins can trigger it
export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all entries
    const { data: entries, error } = await supabaseAdmin
        .from('entries')
        .select('id, user_id, tournament_id, total_points, created_at')
        .order('total_points', { ascending: false, nullsFirst: false });

    if (error || !entries) {
        return NextResponse.json({ error: error?.message || 'Failed to fetch entries' }, { status: 500 });
    }

    // Group by (user_id, tournament_id), keep the best (highest points, else most recent)
    const best = new Map<string, string>(); // key -> id to keep
    const toDelete: string[] = [];

    for (const entry of entries) {
        const key = `${entry.user_id}::${entry.tournament_id}`;
        if (!best.has(key)) {
            best.set(key, entry.id);
        } else {
            // This is a duplicate — mark for deletion
            toDelete.push(entry.id);
        }
    }

    if (toDelete.length === 0) {
        return NextResponse.json({ message: 'No duplicates found', deleted: 0 });
    }

    const { error: deleteError } = await supabaseAdmin
        .from('entries')
        .delete()
        .in('id', toDelete);

    if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
        message: `Cleaned up ${toDelete.length} duplicate entries`,
        deleted: toDelete.length,
        kept: best.size,
    });
}
