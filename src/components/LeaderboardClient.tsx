'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './LeaderboardClient.module.css';

interface LeaderboardEntry {
    rank: number;
    entryId: string;
    userId: string;
    displayName: string;
    totalPoints: number;
    budgetRemaining: number;
    roster: Array<{ id: string; firstName: string; lastName: string; division: string; price: number; rating: number; pdgaNumber?: number }> | null;
    breakdownData: Record<string, any> | null;
    picksHidden: boolean;
    autoDrafted: boolean;
}

interface LeaderboardClientProps {
    tournamentId: string;
    tournamentName: string;
    currentUserId: string | null;
    leagueId?: string | null;
    variant?: 'global' | 'league';
}

const POLL_INTERVAL_MS = 45_000; // 45s — our cron runs every 3min, catches each update within ~1 poll

export default function LeaderboardClient({ tournamentId, tournamentName, currentUserId, leagueId = null, variant = 'global' }: LeaderboardClientProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    // Track which entry IDs had their points change on the last poll
    const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
    const prevPointsRef = useRef<Map<string, number>>(new Map());
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const buildUrl = useCallback(() => {
        let url = `/api/leaderboard?tournamentId=${tournamentId}`;
        if (currentUserId) url += `&userId=${currentUserId}`;
        if (leagueId) url += `&leagueId=${leagueId}`;
        return url;
    }, [tournamentId, currentUserId, leagueId]);

    const fetchEntries = useCallback(async (isInitial = false) => {
        try {
            const res = await fetch(buildUrl());
            if (!res.ok) return;
            const data = await res.json();
            const fetched: LeaderboardEntry[] = data.entries || [];

            if (isInitial) {
                // First load — just store data, no animation
                setEntries(fetched);
                const own = fetched.find(e => e.userId === currentUserId);
                if (own) setExpandedEntry(own.entryId);
                // Seed ref with initial points
                const initialMap = new Map<string, number>();
                fetched.forEach(e => initialMap.set(e.entryId, e.totalPoints));
                prevPointsRef.current = initialMap;
            } else {
                // Subsequent poll — detect changes, animate
                const changed = new Set<string>();
                fetched.forEach(e => {
                    const prev = prevPointsRef.current.get(e.entryId);
                    if (prev !== undefined && prev !== e.totalPoints) {
                        changed.add(e.entryId);
                    }
                });

                setEntries(fetched);

                if (changed.size > 0) {
                    setUpdatedIds(changed);
                    // Clear animation class after it completes so it can fire again next time
                    setTimeout(() => setUpdatedIds(new Set()), 1200);
                }

                // Update ref with new points
                const newMap = new Map<string, number>();
                fetched.forEach(e => newMap.set(e.entryId, e.totalPoints));
                prevPointsRef.current = newMap;
            }
        } catch { /* ignore network errors */ } finally {
            if (isInitial) setLoading(false);
        }
    }, [buildUrl, currentUserId]);

    useEffect(() => {
        fetchEntries(true);

        // Start polling, but pause when tab is hidden
        const startPolling = () => {
            pollTimerRef.current = setInterval(() => fetchEntries(false), POLL_INTERVAL_MS);
        };
        const stopPolling = () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };

        const handleVisibility = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                // Immediately fetch when tab becomes visible again, then resume polling
                fetchEntries(false);
                startPolling();
            }
        };

        startPolling();
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [fetchEntries]);

    if (loading) {
        return (
            <div className={styles.container}>
                {variant === 'global' && (
                    <Link href="/leaderboard" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Season Leaderboard</Link>
                )}
                <div className={styles.header}>
                    <h1 className={styles.title} style={{ fontSize: variant === 'league' ? '1.5rem' : undefined }}>{tournamentName}</h1>
                    <div className={styles.subtitle}>Loading leaderboard...</div>
                </div>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className={styles.container}>
                {variant === 'global' && (
                    <Link href="/leaderboard" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Season Leaderboard</Link>
                )}
                <div className={styles.header}>
                    <h1 className={styles.title} style={{ fontSize: variant === 'league' ? '1.5rem' : undefined }}>{tournamentName}</h1>
                    <p className={styles.subtitle}>No completed entries yet — be the first to draft!</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {variant === 'global' && (
                <Link href="/leaderboard" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>← Season Leaderboard</Link>
            )}
            <div className={styles.header}>
                <h1 className={styles.title} style={{ fontSize: variant === 'league' ? '1.5rem' : undefined }}>
                    {tournamentName}
                    <span className={styles.liveDot} title="Scores update live every ~45s" />
                </h1>
                <p className={styles.subtitle}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'} · Ranked by Fantasy Points</p>
            </div>

            <div className={styles.list}>
                {entries.map((entry) => {
                    const isMe = entry.userId === currentUserId;
                    const isExpanded = expandedEntry === entry.entryId;
                    const isUpdated = updatedIds.has(entry.entryId);
                    const mpo = (entry.roster || []).filter(p => p.division === 'MPO');
                    const fpo = (entry.roster || []).filter(p => p.division === 'FPO');

                    return (
                        <div
                            key={entry.entryId}
                            className={`${styles.entryCard} ${isMe ? styles.myEntry : ''} ${entry.rank === 1 ? styles.first : ''} ${isUpdated ? styles.cardUpdated : ''}`}
                            onClick={() => setExpandedEntry(isExpanded ? null : entry.entryId)}
                        >
                            <div className={styles.entryRow}>
                                {/* Rank */}
                                <div className={styles.rank}>
                                    {entry.rank === 1 && <span className={styles.trophy}>🏆</span>}
                                    {entry.rank === 2 && <span className={styles.trophy}>🥈</span>}
                                    {entry.rank === 3 && <span className={styles.trophy}>🥉</span>}
                                    {entry.rank > 3 && <span className={styles.rankNum}>#{entry.rank}</span>}
                                </div>

                                {/* Name */}
                                <div className={styles.nameCol}>
                                    <div className={styles.playerName}>
                                        {entry.displayName}
                                        {isMe && <span className={styles.youBadge}>YOU</span>}
                                        {entry.autoDrafted && (
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', background: '#1e293b', border: '1px solid #334155', borderRadius: '4px', padding: '0.1rem 0.4rem', marginLeft: '0.4rem' }}>🤖 Auto</span>
                                        )}
                                    </div>
                                    {entry.picksHidden ? (
                                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>🔒 Picks hidden until tournament starts</span>
                                    ) : (
                                        <span className={styles.rosterPreview}>
                                            {(entry.roster || []).map((p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`).join(' · ')}
                                        </span>
                                    )}
                                </div>

                                {/* Points — animated when updated */}
                                <div className={styles.points}>
                                    <span
                                        className={`${entry.totalPoints > 0 ? styles.positive : styles.neutral} ${isUpdated ? styles.scoreUpdated : ''}`}
                                        key={`${entry.entryId}-${entry.totalPoints}`} // forces React to re-mount on change, re-triggering animation
                                    >
                                        {entry.totalPoints != null ? entry.totalPoints.toFixed(1) : '—'}
                                    </span>
                                    <span className={styles.pointsLabel}>pts</span>
                                </div>
                            </div>

                            {/* Expanded roster detail */}
                            {isExpanded && (() => {
                                const hasBreakdown = entry.breakdownData && Object.keys(entry.breakdownData).length > 0;

                                if (!hasBreakdown) {
                                    return (
                                        <div className={styles.rosterDetail}>
                                            <div className={styles.rosterSection}>
                                                <h4 className={styles.divisionLabel}>MPO</h4>
                                                {mpo.map(p => (
                                                    <div key={p.firstName + p.lastName} className={styles.rosterPlayer}>
                                                        <span>{p.firstName} {p.lastName}</span>
                                                        <span className={styles.ratingBadge}>{p.rating}</span>
                                                        <span className={styles.priceBadge}>${p.price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className={styles.rosterSection}>
                                                <h4 className={styles.divisionLabel}>FPO</h4>
                                                {fpo.map(p => (
                                                    <div key={p.firstName + p.lastName} className={styles.rosterPlayer}>
                                                        <span>{p.firstName} {p.lastName}</span>
                                                        <span className={styles.ratingBadge}>{p.rating}</span>
                                                        <span className={styles.priceBadge}>${p.price}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className={styles.budgetInfo}>Budget remaining: <strong>${entry.budgetRemaining}</strong></div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className={styles.rosterDetail}>
                                        <h4 style={{ margin: '0 0 0.75rem 0', color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roster Performance</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {(entry.roster || []).map((player: any) => {
                                                const rawStats = entry.breakdownData?.[player.id];
                                                const isMulti = rawStats && !!rawStats.rounds && rawStats.rounds.length > 1;
                                                const rounds: any[] = rawStats?.rounds || [];
                                                const totals = rawStats?.totals;
                                                const playerPts = totals?.totalPoints ?? 0;
                                                const playerUpdated = isUpdated; // animate all players when parent entry updated

                                                return (
                                                    <div key={player.id || player.firstName + player.lastName} style={{
                                                        background: '#0f172a',
                                                        border: '1px solid #1e293b',
                                                        borderRadius: '10px',
                                                        padding: '0.75rem',
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                                            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.95rem' }}>
                                                                {player.firstName} {player.lastName}
                                                                <span style={{ color: '#64748b', fontWeight: 400, fontSize: '0.8rem', marginLeft: '0.4rem' }}>({player.rating})</span>
                                                            </span>
                                                            <span
                                                                className={playerUpdated ? styles.scoreUpdated : ''}
                                                                key={`${player.id}-${playerPts}`}
                                                                style={{ color: playerPts > 0 ? '#38bdf8' : playerPts < 0 ? '#ef4444' : '#94a3b8', fontWeight: 700, fontSize: '0.9rem' }}
                                                            >
                                                                {playerPts > 0 ? '+' : ''}{playerPts} pts
                                                            </span>
                                                        </div>

                                                        {!rawStats || rounds.length === 0 ? (
                                                            <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>No scoring data yet</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                {rounds.map((r: any) => (
                                                                    <div key={r.roundNumber} style={{
                                                                        background: '#1e293b', border: '1px solid #334155',
                                                                        borderRadius: '8px', padding: '0.5rem 0.65rem',
                                                                        minWidth: '130px', flex: '1',
                                                                    }}>
                                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Round {r.roundNumber}</div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                                                                            <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                                                                {r.strokes} <span style={{ color: r.toPar < 0 ? '#4ade80' : r.toPar > 0 ? '#f87171' : '#94a3b8', fontSize: '0.75rem' }}>({r.toPar > 0 ? '+' : ''}{r.toPar})</span>
                                                                            </span>
                                                                            <span
                                                                                className={playerUpdated ? styles.scoreUpdated : ''}
                                                                                key={`${player.id}-r${r.roundNumber}-${r.totalPoints}`}
                                                                                style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}
                                                                            >
                                                                                {r.totalPoints > 0 ? '+' : ''}{r.totalPoints}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', fontSize: '0.72rem', color: '#94a3b8' }}>
                                                                            {(r.breakdown?.albatrosses || 0) > 0 && <span style={{ color: '#fbbf24' }}>Alb: {r.breakdown.albatrosses}</span>}
                                                                            <span>Egl: {r.breakdown?.eagles || 0}</span>
                                                                            <span>B: {r.breakdown?.birdies || 0}</span>
                                                                            <span>P: {r.breakdown?.pars || 0}</span>
                                                                            <span>Bg: {r.breakdown?.bogeys || 0}</span>
                                                                            <span>Dbl: {r.breakdown?.doubles || 0}</span>
                                                                            {(r.breakdown?.triples || 0) > 0 && <span style={{ color: '#ef4444' }}>Tri+: {r.breakdown.triples}</span>}
                                                                        </div>
                                                                    </div>
                                                                ))}

                                                                {isMulti && totals && (
                                                                    <div style={{
                                                                        background: '#0f1f3d', border: '1px solid #3b82f6',
                                                                        borderRadius: '8px', padding: '0.5rem 0.65rem',
                                                                        minWidth: '130px', flex: '1',
                                                                    }}>
                                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Total</div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                                                                            <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                                                                {totals.strokes} <span style={{ color: totals.toPar < 0 ? '#4ade80' : totals.toPar > 0 ? '#f87171' : '#94a3b8', fontSize: '0.75rem' }}>({totals.toPar > 0 ? '+' : ''}{totals.toPar})</span>
                                                                            </span>
                                                                            <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>{totals.totalPoints > 0 ? '+' : ''}{totals.totalPoints}</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', fontSize: '0.72rem', color: '#94a3b8' }}>
                                                                            {(totals.breakdown?.albatrosses || 0) > 0 && <span style={{ color: '#fbbf24' }}>Alb: {totals.breakdown.albatrosses}</span>}
                                                                            <span>Egl: {totals.breakdown?.eagles || 0}</span>
                                                                            <span>B: {totals.breakdown?.birdies || 0}</span>
                                                                            <span>P: {totals.breakdown?.pars || 0}</span>
                                                                            <span>Bg: {totals.breakdown?.bogeys || 0}</span>
                                                                            <span>Dbl: {totals.breakdown?.doubles || 0}</span>
                                                                            {(totals.breakdown?.triples || 0) > 0 && <span style={{ color: '#ef4444' }}>Tri+: {totals.breakdown.triples}</span>}
                                                                        </div>
                                                                        {(totals.difficultyBonusPct ?? 0) > 0 && (
                                                                            <div style={{
                                                                                marginTop: '0.45rem',
                                                                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                                                                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                                                                                borderRadius: '999px', padding: '0.15rem 0.55rem',
                                                                                fontSize: '0.68rem', fontWeight: 700, color: '#4ade80',
                                                                            }}>
                                                                                <span>⛰</span>
                                                                                <span>+{totals.difficultyBonusPct}% Course Difficulty Bonus</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className={styles.budgetInfo} style={{ marginTop: '0.75rem' }}>Budget remaining: <strong>${entry.budgetRemaining}</strong></div>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
