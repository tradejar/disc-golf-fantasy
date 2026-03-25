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

const BASE_SPEED = 20; // px per second (RAF-driven)
const ROW_SPEEDS = [BASE_SPEED * 1.00, BASE_SPEED * 0.95, BASE_SPEED * 1.05, BASE_SPEED * 0.97];

/** RAF-driven seamless ticker — click toggles pause, swipe navigates */
function SeamlessTicker({
    children, speed, tickerKey,
}: { children: ReactNode; speed: number; tickerKey: string }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const posRef = useRef(0);          // current scroll position in px
    const pausedRef = useRef(false);   // use ref so RAF doesn't need to re-subscribe
    const lastTsRef = useRef<number>(0);
    const rafRef = useRef<number>(0);
    const inertiaVelRef = useRef(0);   // inertia velocity in px/s (positive = forward scroll)

    // Touch swipe — track recent velocity
    const touchStartX = useRef<number | null>(null);
    const touchStartPos = useRef(0);
    const touchVelSamples = useRef<{ x: number; t: number }[]>([]);
    const isDragging = useRef(false);

    // Start/restart the RAF loop when content changes
    useEffect(() => {
        posRef.current = 0;
        lastTsRef.current = 0;

        function loop(ts: number) {
            const track = trackRef.current;
            if (track) {
                const dt = lastTsRef.current ? (ts - lastTsRef.current) / 1000 : 0;
                lastTsRef.current = ts;

                if (!pausedRef.current) {
                    const halfWidth = track.scrollWidth / 2;
                    if (halfWidth > 0) {
                        // Apply inertia velocity if any, decaying toward zero
                        if (Math.abs(inertiaVelRef.current) > 1) {
                            posRef.current = (posRef.current + inertiaVelRef.current * dt + halfWidth) % halfWidth;
                            inertiaVelRef.current *= 0.4; // friction (lower = stops faster)
                        } else {
                            inertiaVelRef.current = 0;
                            posRef.current = (posRef.current + speed * dt) % halfWidth;
                        }
                    }
                }
                track.style.transform = `translateX(${-posRef.current}px)`;
            }
            rafRef.current = requestAnimationFrame(loop);
        }

        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tickerKey, speed]);

    const handleClick = useCallback(() => {
        pausedRef.current = !pausedRef.current;
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartPos.current = posRef.current;
        touchVelSamples.current = [{ x: e.touches[0].clientX, t: performance.now() }];
        inertiaVelRef.current = 0;
        pausedRef.current = true;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (touchStartX.current === null || !trackRef.current) return;
        e.preventDefault();
        const now = performance.now();
        const cx = e.touches[0].clientX;
        // Keep only last 80ms of samples for velocity estimation
        touchVelSamples.current = [
            ...touchVelSamples.current.filter(s => now - s.t < 80),
            { x: cx, t: now },
        ];
        const dx = touchStartX.current - cx; // left-swipe = positive
        const halfWidth = trackRef.current.scrollWidth / 2;
        if (halfWidth <= 0) return;
        posRef.current = ((touchStartPos.current + dx) % halfWidth + halfWidth) % halfWidth;
    }, []);

    const handleTouchEnd = useCallback(() => {
        touchStartX.current = null;
        lastTsRef.current = 0;
        // Calculate release velocity from recent samples
        const samples = touchVelSamples.current;
        if (samples.length >= 2) {
            const newest = samples[samples.length - 1];
            const oldest = samples[0];
            const dtMs = newest.t - oldest.t;
            if (dtMs > 0) {
                // dx in finger direction: negative finger dx = positive scroll
                const fingerVel = (oldest.x - newest.x) / (dtMs / 1000); // px/s in scroll direction
                inertiaVelRef.current = fingerVel;
            }
        }
        touchVelSamples.current = [];
        pausedRef.current = false;
    }, []);

    // Helper: finish a drag and compute inertia
    const endDrag = useCallback((currentX: number) => {
        if (!isDragging.current) return;
        isDragging.current = false;
        const samples = touchVelSamples.current;
        if (samples.length >= 2) {
            const newest = samples[samples.length - 1];
            const oldest = samples[0];
            const dtMs = newest.t - oldest.t;
            if (dtMs > 0) {
                inertiaVelRef.current = (oldest.x - newest.x) / (dtMs / 1000);
            }
        }
        touchVelSamples.current = [];
        touchStartX.current = null;
        lastTsRef.current = 0;
        pausedRef.current = false;
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        touchStartX.current = e.clientX;
        touchStartPos.current = posRef.current;
        touchVelSamples.current = [{ x: e.clientX, t: performance.now() }];
        inertiaVelRef.current = 0;
        pausedRef.current = true;
        isDragging.current = true;
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging.current || touchStartX.current === null || !trackRef.current) return;
        const now = performance.now();
        const cx = e.clientX;
        touchVelSamples.current = [
            ...touchVelSamples.current.filter(s => now - s.t < 80),
            { x: cx, t: now },
        ];
        const dx = touchStartX.current - cx;
        const halfWidth = trackRef.current.scrollWidth / 2;
        if (halfWidth <= 0) return;
        posRef.current = ((touchStartPos.current + dx) % halfWidth + halfWidth) % halfWidth;
    }, []);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        endDrag(e.clientX);
    }, [endDrag]);

    const handleMouseLeave = useCallback((e: React.MouseEvent) => {
        endDrag(e.clientX);
    }, [endDrag]);

    return (
        <div
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                overflow: 'hidden', width: '100%',
                cursor: isDragging.current ? 'grabbing' : 'grab',
                touchAction: 'pan-y',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            <div
                ref={trackRef}
                style={{ display: 'inline-block', whiteSpace: 'nowrap', willChange: 'transform' }}
            >
                <span style={{ display: 'inline', color: '#111827', fontWeight: 500, letterSpacing: '0.01em' }}>
                    {children}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </span>
                <span style={{ display: 'inline', color: '#111827', fontWeight: 500, letterSpacing: '0.01em' }}>
                    {children}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                </span>
            </div>
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
