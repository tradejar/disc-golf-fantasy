'use client';

import { useEffect, useState } from 'react';
import styles from './HistoryClient.module.css';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

interface HistoryClientProps {
    userId: string | null;
    initialEntries: unknown[];
}

export default function HistoryClient({ userId, initialEntries }: HistoryClientProps) {
    const [entries, setEntries] = useState<any[]>(initialEntries);
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

    // We no longer need to fetch on the client side since TournamentsPage
    // fetches the entries securely via the server-side Supabase Admin client.

    if (!userId) {
        return (
            <div className={styles.container}>
                <h2>Tournament History</h2>
                <p>Please sign in to view your tournament history.</p>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className={styles.container}>
                <h2>Tournament History</h2>
                <p>No tournament entries found. Go draft a team!</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h2>Your Tournament History</h2>

            <div className={styles.list}>
                {entries.map(entry => (
                    <div key={entry.id} className={styles.entryCard}>
                        <div
                            className={styles.entryHeader}
                            onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                        >
                            {/* Tournament name — full width, truncates on small screens */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
                                <h3 style={{
                                    margin: 0, fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.2,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}>
                                    {SEASON_2026.find(t => t.id === entry.tournament_id)?.name || entry.tournaments?.name || 'Unknown Tournament'}
                                </h3>
                                <span className={styles.date}>{new Date(entry.created_at).toLocaleDateString()}</span>
                            </div>
                            {/* Stats row — always stays on one line */}
                            <div className={styles.highLevelStats} style={{ flexShrink: 0, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <div className={styles.statBox}>
                                    <label>Rank</label>
                                    <span>{entry.tournament_rank != null ? `#${entry.tournament_rank}` : 'Pending'}</span>
                                </div>
                                <div className={styles.statBox}>
                                    <label>Pts</label>
                                    <span>{entry.total_points?.toFixed(1) ?? '—'}</span>
                                </div>
                                <a
                                    href={`/leaderboard/${entry.tournament_id}`}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        fontSize: '0.75rem',
                                        color: '#f59e0b',
                                        textDecoration: 'none',
                                        fontWeight: 'bold',
                                        border: '1px solid #f59e0b',
                                        borderRadius: '4px',
                                        padding: '0.2rem 0.4rem',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    🏆
                                </a>
                            </div>
                        </div>

                        {expandedEntry === entry.id && (() => {
                            // Check if the tournament hasn't started yet
                            const tournament = SEASON_2026.find(t => t.id === entry.tournament_id);
                            const hasScores = entry.total_points != null || entry.breakdown_data != null;
                            const lockTime = tournament ? getLockTime(tournament) : null;
                            const now = new Date();
                            const tournamentStarted = lockTime ? now >= lockTime : true;

                            if (!tournamentStarted) {
                                // Pre-tournament state: show countdown and drafted roster
                                const msUntil = lockTime!.getTime() - now.getTime();
                                const daysLeft = Math.floor(msUntil / (1000 * 60 * 60 * 24));
                                const hoursLeft = Math.floor((msUntil % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                const timeLabel = daysLeft > 0
                                    ? `${daysLeft}d ${hoursLeft}h`
                                    : `${hoursLeft}h`;

                                return (
                                    <div className={styles.expandedDetails}>
                                        {/* Pre-tournament banner */}
                                        <div style={{
                                            background: '#0f172a',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                            padding: '1rem',
                                            marginBottom: '1rem',
                                            textAlign: 'center',
                                        }}>
                                            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>⏳</div>
                                            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1rem' }}>
                                                Starts in ~{timeLabel}
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                                Scores will appear here once the tournament begins.
                                            </div>
                                        </div>
                                        {/* Drafted roster preview */}
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Draft</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {entry.roster_data.map((player: any) => (
                                                <div key={player.id} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    background: '#0f172a',
                                                    border: '1px solid #1e293b',
                                                    borderRadius: '6px',
                                                    padding: '0.5rem 0.75rem',
                                                }}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, color: '#f1f5f9' }}>
                                                            {player.firstName} {player.lastName}
                                                        </span>
                                                        <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                                            {player.division}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>⭐ {player.rating}</span>
                                                        <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem' }}>${player.price}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            // Post-tournament or in-progress: show per-player stats
                            return (
                                <div className={styles.expandedDetails}>
                                    <h4>Roster Performance</h4>
                                    <div className={styles.rosterList}>
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        {entry.roster_data.map((player: any) => {
                                            const rawStats = entry.breakdown_data?.[player.id];
                                            if (!rawStats) {
                                                return (
                                                    <div key={player.id} className={styles.playerRow}>
                                                        <div className={styles.playerHeader}>
                                                            <span>{player.firstName} {player.lastName} ({player.rating})</span>
                                                        </div>
                                                        <div className={styles.roundsContainer}>
                                                            <div className={styles.noStats}>No scoring data yet</div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const isMulti = !!rawStats.rounds;
                                            const rounds = isMulti ? rawStats.rounds : [rawStats];
                                            const totals = isMulti ? rawStats.totals : rawStats;

                                            return (
                                                <div key={player.id} className={styles.playerRow}>
                                                    <div className={styles.playerHeader}>
                                                        <span>{player.firstName} {player.lastName} ({player.rating})</span>
                                                        <span>Tournament Total: <strong style={{ color: '#38bdf8' }}>{totals.totalPoints?.toFixed(1) || totals.totalPoints} pts</strong></span>
                                                    </div>

                                                    <div className={styles.roundsContainer}>
                                                        {rounds.map((r: any, idx: number) => (
                                                            <div key={idx} className={styles.roundCard}>
                                                                <h5 style={{ margin: '0 0 0.5rem 0', color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    {isMulti ? (r.roundNumber > 4 ? 'Final Round' : `Round ${r.roundNumber}`) : 'Simulation Results'}
                                                                </h5>
                                                                <div className={styles.mainStatsRow}>
                                                                    <div>
                                                                        <label>Strokes:</label> {r.strokes}
                                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '6px' }}>
                                                                            ({r.toPar != null ? (r.toPar > 0 ? `+${r.toPar}` : r.toPar) : ''})
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ color: '#38bdf8', fontWeight: 'bold' }}><label>Pts:</label> {r.totalPoints}</div>
                                                                </div>
                                                                <div className={styles.miniBreakdown} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                                    <span title="Eagles">Egli: {r.breakdown?.eagles || 0}</span>
                                                                    <span title="Birdies">B: {r.breakdown?.birdies || 0}</span>
                                                                    <span title="Pars">P: {r.breakdown?.pars || 0}</span>
                                                                    <span title="Bogeys">Bg: {r.breakdown?.bogeys || 0}</span>
                                                                    <span title="Double Bogeys">Dbl: {r.breakdown?.doubles || 0}</span>
                                                                </div>
                                                                <div className={styles.advancedStatsGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.85rem' }}>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>Fairway</label>
                                                                        <span style={{ color: '#4ade80' }}>{r.advanced?.fairwayHits ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>C1 Reg</label>
                                                                        <span style={{ color: '#4ade80' }}>{r.advanced?.c1InReg ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>C2 Reg</label>
                                                                        <span style={{ color: '#4ade80' }}>{r.advanced?.c2InReg ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>Scramble</label>
                                                                        <span style={{ color: '#4ade80' }}>{r.advanced?.scramble ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>C1x</label>
                                                                        <span style={{ color: '#4ade80' }}>{r.advanced?.c1xPutting ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>C2</label>
                                                                        <span style={{ color: '#4ade80' }}>{r.advanced?.c2Putting ?? '-'}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {isMulti && (
                                                            <div className={`${styles.roundCard} ${styles.totalsCard}`}>
                                                                <h5 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                    Tournament Totals
                                                                </h5>
                                                                <div className={styles.mainStatsRow}>
                                                                    <div>
                                                                        <label>Strokes:</label> {totals.strokes}
                                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '6px' }}>
                                                                            ({totals.toPar != null ? (totals.toPar > 0 ? `+${totals.toPar}` : totals.toPar) : ''})
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ color: '#3b82f6', fontWeight: 'bold' }}><label>Pts:</label> {totals.totalPoints?.toFixed(1) || totals.totalPoints}</div>
                                                                </div>
                                                                <div className={styles.miniBreakdown} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                                                    <span title="Eagles">Egli: {totals.breakdown?.eagles || 0}</span>
                                                                    <span title="Birdies">B: {totals.breakdown?.birdies || 0}</span>
                                                                    <span title="Pars">P: {totals.breakdown?.pars || 0}</span>
                                                                    <span title="Bogeys">Bg: {totals.breakdown?.bogeys || 0}</span>
                                                                    <span title="Double Bogeys">Dbl: {totals.breakdown?.doubles || 0}</span>
                                                                </div>
                                                                <div className={styles.advancedStatsGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '0.85rem' }}>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>Fairway (Avg)</label>
                                                                        <span style={{ color: '#4ade80' }}>{totals.advanced?.fairwayHits ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>C1 Reg (Avg)</label>
                                                                        <span style={{ color: '#4ade80' }}>{totals.advanced?.c1InReg ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>C2 Reg (Avg)</label>
                                                                        <span style={{ color: '#4ade80' }}>{totals.advanced?.c2InReg ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>Scramble (Avg)</label>
                                                                        <span style={{ color: '#4ade80' }}>{totals.advanced?.scramble ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>C1x (Avg)</label>
                                                                        <span style={{ color: '#4ade80' }}>{totals.advanced?.c1xPutting ?? '-'}%</span>
                                                                    </div>
                                                                    <div>
                                                                        <label style={{ display: 'block', color: 'gray' }}>C2 (Avg)</label>
                                                                        <span style={{ color: '#4ade80' }}>{totals.advanced?.c2Putting ?? '-'}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()
                        }
                    </div>
                ))}
            </div>
        </div>
    );
}
