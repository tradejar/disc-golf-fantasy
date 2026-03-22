'use client';

import { useEffect, useState } from 'react';
import { SEASON_2026 } from '@/data/tournaments';

interface PlayerEntry {
    display_name: string;
    division: 'MPO' | 'FPO';
    total_points: number;
    pdga_number?: number;
    round_scores?: string;
}

interface TournamentResult {
    tournament_name?: string;
    mpo_winner?: string;
    fpo_winner?: string;
    mpo_score?: string;
    fpo_score?: string;
}

function getPreviousTournament() {
    const now = new Date();
    const completed = SEASON_2026.filter(t => new Date(t.endDate + 'T23:59:59Z') < now);
    return completed[completed.length - 1] ?? null;
}

// Horizontal scrolling score ticker row
function ScoreTicker({ label, text }: { label: string; text: string }) {
    const doubled = `${text}     ★     ${text}     ★     `;
    return (
        <div style={{ overflow: 'hidden', padding: '2px 0' }}>
            <div style={{
                fontSize: '0.7rem',
                color: '#6b7280',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0 12px',
                marginBottom: '2px',
            }}>
                {label}
            </div>
            <div style={{ overflow: 'hidden', background: '#16a34a12', position: 'relative' }}>
                <style>{`
                    @keyframes prevTicker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                    .prev-ticker-inner { display: inline-block; white-space: nowrap; animation: prevTicker 28s linear infinite; }
                    .prev-ticker-inner:hover { animation-play-state: paused; }
                `}</style>
                <span className="prev-ticker-inner" style={{
                    fontSize: '0.72rem',
                    color: '#111827',
                    fontWeight: 500,
                    padding: '4px 12px',
                    letterSpacing: '0.01em',
                }}>
                    {doubled}
                </span>
            </div>
        </div>
    );
}

export default function PreviousTournament() {
    const [result, setResult] = useState<TournamentResult | null>(null);
    const [leaderboard, setLeaderboard] = useState<PlayerEntry[]>([]);
    const previous = getPreviousTournament();

    useEffect(() => {
        if (!previous) return;
        // Fetch tournament winners
        fetch(`/api/tournament-results?tournamentId=${previous.id}`)
            .then(r => r.json())
            .then(d => { if (d.result) setResult(d.result); })
            .catch(() => { });

        // Fetch leaderboard for top players
        fetch(`/api/leaderboard?tournamentId=${previous.id}`)
            .then(r => r.json())
            .then(d => { if (d.entries) setLeaderboard(d.entries.slice(0, 5)); })
            .catch(() => { });
    }, [previous?.id]);

    if (!previous) return null;

    const displayName = previous.name.replace(/^2026\s*/i, '');

    // Build ticker text from leaderboard or winner data
    const mpoText = leaderboard.filter(e => e.division === 'MPO')
        .map((e, i) => `${i + 1}. ${e.display_name} · ${e.total_points}pts`)
        .join('   ') || (result?.mpo_winner ? `Winner: ${result.mpo_winner} ${result.mpo_score ?? ''}` : 'Results pending');

    const fpoText = leaderboard.filter(e => e.division === 'FPO')
        .map((e, i) => `${i + 1}. ${e.display_name} · ${e.total_points}pts`)
        .join('   ') || (result?.fpo_winner ? `Winner: ${result.fpo_winner} ${result.fpo_score ?? ''}` : 'Results pending');

    return (
        <section style={{ background: 'white', borderTop: '1px solid #e5e7eb' }}>
            {/* Section label */}
            <div style={{
                padding: '10px 16px 4px',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#9ca3af',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
            }}>
                Previous Tournament
            </div>

            {/* Green banner with tournament name */}
            <div style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                padding: '12px 16px',
                margin: '0 0 8px',
            }}>
                <div style={{
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    textTransform: 'uppercase',
                }}>
                    {displayName}
                </div>
                <div style={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '0.78rem',
                    marginTop: '2px',
                    fontWeight: 500,
                }}>
                    {previous.location}
                </div>
            </div>

            {/* Score tickers */}
            <div style={{ paddingBottom: '12px' }}>
                <ScoreTicker label="Scores MPO" text={mpoText} />
                <ScoreTicker label="Scores FPO" text={fpoText} />
            </div>
        </section>
    );
}
