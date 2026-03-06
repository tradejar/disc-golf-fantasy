import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@clerk/nextjs/server';
import SeasonLeaderboardTabs from '@/components/SeasonLeaderboardTabs';
import Link from 'next/link';

export default async function SeasonLeaderboardPage() {
    const { userId } = await auth();
    let leagues: { id: string; name: string }[] = [];

    if (userId) {
        const { data, error } = await supabaseAdmin
            .from('league_members')
            .select(`
                league_id,
                leagues ( id, name )
            `)
            .eq('user_id', userId);

        if (!error && data) {
            // @ts-ignore
            leagues = data.map(m => m.leagues).filter(Boolean) as { id: string; name: string }[];
        }
    }

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem' }}>
            {userId && leagues.length > 0 && (
                <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '1rem' }}>
                    <Link href="/leagues/create" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.9rem' }}>+ Create a New Mini-League</Link>
                </div>
            )}
            <SeasonLeaderboardTabs leagues={leagues} />
        </main>
    );
}
