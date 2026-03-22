'use client';

import { useEffect, useState } from 'react';
import { SEASON_2026 } from '@/data/tournaments';

interface LeaderboardEntry {
    entryId: string;
    displayName: string;
    totalPoints: number;
    pdgaRating?: number;
    budgetRemaining?: number;
}

interface TournamentResult {
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

function buildScoreTicker(entries: LeaderboardEntry[]): string {
    if (!entries.length) return '';
    return entries.map((e, i) => {
        const rating = e.pdgaRating ? ` (${e.pdgaRating})` : '';
        return `${i + 1}. ${e.displayName}${rating} – ${e.totalPoints}pts`;
    }).join('   ');
}

function buildStatsTicker(entries: LeaderboardEntry[]): string {
    if (!entries.length) return '';
    // Show budget remaining as a proxy for roster efficiency
    return entries.map((e, i) => {
        const budget = typeof e.budgetRemaining === 'number'
            ? ` · $${e.budgetRemaining.toFixed(0)} left`
            : '';
        return `${i + 1}. ${e.displayName} – ${e.totalPoints}pts${budget}`;
    }).join('   ');
}

function TickerRow({ label, text }: { label: string; text: string }) {
    const content = `${text}    ·    ${text}    ·    `;
    return (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{
                fontSize: '0.62rem',
                color: '#9ca3af',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                padding: '4px 12px 2px',
            }}>
                {label}
            </div>
            <div style={{ overflow: 'hidden' }}>
                <style>{`
                    @keyframes pScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                    .prow { display: inline-block; white-space: nowrap; animation: pScroll 28s linear infinite; }
                    .prow:hover { animation-play-state: paused; }
                `}</style>
                <span className="prow" style={{
                    fontSize: '0.72rem',
                    color: '#111827',
                    fontWeight: 500,
                    padding: '3px 12px 6px',
                    display: 'inline-block',
                    letterSpacing: '0.01em',
                }}>
                    {content}
                </span>
            </div>
        </div>
    );
}

export default function PreviousTournament() {
    const [result, setResult] = useState<TournamentResult | null>(null);
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const previous = getPreviousTournament();

    useEffect(() => {
        if (!previous) return;
        // Fetch tournament winner record
        fetch(`/api/tournament-results?tournamentId=${previous.id}`)
            .then(r => r.json())
            .then(d => { if (d.result) setResult(d.result); })
            .catch(() => { });

        // Fetch leaderboard entries for this specific tournament
        fetch(`/api/leaderboard?tournamentId=${previous.id}`)
            .then(r => r.json())
            .then(d => {
                const all: LeaderboardEntry[] = d.entries ?? [];
                setEntries(all.slice(0, 10));
            })
            .catch(() => { });
    }, [previous?.id]);

    if (!previous) return null;

    const displayName = previous.name.replace(/^2026\s*/i, '').toUpperCase();

    const scoreTicker = buildScoreTicker(entries) ||
        (result?.mpo_winner ? `MPO: ${result.mpo_winner} ${result.mpo_score ?? ''} · FPO: ${result.fpo_winner ?? '—'} ${result.fpo_score ?? ''}` : 'Results pending...');

    const statsTicker = buildStatsTicker(entries) || scoreTicker;

    // Split into MPO/FPO if we have winner data from tournament_results
    const mpoScore = entries.length > 0 ? buildScoreTicker(entries.slice(0, 5)) :
        (result?.mpo_winner ? `MPO Winner: ${result.mpo_winner} ${result.mpo_score ?? ''}` : 'Pending...');
    const fpoScore = result?.fpo_winner
        ? `FPO Winner: ${result.fpo_winner} ${result.fpo_score ?? ''}`
        : (entries.length ? buildScoreTicker(entries.slice(5)) || buildScoreTicker(entries) : 'Pending...');
    const mpoStats = entries.length > 0 ? buildStatsTicker(entries.slice(0, 5)) : 'Stats pending...';
    const fpoStats = entries.length > 0 ? buildStatsTicker(entries.slice(5)) || buildStatsTicker(entries) : 'Stats pending...';

    return (
        <section style={{ background: 'white', borderTop: '1px solid #e5e7eb' }}>
            {/* Section label */}
            <div style={{
                padding: '8px 12px 4px',
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#9ca3af',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
            }}>
                Previous Tournament
            </div>

            {/* Green banner */}
            <div style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                padding: '10px 14px 12px',
            }}>
                <div style={{
                    color: 'white',
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    textTransform: 'uppercase',
                }}>
                    {displayName}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.76rem', marginTop: '3px' }}>
                    {previous.location}
                </div>
            </div>

            <TickerRow label="Scores MPO" text={mpoScore} />
            <TickerRow label="Scores FPO" text={fpoScore} />
            <TickerRow label="Stats MPO" text={mpoStats} />
            <TickerRow label="Stats FPO" text={fpoStats} />
        </section>
    );
}
