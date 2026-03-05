import HistoryClient from '@/components/HistoryClient';
import { currentUser } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export default async function TournamentsPage() {
    const user = await currentUser();

    const userId = user?.id || null;

    let entries: unknown[] = [];
    if (userId) {
        const { data, error } = await supabaseAdmin
            .from('entries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('History fetch error:', error);
        }
        if (!error && data) {
            entries = data;
        }
    }

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh' }}>
            <HistoryClient userId={userId} initialEntries={entries} />
        </main>
    );
}
