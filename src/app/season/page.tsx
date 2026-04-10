import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import ResetButton from '@/components/ResetButton';
import styles from '../page.module.css';

const ADMIN_EMAILS = ['misupeinternet@gmail.com'];

export default async function SeasonPage() {
    const { userId } = await auth();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let entries: any[] = [];

    const clerkUser = userId ? await currentUser() : null;
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
    const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

    if (userId) {
        const { data: entriesData } = await supabaseAdmin
            .from('entries')
            .select('*')
            .eq('user_id', userId);
        if (entriesData) entries = entriesData;
    }

    const now = new Date();

    // Find the index of the very next open (not yet locked) tournament
    const nextOpenIdx = SEASON_2026.findIndex(t => getLockTime(t) > now);

    const enrichedSchedule = SEASON_2026.map((tourney, idx) => {
        const entry = entries.find(e => e.tournament_id === tourney.id);
        const lockTime = getLockTime(tourney);
        const isDraftLocked = now >= lockTime;

        let status: 'open' | 'locked-no-entry' | 'locked-with-entry' | 'future-locked';
        if (!isDraftLocked) {
            // Only the very NEXT tournament is draftable; later ones are future-locked
            status = idx === nextOpenIdx ? 'open' : 'future-locked';
        } else if (entry) {
            status = 'locked-with-entry';
        } else {
            status = 'locked-no-entry';
        }

        return { ...tourney, status, entry, isDraftLocked, lockTime };
    });

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                <div className={styles.timelineHeader}>
                    <div>
                        <h1 style={{ color: 'white', marginBottom: '0.5rem' }}>
                            {userId ? 'DGPT 2026 Season' : '2026 Tournament Schedule'}
                        </h1>
                        <p style={{ color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                            {userId
                                ? 'Draft a team for each event and follow the live results.'
                                : 'Sign in before the first card tees off to enter any event.'}
                        </p>
                    </div>
                    {isAdmin && <ResetButton />}
                </div>

                <div className={styles.timelineContainer}>
                    {enrichedSchedule.map((tourney) => (
                        <div
                            key={tourney.id}
                            className={styles.timelineCard}
                            style={{
                                border: tourney.status === 'open' ? '2px solid #3b82f6' : '1px solid #334155',
                                opacity: (tourney.status === 'locked-no-entry' || tourney.status === 'future-locked') ? 0.45 : 1,
                                filter: tourney.status === 'future-locked' ? 'grayscale(0.4)' : undefined,
                            }}
                        >
                            <div className={styles.cardContent}>
                                <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1.25rem' }}>{tourney.name}</h3>
                                <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    {new Date(`${tourney.startDate}T12:00:00Z`).toLocaleDateString()} – {new Date(`${tourney.endDate}T12:00:00Z`).toLocaleDateString()} • {tourney.location}
                                </div>

                                {tourney.status === 'locked-with-entry' && tourney.entry && (
                                    <div style={{ color: '#10b981', fontWeight: 'bold' }}>
                                        Points: {tourney.entry.total_points ?? '—'}
                                    </div>
                                )}
                                {tourney.status === 'locked-no-entry' && (
                                    <div style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
                                        🤖 Auto-drafted — check your leaderboard entry
                                    </div>
                                )}
                                {tourney.status === 'open' && !tourney.entry && userId && (
                                    <div style={{ color: '#38bdf8', fontSize: '0.85rem' }}>🔒 Locks when first card tees off</div>
                                )}
                                {tourney.status === 'open' && !userId && (
                                    <div style={{ color: '#38bdf8', fontSize: '0.85rem' }}>🔒 Sign in to draft</div>
                                )}
                                {tourney.status === 'open' && tourney.entry && (
                                    <>
                                        <div style={{ color: '#10b981', fontSize: '0.85rem' }}>✓ Entry saved — edit until draft locks</div>
                                        {Array.isArray(tourney.entry.roster_data) && tourney.entry.roster_data.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem 0.75rem', marginTop: '0.35rem' }}>
                                                {(tourney.entry.roster_data as { firstName: string; lastName: string }[]).map((p, i) => (
                                                    <span key={i} style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                        {p.firstName} {p.lastName}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                                {tourney.status === 'future-locked' && (
                                    <div style={{ color: '#475569', fontSize: '0.82rem' }}>🔒 Not open yet</div>
                                )}
                            </div>

                            <div className={styles.cardAction}>
                                {!userId && tourney.status === 'open' && (
                                    <SignInButton mode="modal">
                                        <button style={{
                                            background: '#3b82f6', color: 'white', border: 'none',
                                            padding: '0.75rem 1rem', borderRadius: '6px',
                                            fontWeight: 'bold', cursor: 'pointer', width: '100%'
                                        }}>
                                            Sign in to draft
                                        </button>
                                    </SignInButton>
                                )}
                                {userId && tourney.status === 'open' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                        <Link href={`/draft/${tourney.id}`} style={{
                                            background: tourney.entry ? '#10b981' : '#3b82f6',
                                            color: 'white', padding: '0.75rem 1rem', borderRadius: '6px',
                                            textDecoration: 'none', fontWeight: 'bold', textAlign: 'center', width: '100%'
                                        }}>
                                            {tourney.entry ? '✏️ Edit Picks' : 'Draft Team'}
                                        </Link>
                                        {tourney.entry && (
                                            <Link href={`/leaderboard/${tourney.id}`} style={{
                                                background: '#334155', color: 'white', padding: '0.5rem 1rem',
                                                borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
                                                textAlign: 'center', width: '100%', fontSize: '0.85rem'
                                            }}>
                                                🏆 Leaderboard
                                            </Link>
                                        )}
                                    </div>
                                )}
                                {tourney.status === 'locked-with-entry' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                                        <Link href={`/leaderboard/${tourney.id}`} style={{
                                            background: '#f59e0b', color: '#0f172a', padding: '0.75rem 1rem',
                                            borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
                                            textAlign: 'center', width: '100%'
                                        }}>
                                            🏆 Leaderboard
                                        </Link>
                                    </div>
                                )}
                                {tourney.status === 'locked-no-entry' && (
                                    <Link href={`/leaderboard/${tourney.id}`} style={{
                                        background: '#334155', color: '#94a3b8', padding: '0.75rem 1rem',
                                        borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
                                        textAlign: 'center', width: '100%', fontSize: '0.85rem'
                                    }}>
                                        View Leaderboard
                                    </Link>
                                )}
                                {!userId && tourney.status !== 'open' && (
                                    <Link href={`/leaderboard/${tourney.id}`} style={{
                                        background: '#334155', color: '#94a3b8', padding: '0.75rem 1rem',
                                        borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
                                        textAlign: 'center', width: '100%', fontSize: '0.85rem'
                                    }}>
                                        View Leaderboard
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
