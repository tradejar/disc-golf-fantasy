'use client';

import { useEffect, useState } from 'react';
import { SEASON_2026 } from '@/data/tournaments';

interface LeaderboardEntry {
    user_id: string;
    display_name: string;
    division: 'MPO' | 'FPO';
    total_points: number;
    pdga_number?: number;
    pdga_rating?: number;
    birdie_total?: number;
    eagle_total?: number;
    par_total?: number;
    double_bogey_total?: number;
    albatross_total?: number;
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
    if (!entries.length) return 'Results pending...';
    return entries.map((e, i) => {
        const rating = e.pdga_rating ? `(${e.pdga_rating})` : '';
        const pts = `${e.total_points}pts`;
        return `${i + 1}. ${e.display_name}${rating} – ${pts}`;
    }).join('   ');
}

function buildStatsTicker(entries: LeaderboardEntry[]): string {
    if (!entries.length) return 'Stats pending...';
    return entries.map(e => {
        const parts = [];
        if (e.eagle_total) parts.push(`Egl:${e.eagle_total}`);
        if (e.birdie_total) parts.push(`Brd:${e.birdie_total}`);
        if (e.par_total) parts.push(`Par:${e.par_total}`);
        if (e.double_bogey_total) parts.push(`Dbl:${e.double_bogey_total}`);
        return `${e.display_name} – ${parts.join(' ') || e.total_points + 'pts'}`;
    }).join('   ');
}

function TickerRow({ label, text }: { label: string; text: string }) {
    const content = `${text}     ★     ${text}     ★     `;
    return (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{
                fontSize: '0.65rem',
                color: '#9ca3af',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                padding: '4px 12px 2px',
            }}>
                {label}
            </div>
            <div style={{ overflow: 'hidden', background: '#f9fafb' }}>
                <style>{`
                    @keyframes prevScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                    .prev-row { display: inline-block; white-space: nowrap; animation: prevScroll 30s linear infinite; }
                    .prev-row:hover { animation-play-state: paused; }
                `}</style>
                <span className="prev-row" style={{
                    fontSize: '0.71rem',
                    color: '#111827',
                    fontWeight: 500,
                    padding: '3px 12px 5px',
                    display: 'inline-block',
                }}>
                    {content}
                </span>
            </div>
        </div>
    );
}

export default function PreviousTournament() {
    const [result, setResult] = useState<TournamentResult | null>(null);
    const [mpoEntries, setMpoEntries] = useState<LeaderboardEntry[]>([]);
    const [fpoEntries, setFpoEntries] = useState<LeaderboardEntry[]>([]);
    const previous = getPreviousTournament();

    useEffect(() => {
        if (!previous) return;
        // Fetch tournament winner record
        fetch(`/api/tournament-results?tournamentId=${previous.id}`)
            .then(r => r.json())
            .then(d => { if (d.result) setResult(d.result); })
            .catch(() => { });

        // Fetch leaderboard entries for this tournament
        fetch(`/api/leaderboard?tournamentId=${previous.id}`)
            .then(r => r.json())
            .then(d => {
                const entries: LeaderboardEntry[] = d.entries ?? [];
                setMpoEntries(entries.filter(e => e.division === 'MPO').slice(0, 8));
                setFpoEntries(entries.filter(e => e.division === 'FPO').slice(0, 8));
            })
            .catch(() => { });
    }, [previous?.id]);

    if (!previous) return null;

    const displayName = previous.name.replace(/^2026\s*/i, '').toUpperCase();

    const mpoScore = buildScoreTicker(mpoEntries) ||
        (result?.mpo_winner ? `Winner: ${result.mpo_winner} ${result.mpo_score ?? ''}` : 'Results pending...');
    const fpoScore = buildScoreTicker(fpoEntries) ||
        (result?.fpo_winner ? `Winner: ${result.fpo_winner} ${result.fpo_score ?? ''}` : 'Results pending...');
    const mpoStats = buildStatsTicker(mpoEntries);
    const fpoStats = buildStatsTicker(fpoEntries);

    return (
        <section style={{ background: 'white', borderTop: '1px solid #e5e7eb' }}>
            {/* Section label */}
            <div style={{
                padding: '8px 12px 4px',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#9ca3af',
                letterSpacing: '0.06em',
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
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.76rem', marginTop: '3px' }}>
                    {previous.location}
                </div>
            </div>

            {/* 4 ticker rows */}
            <TickerRow label="Scores MPO" text={mpoScore} />
            <TickerRow label="Scores FPO" text={fpoScore} />
            <TickerRow label="Stats MPO" text={mpoStats} />
            <TickerRow label="Stats FPO" text={fpoStats} />
        </section>
    );
}
