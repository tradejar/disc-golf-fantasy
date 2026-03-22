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

function fmt(n: number) { return Math.round(n); }
function pct(n: number) { return `${Math.round(n)}%`; }
function toPar(n: number) { return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`; }

function buildScoreText(players: PlayerStat[]) {
    if (!players.length) return 'No player data available';
    return players.map(p =>
        `${p.name} (${toPar(p.toPar)})  Egl:${p.breakdown.eagles}  B:${p.breakdown.birdies}  P:${p.breakdown.pars}  Bg:${p.breakdown.bogeys}  Dbl:${p.breakdown.doubles}  Trpl+:${p.breakdown.triples}`
    ).join('     ');
}

function buildStatsText(players: PlayerStat[]) {
    if (!players.length) return 'No stat data available';
    return players.map(p =>
        `${p.name}  FW:${pct(p.advanced.fairwayHits)}  C1Reg:${pct(p.advanced.c1InReg)}  C2Reg:${pct(p.advanced.c2InReg)}  Scr:${pct(p.advanced.scramble)}  C1X:${pct(p.advanced.c1xPutting)}  C2:${pct(p.advanced.c2Putting)}`
    ).join('     ');
}

// Seamlessly looping ticker — uses a ref to measure actual content width
function SeamlessTicker({ text, speed = 60 }: { text: string; speed?: number }) {
    const innerRef = useRef<HTMLSpanElement>(null);
    const [duration, setDuration] = useState(40);

    useEffect(() => {
        if (innerRef.current) {
            const w = innerRef.current.scrollWidth / 2; // half because we duplicate
            setDuration(Math.max(20, w / speed));
        }
    }, [text, speed]);

    return (
        <div style={{ overflow: 'hidden', width: '100%' }}>
            <style>{`
                @keyframes seamlessScroll {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-50%); }
                }
                .seamless-inner {
                    display: inline-block;
                    white-space: nowrap;
                    will-change: transform;
                }
                .seamless-inner:hover { animation-play-state: paused !important; }
            `}</style>
            <span
                ref={innerRef}
                className="seamless-inner"
                style={{
                    animation: `seamlessScroll ${duration}s linear infinite`,
                    fontSize: '0.72rem',
                    color: '#111827',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    padding: '4px 0',
                    display: 'inline-block',
                }}
            >
                {/* Exact duplicate — animate -50% so it loops perfectly */}
                <span>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span>{text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </span>
        </div>
    );
}

function TickerRow({ label, text }: { label: string; text: string }) {
    return (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#9ca3af',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                padding: '4px 12px 0',
            }}>
                {label}
            </div>
            <div style={{ padding: '0 0 4px' }}>
                <SeamlessTicker text={text} speed={55} />
            </div>
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
            .then(d => {
                setPlayers(d.players ?? []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [previous?.id]);

    if (!previous) return null;

    const displayName = previous.name.replace(/^2026\s*/i, '').toUpperCase();
    const mpo = players.filter(p => p.division === 'MPO').slice(0, 12);
    const fpo = players.filter(p => p.division === 'FPO').slice(0, 12);

    // Fallback: if no division split, split by index
    const allPlayers = mpo.length === 0 && fpo.length === 0 ? players.slice(0, 12) : [];

    const mpoScores = buildScoreText(mpo.length ? mpo : allPlayers.slice(0, 6));
    const fpoScores = buildScoreText(fpo.length ? fpo : allPlayers.slice(6));
    const mpoStats = buildStatsText(mpo.length ? mpo : allPlayers.slice(0, 6));
    const fpoStats = buildStatsText(fpo.length ? fpo : allPlayers.slice(6));

    const pendingText = loading ? 'Loading...' : 'No data available for this tournament';

    return (
        <section style={{ background: 'white', borderTop: '1px solid #e5e7eb' }}>
            <div style={{
                padding: '8px 12px 4px',
                fontSize: '0.62rem', fontWeight: 700, color: '#9ca3af',
                letterSpacing: '0.07em', textTransform: 'uppercase',
            }}>
                Previous Tournament
            </div>

            <div style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                padding: '10px 14px 12px',
            }}>
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

            {players.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
                    {pendingText}
                </div>
            ) : (
                <>
                    <TickerRow label="Scores MPO" text={mpoScores} />
                    <TickerRow label="Scores FPO" text={fpoScores} />
                    <TickerRow label="Stats MPO" text={mpoStats} />
                    <TickerRow label="Stats FPO" text={fpoStats} />
                </>
            )}
        </section>
    );
}
