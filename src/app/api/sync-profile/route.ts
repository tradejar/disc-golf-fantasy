import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Receives the user's current display name from the client (via ProfileSync
// which reads it from useUser() — always fresh, no API key issues) and upserts
// it into the Supabase profiles table.
export async function POST(req: Request) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

    const { displayName, email, avatarUrl } = await req.json();

    if (!displayName) return NextResponse.json({ ok: false, error: 'Missing displayName' }, { status: 400 });

    const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userId,
            email: email ?? null,
            display_name: displayName,
            avatar_url: avatarUrl ?? null,
        }, { onConflict: 'id' });

    if (error) {
        console.error('sync-profile error:', error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true, displayName });
}
