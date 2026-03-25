'use client';

import React, { useEffect, useState, useRef, ReactNode, useCallback } from 'react';
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
function hasName(p: PlayerStat) { return !p.name.startsWith('#'); }

const TOP_N = 20; // Show only top 20 finishers per division
const GAP = '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'; // separator between players

function buildScoreNodes(players: PlayerStat[]): ReactNode {
    const named = players.filter(hasName).slice(0, TOP_N);
    if (!named.length) return <span>Results pending…</span>;
    return (
        <>
            {named.map((p, i) => (
                <React.Fragment key={p.pdgaNumber}>
                    {i > 0 && GAP}
                    <span style={{ color: '#6b7280', fontSize: '0.78em', fontWeight: 700, marginRight: '3px' }}>
                        #{i + 1}
                    </span>
                    <strong>{p.name}</strong>
                    {' '}
                    <em>({toParStr(p.toPar)}) Egl:{p.breakdown.eagles} B:{p.breakdown.birdies} P:{p.breakdown.pars} Bg:{p.breakdown.bogeys} Dbl:{p.breakdown.doubles} Trpl+:{p.breakdown.triples}</em>
                </React.Fragment>
            ))}
        </>
    );
}

function buildStatsNodes(players: PlayerStat[]): ReactNode {
    const named = players.filter(hasName).slice(0, TOP_N);
    if (!named.length) return <span>Stats pending…</span>;
    return (
        <>
            {named.map((p, i) => (
                <React.Fragment key={p.pdgaNumber}>
                    {i > 0 && GAP}
                    <span style={{ color: '#6b7280', fontSize: '0.78em', fontWeight: 700, marginRight: '3px' }}>
                        #{i + 1}
                    </span>
                    <strong>{p.name}</strong>
                    {' '}
                    <em>FW:{pct(p.advanced.fairwayHits)} C1Reg:{pct(p.advanced.c1InReg)} C2Reg:{pct(p.advanced.c2InReg)} Scr:{pct(p.advanced.scramble)} C1X:{pct(p.advanced.c1xPutting)} C2:{pct(p.advanced.c2Putting)}</em>
                </React.Fragment>
            ))}
        </>
    );
}

const BASE_SPEED = 14;
const ROW_SPEEDS = [BASE_SPEED * 1.00, BASE_SPEED * 0.95, BASE_SPEED * 1.05, BASE_SPEED * 0.97];

/** Seamless auto-scrolling ticker with click-to-pause and touch swipe navigation */
function SeamlessTicker({
    children, speed, tickerKey,
}: { children: ReactNode; speed: number; tickerKey: string }) {
    const innerRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [duration, setDuration] = useState(120);
    const [paused, setPaused] = useState(false);

    // Touch swipe state
    const touchStartX = useRef<number | null>(null);
    const touchStartScrollLeft = useRef<number>(0);
    const animFrameRef = useRef<number | null>(null);

    // Measure content width for scroll duration
    useEffect(() => {
        if (innerRef.current) {
            const w = innerRef.current.scrollWidth / 2;
            setDuration(Math.max(60, w / speed));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tickerKey, speed]);

    // Click toggles pause
    const handleClick = useCallback(() => {
        setPaused(p => !p);
    }, []);

    // Touch: start
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        // Capture current CSS animation translate position
        const span = innerRef.current;
        if (span) {
            const computed = getComputedStyle(span);
            const matrix = new DOMMatrix(computed.transform);
            touchStartScrollLeft.current = matrix.m41; // translateX value
        }
        setPaused(true); // pause while swiping
    }, []);

    // Touch: move — manually shift translateX
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStartX.current === null || !innerRef.current) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartX.current;
        const span = innerRef.current;
        const halfWidth = span.scrollWidth / 2;
        let newX = touchStartScrollLeft.current + dx;
        // Wrap around: keep in [-halfWidth, 0]
        newX = ((newX % -halfWidth) - halfWidth) % -halfWidth;
        span.style.transform = `translateX(${newX}px)`;
        span.style.animationPlayState = 'paused';
    }, []);

    // Touch: end — resume auto-scroll from current position
    const handleTouchEnd = useCallback(() => {
        touchStartX.current = null;
        // Small delay before resuming so the snap feels natural
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = requestAnimationFrame(() => {
            if (innerRef.current) {
                // Sync animation offset to current visual position
                innerRef.current.style.animationPlayState = 'running';
                innerRef.current.style.transform = '';
            }
            setPaused(false);
        });
    }, []);

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                overflow: 'hidden',
                width: '100%',
                cursor: paused ? 'pointer' : 'pointer',
                position: 'relative',
            }}
            title={paused ? 'Click to resume' : 'Click to pause · Swipe to navigate'}
        >
            {/* Pause indicator */}
            {paused && (
                <div style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.55)', borderRadius: 4,
                    color: 'white', fontSize: '0.6rem', fontWeight: 700,
                    padding: '1px 5px', letterSpacing: '0.06em',
                    pointerEvents: 'none', zIndex: 2,
                }}>
                    ⏸ PAUSED
                </div>
            )}
            <span
                ref={innerRef}
                className="ticker-track"
                style={{
                    ['--ticker-dur' as string]: `${duration}s`,
                    color: '#111827',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    animationPlayState: paused ? 'paused' : 'running',
                }}
            >
                <span style={{ display: 'inline' }}>{children}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span style={{ display: 'inline' }}>{children}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </span>
        </div>
    );
}

function TickerRow({
    label, children, speed, tickerKey,
}: { label: string; children: ReactNode; speed: number; tickerKey: string }) {
    return (
        <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div style={{
                fontSize: '0.62rem', fontWeight: 700, color: '#9ca3af',
                letterSpacing: '0.07em', textTransform: 'uppercase',
                padding: '4px 12px 0',
            }}>
                {label} <span style={{ color: '#d1d5db', fontWeight: 400 }}>· Top {TOP_N}</span>
            </div>
            <SeamlessTicker speed={speed} tickerKey={tickerKey}>{children}</SeamlessTicker>
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
    const hasData = players.filter(hasName).length > 0;

    const mpoKey = mpo.filter(hasName).slice(0, TOP_N).map(p => p.pdgaNumber).join(',');
    const fpoKey = fpo.filter(hasName).slice(0, TOP_N).map(p => p.pdgaNumber).join(',');

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
                    <span style={{ marginLeft: 8, opacity: 0.65, fontSize: '0.68rem' }}>
                        · Click to pause · Swipe to navigate
                    </span>
                </div>
            </div>

            {!hasData ? (
                <div style={{ padding: '12px', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
                    {pendingText}
                </div>
            ) : (
                <>
                    <TickerRow label="Scores MPO" speed={ROW_SPEEDS[0]} tickerKey={mpoKey}>
                        {buildScoreNodes(mpo)}
                    </TickerRow>
                    <TickerRow label="Scores FPO" speed={ROW_SPEEDS[1]} tickerKey={fpoKey}>
                        {buildScoreNodes(fpo)}
                    </TickerRow>
                    <TickerRow label="Stats MPO" speed={ROW_SPEEDS[2]} tickerKey={mpoKey + '-s'}>
                        {buildStatsNodes(mpo)}
                    </TickerRow>
                    <TickerRow label="Stats FPO" speed={ROW_SPEEDS[3]} tickerKey={fpoKey + '-s'}>
                        {buildStatsNodes(fpo)}
                    </TickerRow>
                </>
            )}
        </section>
    );
}
