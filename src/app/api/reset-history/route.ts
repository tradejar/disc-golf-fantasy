import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth, currentUser } from '@clerk/nextjs/server';

const ADMIN_EMAILS = ['misupeinternet@gmail.com'];

export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await currentUser();
        const email = user?.emailAddresses?.[0]?.emailAddress;

        if (!email || !ADMIN_EMAILS.includes(email)) {
            return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
        }

        // Delete ALL entries across all users and tournaments
        const { error } = await supabaseAdmin
            .from('entries')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all (neq matches everything)

        if (error) {
            console.error('Reset all error:', error);
            return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
