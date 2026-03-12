'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './LeaderboardClient.module.css';

interface LeaderboardEntry {
    rank: number;
    entryId: string;
    userId: string;
    displayName: string;
    totalPoints: number;
    budgetRemaining: number;
    roster: Array<{ firstName: string; lastName: string; division: string; price: number; rating: number }> | null;
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

export default function LeaderboardClient({ tournamentId, tournamentName, currentUserId, leagueId = null, variant = 'global' }: LeaderboardClientProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

    useEffect(() => {
        let url = `/api/leaderboard?tournamentId=${tournamentId}`;
        if (currentUserId) url += `&userId=${currentUserId}`;
        if (leagueId) url += `&leagueId=${leagueId}`;

        fetch(url)
            .then(r => r.json())
            .then(data => {
                const fetched: LeaderboardEntry[] = data.entries || [];
                setEntries(fetched);
                // Auto-expand own entry on load
                const own = fetched.find(e => e.userId === currentUserId);
                if (own) setExpandedEntry(own.entryId);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [tournamentId, currentUserId]);

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
                <h1 className={styles.title} style={{ fontSize: variant === 'league' ? '1.5rem' : undefined }}>{tournamentName}</h1>
                <p className={styles.subtitle}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'} · Ranked by Fantasy Points</p>
            </div>

            <div className={styles.list}>
                {entries.map((entry) => {
                    const isMe = entry.userId === currentUserId;
                    const isExpanded = expandedEntry === entry.entryId;
                    const mpo = (entry.roster || []).filter(p => p.division === 'MPO');
                    const fpo = (entry.roster || []).filter(p => p.division === 'FPO');

                    return (
                        <div
                            key={entry.entryId}
                            className={`${styles.entryCard} ${isMe ? styles.myEntry : ''} ${entry.rank === 1 ? styles.first : ''}`}
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

                                {/* Points */}
                                <div className={styles.points}>
                                    <span className={entry.totalPoints > 0 ? styles.positive : styles.neutral}>
                                        {entry.totalPoints != null ? entry.totalPoints.toFixed(1) : '—'}
                                    </span>
                                    <span className={styles.pointsLabel}>pts</span>
                                </div>
                            </div>

                            {/* Expanded roster detail */}
                            {isExpanded && (
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
                                    <div className={styles.budgetInfo}>
                                        Budget remaining: <strong>${entry.budgetRemaining}</strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
