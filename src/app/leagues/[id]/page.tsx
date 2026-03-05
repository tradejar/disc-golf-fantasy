import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

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

    // 3. Leaderboard Construction (Current Active or Most Recent Tournament)
    const { data: latestTournaments } = await supabaseAdmin
        .from('tournaments')
        .select('id, name, is_active')
        .order('is_active', { ascending: false }) // Prioritize active tournaments first
        .order('created_at', { ascending: false }) // Then fallback to the most recent one
        .limit(1);

    const activeTournament = latestTournaments?.[0];
    let memberEntries: any[] = [];

    if (activeTournament) {
        // Get all entries for this tournament that belong to league members
        const memberIds = league.league_members.map((m: any) => m.user_id);
        const { data: entries, error: entriesError } = await supabaseAdmin
            .from('entries')
            .select(`
                id,
                user_id,
                total_points
            `)
            .eq('tournament_id', activeTournament.id)
            .in('user_id', memberIds)
            .order('total_points', { ascending: false });

        if (entriesError) console.error("Error fetching active entries:", entriesError);
        if (entries) memberEntries = entries;
    }

    // 4. Upcoming Tournament (Pending Drafts)
    const now = new Date();
    const upcomingTournament = SEASON_2026.find(t => getLockTime(t) > now);
    let upcomingEntries: any[] = [];

    if (upcomingTournament) {
        const memberIds = league.league_members.map((m: any) => m.user_id);
        const { data: entries, error: upcomingError } = await supabaseAdmin
            .from('entries')
            .select(`
                id,
                user_id
            `)
            .eq('tournament_id', upcomingTournament.id)
            .in('user_id', memberIds);

        if (upcomingError) console.error("Error fetching upcoming entries:", upcomingError);
        if (entries) upcomingEntries = entries;
    }

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

                {/* Active Tournament Leaderboard */}
                {activeTournament ? (
                    <div style={{ background: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #334155' }}>
                        <h2 style={{ color: 'white', marginTop: 0, marginBottom: '1.5rem' }}>
                            Live Leaderboard <span style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 400 }}>({activeTournament.name})</span>
                        </h2>

                        {memberEntries.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                No members have drafted a team for this event yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {memberEntries.map((entry, index) => {
                                    const member = league.league_members.find((m: any) => m.user_id === entry.user_id);
                                    const prof = member?.profiles as any;
                                    const displayName = (Array.isArray(prof) ? prof[0]?.display_name : prof?.display_name) || 'Anonymous Player';

                                    return (
                                        <div key={entry.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: entry.user_id === userId ? '#263145' : '#0f172a',
                                            border: entry.user_id === userId ? '1px solid #3b82f6' : '1px solid #334155',
                                            borderRadius: '8px',
                                            padding: '1rem'
                                        }}>
                                            <div style={{ width: '40px', color: '#94a3b8', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                #{index + 1}
                                            </div>
                                            <div style={{ flex: 1, color: 'white', fontWeight: 600 }}>
                                                {displayName}
                                                {entry.user_id === userId && <span style={{ color: '#3b82f6', marginLeft: '8px', fontSize: '0.8rem' }}>(You)</span>}
                                            </div>
                                            <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                                {entry.total_points ?? 0} pts
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', border: '1px solid #334155', borderRadius: '12px', background: '#1e293b' }}>
                        No active tournament running.
                    </div>
                )}

                {/* Upcoming Tournament Drafts */}
                {upcomingTournament && upcomingTournament.id !== activeTournament?.id && (
                    <div style={{ marginTop: '2rem', background: '#0f172a', borderRadius: '12px', padding: '1.5rem', border: '1px dashed #334155' }}>
                        <h2 style={{ color: 'white', marginTop: 0, marginBottom: '0.5rem', fontSize: '1.25rem' }}>
                            Pending Drafts <span style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 400 }}>({upcomingTournament.name})</span>
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Members who have secured their roster for the next event.
                        </p>

                        {upcomingEntries.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                No one has drafted yet.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {upcomingEntries.map((entry) => {
                                    const member = league.league_members.find((m: any) => m.user_id === entry.user_id);
                                    const prof = member?.profiles as any;
                                    const displayName = (Array.isArray(prof) ? prof[0]?.display_name : prof?.display_name) || 'Anonymous Player';

                                    return (
                                        <div key={entry.id} style={{
                                            background: entry.user_id === userId ? '#263145' : '#1e293b',
                                            border: entry.user_id === userId ? '1px solid #3b82f6' : '1px solid #334155',
                                            color: 'white',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '20px',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <div style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%' }}></div>
                                            {displayName}
                                            {entry.user_id === userId && <span style={{ color: '#3b82f6', fontSize: '0.8rem' }}>(You)</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
