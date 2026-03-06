import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import LeaderboardClient from '@/components/LeaderboardClient';
import SeasonLeaderboardClient from '@/components/SeasonLeaderboardClient';

export default async function LeagueDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    const resolvedParams = await params;

    // 1. Fetch League Details
    const { data: league, error: leagueErr } = await supabaseAdmin
        .from('leagues')
        .select(`
            id,
            name,
            access_code,
            entry_fee,
            payout_structure,
            owner_id,
            league_members (
                user_id,
                joined_at,
                profiles ( display_name )
            )
        `)
        .eq('id', resolvedParams.id)
        .single();

    if (leagueErr || !league) {
        return (
            <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem', color: 'white', textAlign: 'center' }}>
                <h1>League Not Found</h1>
                <Link href="/" style={{ color: '#3b82f6' }}>Go home</Link>
            </main>
        );
    }

    // 2. Access Control: Only members can view
    const isMember = userId && league.league_members.some((m: any) => m.user_id === userId);
    if (!isMember) {
        return (
            <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem', color: 'white', textAlign: 'center' }}>
                <h1>Private League</h1>
                <p>You must be a member to view this league.</p>
                <Link href={`/leagues/join?code=${league.access_code}`} style={{ color: '#3b82f6' }}>Join this league</Link>
            </main>
        );
    }

    // 3. Current or Next Active Tournament Determination
    const { data: latestTournaments } = await supabaseAdmin
        .from('tournaments')
        .select('id, name, is_active')
        .order('is_active', { ascending: false }) // Prioritize active tournaments first
        .order('created_at', { ascending: false }) // Then fallback to the most recent one
        .limit(1);

    const activeTournament = latestTournaments?.[0];

    // 4. Upcoming Tournament Target
    const now = new Date();
    const upcomingTournament = SEASON_2026.find(t => getLockTime(t) > now);

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
                    ← Back to Dashboard
                </Link>

                {/* Header */}
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '2rem', border: '1px solid #334155', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h1 style={{ color: 'white', margin: '0 0 0.5rem', fontSize: '2rem' }}>{league.name}</h1>
                            <div style={{ color: '#94a3b8', fontSize: '1rem' }}>
                                <span>Members: {league.league_members.length}</span>
                                <span style={{ margin: '0 0.75rem' }}>|</span>
                                <span>Entry: {league.entry_fee > 0 ? `$${league.entry_fee}` : 'Free'}</span>
                                <span style={{ margin: '0 0.75rem' }}>|</span>
                                <span>Payouts: {league.payout_structure.replace(/_/g, ' ')}</span>
                            </div>
                        </div>

                        {/* Invite Code Block */}
                        <div style={{ background: '#0f172a', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Invite Code</div>
                            <div style={{ color: '#38bdf8', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px' }}>{league.access_code}</div>
                        </div>
                    </div>
                </div>

                {/* Season Standings */}
                <div style={{ marginBottom: '2rem' }}>
                    <SeasonLeaderboardClient
                        title="🏆 Season Standings"
                        subtitle="(Cumulative)"
                        leagueId={resolvedParams.id}
                    />
                </div>

                {/* Active Tournament Leaderboard */}
                {activeTournament ? (
                    <div style={{ marginTop: '2rem' }}>
                        <LeaderboardClient
                            tournamentId={activeTournament.id}
                            tournamentName={`Live: ${activeTournament.name}`}
                            currentUserId={userId}
                            leagueId={resolvedParams.id}
                            variant="league"
                        />
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', border: '1px solid #334155', borderRadius: '12px', background: '#1e293b' }}>
                        No active tournament running.
                    </div>
                )}

                {/* Upcoming Tournament Drafts */}
                {upcomingTournament && upcomingTournament.id !== activeTournament?.id && (
                    <div style={{ marginTop: '2rem' }}>
                        <LeaderboardClient
                            tournamentId={upcomingTournament.id}
                            tournamentName={`Pending: ${upcomingTournament.name}`}
                            currentUserId={userId}
                            leagueId={resolvedParams.id}
                            variant="league"
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
