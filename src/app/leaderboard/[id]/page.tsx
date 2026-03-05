import LeaderboardClient from '@/components/LeaderboardClient';
import { SEASON_2026 } from '@/data/tournaments';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const tournament = SEASON_2026.find(t => t.id === id);
    if (!tournament) notFound();

    const { userId } = await auth();

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem' }}>
            <LeaderboardClient
                tournamentId={id}
                tournamentName={tournament.name}
                currentUserId={userId}
            />
        </main>
    );
}
