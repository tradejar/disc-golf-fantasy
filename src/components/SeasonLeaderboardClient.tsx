'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SEASON_2026 } from '@/data/tournaments';

interface TournamentEntry {
    tournamentId: string;
    tournamentName: string;
    points: number | null;
    entryId: string;
}

interface SeasonEntry {
    rank: number;
    userId: string;
    displayName: string;
    totalPoints: number;
    tournaments: TournamentEntry[];
}

interface Props {
    title: string;
    subtitle: string;
    leagueId?: string | null;
}

export default function SeasonLeaderboardClient({ title, subtitle, leagueId = null }: Props) {
    const [season, setSeason] = useState<SeasonEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        let url = '/api/leaderboard/season';
        if (leagueId) url += `?leagueId=${leagueId}`;

        fetch(url)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error);
                else setSeason(d.season || []);
            })
            .catch(() => setError('Failed to load'))
            .finally(() => setLoading(false));
    }, [leagueId]);

    const playedTournaments = SEASON_2026.filter(t => {
        const today = new Date().toISOString().split('T')[0];
        return t.startDate <= today;
    });

    return (
        <div>
            {/* Header */}
            <h1 style={{ color: '#f8fafc', fontSize: '1.8rem', marginBottom: '0.25rem' }}>
                {title}
            </h1>
            <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
                {subtitle}
            </p>

            {/* Per-tournament quick links */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem', alignSelf: 'center' }}>Individual:</span>
                {SEASON_2026.map(t => {
                    const url = leagueId ? `/leagues/${leagueId}` : `/leaderboard/${t.id}`;
                    return (
                        <Link
                            key={t.id}
                            href={url}
                            style={{
                                fontSize: '0.8rem',
                                color: '#38bdf8',
                                textDecoration: 'none',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0.2rem 0.6rem',
                                background: '#1e293b'
                            }}
                        >
                            {t.name.replace('2026 ', '')}
                        </Link>
                    );
                })}
            </div>

            {/* Season standings */}
            {loading && <div style={{ color: '#94a3b8' }}>Loading season standings...</div>}
            {error && <div style={{ color: '#f87171' }}>Error: {error}</div>}
            {!loading && !error && season.length === 0 && (
                <div style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem 0' }}>
                    No entries yet. Draft a team to get on the board!
                </div>
            )}

            {!loading && !error && season.map(entry => (
                <div
                    key={entry.userId}
                    style={{
                        background: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        marginBottom: '0.75rem',
                        overflow: 'hidden'
                    }}
                >
                    {/* Main row */}
                    <div
                        onClick={() => setExpanded(expanded === entry.userId ? null : entry.userId)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '1rem 1.25rem',
                            cursor: 'pointer',
                            gap: '1rem'
                        }}
                    >
                        <span style={{
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            color: entry.rank === 1 ? '#f59e0b' : '#64748b',
                            minWidth: '2rem'
                        }}>
                            {entry.rank === 1 ? '🏆' : `#${entry.rank}`}
                        </span>
                        <span style={{ flex: 1, color: '#f8fafc', fontWeight: 'bold', fontSize: '1rem' }}>
                            {entry.displayName}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {entry.tournaments.length} tournament{entry.tournaments.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '5rem', textAlign: 'right' }}>
                            {entry.totalPoints.toFixed(1)} pts
                        </span>
                    </div>

                    {/* Expanded breakdown */}
                    {expanded === entry.userId && (
                        <div style={{ borderTop: '1px solid #334155', padding: '0.75rem 1.25rem', background: '#0f172a' }}>
                            {SEASON_2026.map(t => {
                                const te = entry.tournaments.find(x => x.tournamentId === t.id);
                                return (
                                    <div key={t.id} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.4rem 0',
                                        borderBottom: '1px solid #1e293b',
                                        opacity: te ? 1 : 0.4
                                    }}>
                                        <Link
                                            href={`/leaderboard/${t.id}`}
                                            style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.85rem' }}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {t.name.replace('2026 ', '')}
                                        </Link>
                                        <span style={{ color: te && te.points != null ? '#4ade80' : '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                            {te ? (te.points != null ? `${te.points.toFixed(1)} pts` : '— (Pending)') : '—'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
