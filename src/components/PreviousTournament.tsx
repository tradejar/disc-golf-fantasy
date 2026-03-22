'use client';

import { useEffect, useState, useRef } from 'react';
import { SEASON_2026 } from '@/data/tournaments';

interface PlayerStat {
    pdgaNumber: string;
    name: string;
    division: string;
    toPar: number;
    breakdown: {
        eagles: number; birdies: number; pars: number;
        bogeys: number; doubles: number; triples: number;
    };
    advanced: {
        fairwayHits: number; c1InReg: number; c2InReg: number;
        scramble: number; c1xPutting: number; c2Putting: number;
    };
}

function getPreviousTournament() {
    const now = new Date();
    const completed = SEASON_2026.filter(t => new Date(t.endDate + 'T23:59:59Z') < now);
    return completed[completed.length - 1] ?? null;
}

function pct(n: number) { return `${Math.round(n)}%`; }
function toParStr(n: number) { return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`; }

// Only include players whose name was resolved (not a #NUMBER fallback)
function hasName(p: PlayerStat) { return !p.name.startsWith('#'); }

function buildScoreText(players: PlayerStat[]) {
    const named = players.filter(hasName);
    if (!named.length) return 'Results pending...';
    return named.map(p =>
        `${p.name} (${toParStr(p.toPar)})  Egl:${p.breakdown.eagles}  B:${p.breakdown.birdies}  P:${p.breakdown.pars}  Bg:${p.breakdown.bogeys}  Dbl:${p.breakdown.doubles}  Trpl+:${p.breakdown.triples}`
    ).join('     ');
}

function buildStatsText(players: PlayerStat[]) {
    const named = players.filter(hasName);
    if (!named.length) return 'Stats pending...';
    return named.map(p =>
        `${p.name}  FW:${pct(p.advanced.fairwayHits)}  C1Reg:${pct(p.advanced.c1InReg)}  C2Reg:${pct(p.advanced.c2InReg)}  Scr:${pct(p.advanced.scramble)}  C1X:${pct(p.advanced.c1xPutting)}  C2:${pct(p.advanced.c2Putting)}`
    ).join('     ');
}

// BASE speed 14px/s — each row gets a ±5% variance for organic feel
const BASE_SPEED = 14;
const ROW_SPEEDS = [
    BASE_SPEED * 1.00,  // Scores MPO  — exactly base
    BASE_SPEED * 0.95,  // Scores FPO  — 5% slower
    BASE_SPEED * 1.05,  // Stats MPO   — 5% faster
    BASE_SPEED * 0.97,  // Stats FPO   — 3% slower
];

function SeamlessTicker({ text, speed }: { text: string; speed: number }) {
    const innerRef = useRef<HTMLSpanElement>(null);
    const [duration, setDuration] = useState(120);

    useEffect(() => {
        if (innerRef.current) {
            const w = innerRef.current.scrollWidth / 2;
            setDuration(Math.max(60, w / speed));
        }
    }, [text, speed]);

    return (
        <div style={{ overflow: 'hidden', width: '100%' }}>
            <span
                ref={innerRef}
                className="ticker-track"
                style={{
                    ['--ticker-dur' as string]: `${duration}s`,
                    fontSize: '0.72rem',
                    color: '#111827',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    padding: '3px 0 5px',
                }}
            >
                <span>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </span>
        </div>
    );
}

function TickerRow({ label, text, speed }: { label: string; text: string; speed: number }) {
    return (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{
                fontSize: '0.62rem', fontWeight: 700, color: '#9ca3af',
                letterSpacing: '0.07em', textTransform: 'uppercase',
                padding: '4px 12px 0',
            }}>
                {label}
            </div>
            <SeamlessTicker text={text} speed={speed} />
        </div>
    );
}

export default function PreviousTournament() {
    const [players, setPlayers] = useState<PlayerStat[]>([]);
    const [loading, setLoading] = useState(true);
    const previous = getPreviousTournament();

    useEffect(() => {
        if (!previous) { setLoading(false); return; }
        fetch(`/api/player-stats?tournamentId=${previous.id}`)
            .then(r => r.json())
            .then(d => { setPlayers(d.players ?? []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [previous?.id]);

    if (!previous) return null;

    const displayName = previous.name.replace(/^2026\s*/i, '').toUpperCase();
    const mpo = players.filter(p => p.division === 'MPO');
    const fpo = players.filter(p => p.division === 'FPO');

    const mpoScores = buildScoreText(mpo);
    const fpoScores = buildScoreText(fpo);
    const mpoStats = buildStatsText(mpo);
    const fpoStats = buildStatsText(fpo);

    const pendingText = loading ? 'Loading...' : 'No data available for this tournament';

    return (
        <section style={{ background: 'white', borderTop: '1px solid #e5e7eb', boxShadow: '0 -4px 16px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.15)' }}>
            <div style={{
                padding: '8px 12px 4px', fontSize: '0.62rem', fontWeight: 700,
                color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
                Previous Tournament
            </div>

            <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: '10px 14px 12px' }}>
                <div style={{
                    color: 'white', fontSize: '1.15rem', fontWeight: 900,
                    letterSpacing: '-0.02em', lineHeight: 1.15, textTransform: 'uppercase',
                }}>
                    {displayName}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.76rem', marginTop: '3px' }}>
                    {previous.location}
                </div>
            </div>

            {players.filter(hasName).length === 0 ? (
                <div style={{ padding: '12px', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
                    {pendingText}
                </div>
            ) : (
                <>
                    <TickerRow label="Scores MPO" text={mpoScores} speed={ROW_SPEEDS[0]} />
                    <TickerRow label="Scores FPO" text={fpoScores} speed={ROW_SPEEDS[1]} />
                    <TickerRow label="Stats MPO" text={mpoStats} speed={ROW_SPEEDS[2]} />
                    <TickerRow label="Stats FPO" text={fpoStats} speed={ROW_SPEEDS[3]} />
                </>
            )}
        </section>
    );
}
