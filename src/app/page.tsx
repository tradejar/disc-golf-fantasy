import { SEASON_2026, getLockTime } from '@/data/tournaments';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import ResetButton from '@/components/ResetButton';
import styles from './page.module.css';

const ADMIN_EMAILS = ['misupeinternet@gmail.com'];

export default async function SeasonHubPage() {
  const { userId } = await auth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let entries: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userLeagues: any[] = [];

  if (userId) {
    const { data: entriesData } = await supabaseAdmin
      .from('entries')
      .select('*')
      .eq('user_id', userId);

    if (entriesData) {
      entries = entriesData;
    }

    // Fetch user's leagues
    const { data: leaguesData } = await supabaseAdmin
      .from('league_members')
      .select(`
        league_id,
        joined_at,
        leagues (
          id,
          name,
          entry_fee,
          payout_structure,
          owner_id
        )
      `)
      .eq('user_id', userId);

    if (leaguesData) {
      userLeagues = leaguesData.map(lm => lm.leagues).filter(Boolean);
    }
  }

  const now = new Date();

  const clerkUser = userId ? await currentUser() : null;
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;
  const isAdmin = !!userEmail && ADMIN_EMAILS.includes(userEmail);

  const enrichedSchedule = SEASON_2026.map((tourney) => {
    const entry = entries.find(e => e.tournament_id === tourney.id);
    const lockTime = getLockTime(tourney);
    const isDraftLocked = now >= lockTime;

    let status: 'open' | 'locked-no-entry' | 'locked-with-entry' | 'future';
    if (!isDraftLocked) {
      status = 'open';
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

        {/* ─── Hero (logged-out only) ─── */}
        {!userId && (
          <section style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '3rem 2rem',
            marginBottom: '3rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🥏</div>
            <h1 style={{ color: 'white', fontSize: '2.2rem', fontWeight: 800, margin: '0 0 0.75rem', letterSpacing: '-0.03em' }}>
              DGPT Fantasy 2026
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', margin: '0 0 2.5rem', lineHeight: 1.6, maxWidth: '480px', marginInline: 'auto' }}>
              Draft a $950 roster from real PDGA pros. Earn fantasy points based on birdies, eagles, and tournament placement — live, every event.
            </p>

            {/* How to play */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
              {[
                { step: '1', title: 'Pick your team', desc: 'Choose 4 MPO + 2 FPO players within a $950 budget' },
                { step: '2', title: 'Lock in', desc: 'Draft closes when the first card tees off' },
                { step: '3', title: 'Follow live', desc: 'Points update in real-time from the PDGA live feed' },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{ flex: '1 1 160px', maxWidth: '200px', background: '#1e293b', borderRadius: '10px', padding: '1.25rem 1rem' }}>
                  <div style={{ color: '#3b82f6', fontWeight: 800, fontSize: '1.5rem', marginBottom: '0.4rem' }}>{step}</div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.3rem' }}>{title}</div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <SignInButton mode="modal">
                <button style={{
                  background: '#3b82f6', color: 'white', border: 'none',
                  padding: '0.85rem 2rem', borderRadius: '8px', fontWeight: 700,
                  fontSize: '1rem', cursor: 'pointer'
                }}>
                  Sign in to play →
                </button>
              </SignInButton>
              <Link href="/rules" style={{
                background: '#1e293b', color: '#94a3b8', border: '1px solid #334155',
                padding: '0.85rem 2rem', borderRadius: '8px', fontWeight: 600,
                fontSize: '1rem', textDecoration: 'none'
              }}>
                How scoring works
              </Link>
            </div>
          </section>
        )}

        {/* ─── Season header ─── */}
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

        {/* ─── My Leagues (Authenticated Only) ─── */}
        {userId && (
          <div style={{ marginBottom: '3rem', background: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ color: 'white', margin: 0, fontSize: '1.5rem' }}>My Mini-Leagues</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link href="/leagues/join" style={{
                  background: '#334155', color: 'white', padding: '0.6rem 1.2rem',
                  borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem'
                }}>
                  Join with Code
                </Link>
                <Link href="/leagues/create" style={{
                  background: '#3b82f6', color: 'white', padding: '0.6rem 1.2rem',
                  borderRadius: '6px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem'
                }}>
                  + Create League
                </Link>
              </div>
            </div>

            {userLeagues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                You haven't joined any private mini-leagues yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {userLeagues.map((league) => (
                  <Link href={`/leagues/${league.id}`} key={league.id} style={{
                    display: 'block',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s'
                  }}>
                    <h3 style={{ margin: '0 0 0.5rem', color: 'white', fontSize: '1.1rem' }}>{league.name}</h3>
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      Prizepool: {league.payout_structure.replace(/_/g, ' ')}
                    </div>
                    <div style={{ color: league.entry_fee > 0 ? '#10b981' : '#38bdf8', fontSize: '0.85rem', fontWeight: 600 }}>
                      Entry: {league.entry_fee > 0 ? `$${league.entry_fee}` : 'Free'}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Tournament cards ─── */}
        <div className={styles.timelineContainer}>
          {enrichedSchedule.map((tourney) => (
            <div
              key={tourney.id}
              className={styles.timelineCard}
              style={{
                border: tourney.status === 'open' ? '2px solid #3b82f6' : '1px solid #334155',
                opacity: tourney.status === 'locked-no-entry' ? 0.7 : 1
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
                  <div style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
                    🔒 Locks when first card tees off
                  </div>
                )}
                {tourney.status === 'open' && !userId && (
                  <div style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
                    🔒 Sign in to draft
                  </div>
                )}
                {tourney.status === 'open' && tourney.entry && (
                  <>
                    <div style={{ color: '#10b981', fontSize: '0.85rem' }}>
                      ✓ Entry saved — edit until draft locks
                    </div>
                    {Array.isArray(tourney.entry.roster_data) && tourney.entry.roster_data.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.2rem 0.75rem', marginTop: '0.35rem' }}>
                        {(tourney.entry.roster_data as { firstName: string; lastName: string; division: string }[]).map((p, i) => (
                          <span key={i} style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            {p.firstName} {p.lastName}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className={styles.cardAction}>
                {/* Logged-out: just show sign in */}
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

                {/* Open: Draft or Edit */}
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

                {/* Locked with entry */}
                {tourney.status === 'locked-with-entry' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                    <Link href={`/leaderboard/${tourney.id}`} style={{
                      background: '#f59e0b', color: '#0f172a', padding: '0.75rem 1rem',
                      borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
                      textAlign: 'center', width: '100%'
                    }}>
                      🏆 Leaderboard
                    </Link>
                    <Link href="/tournaments" style={{
                      background: '#334155', color: 'white', padding: '0.5rem 1rem',
                      borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
                      textAlign: 'center', width: '100%', fontSize: '0.85rem'
                    }}>
                      My Results
                    </Link>
                  </div>
                )}

                {/* Missed (auto-drafted) */}
                {tourney.status === 'locked-no-entry' && (
                  <Link href={`/leaderboard/${tourney.id}`} style={{
                    background: '#334155', color: '#94a3b8', padding: '0.75rem 1rem',
                    borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold',
                    textAlign: 'center', width: '100%', fontSize: '0.85rem'
                  }}>
                    View Leaderboard
                  </Link>
                )}

                {/* Locked, logged out */}
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
