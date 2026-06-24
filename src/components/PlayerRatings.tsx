'use client';
import React, { useState, useEffect } from 'react';
import { Player } from '@/data/mock-schema';
import Link from 'next/link';

interface Props {
    player: Player;
    isPremium?: boolean;
}

export default function PlayerRatings({ player, isPremium = false }: Props) {
    const a = player.abilities;
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    // Auto-dismiss tooltip after 3 seconds on mobile
    useEffect(() => {
        if (activeTooltip) {
            const timer = setTimeout(() => setActiveTooltip(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [activeTooltip]);

    // Non-premium users always see a lock pill — encourages upgrade regardless of data availability
    if (!isPremium) {
        return (
            <Link
                href="/premium"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '0.3rem',
                    background: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.25)',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#fbbf24',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                }}
                onClick={e => e.stopPropagation()}
            >
                🔒 Premium
            </Link>
        );
    }

    // Bar fill colour by rating band — subtle green→amber→red scale.
    const barColor = (v: number) =>
        v >= 75 ? '#34d399' : v >= 50 ? '#38bdf8' : v >= 30 ? '#fbbf24' : '#fb7185';

    const metrics = [
        { label: 'Pow', val: a?.power, desc: 'Power — distance and the ability to attack long holes off the tee.' },
        { label: 'Acc', val: a?.accuracy, desc: 'Accuracy — hitting fairways and landing in good positions.' },
        { label: 'Rec', val: a?.recovery, desc: 'Recovery — scrambling to save par after a wayward shot.' },
        { label: 'Putt', val: a?.putting, desc: 'Putting — making putts from inside and outside the circle.' },
        { label: 'Con', val: a?.consistency, desc: 'Consistency — being well-rounded and avoiding big mistakes. Rated 0–100 vs the tour field.' },
    ];

    return (
        <div style={{
            display: 'inline-flex',
            gap: '7px',
            flexWrap: 'wrap',
            marginTop: '0.3rem',
            background: 'rgba(15, 23, 42, 0.3)',
            padding: '0.35rem 0.5rem',
            borderRadius: '6px',
            border: '1px solid #1e293b',
            width: 'fit-content',
        }}>
            {metrics.map((m) => {
                const v = m.val ?? null;
                return (
                    <div
                        key={m.label}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', position: 'relative' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveTooltip(activeTooltip === m.label ? null : m.label);
                        }}
                        onMouseEnter={() => setActiveTooltip(m.label)}
                        onMouseLeave={() => setActiveTooltip(null)}
                    >
                        <span style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                            {m.label}
                        </span>
                        <div style={{ width: '40px', height: '5px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden' }}>
                            {v !== null && (
                                <div style={{ width: `${v}%`, height: '100%', background: barColor(v), borderRadius: '3px' }} />
                            )}
                        </div>

                        {/* Number + definition only on hover/tap */}
                        {activeTooltip === m.label && (
                            <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginBottom: '6px',
                                background: '#1e293b',
                                color: '#e2e8f0',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                width: 'max-content',
                                maxWidth: '200px',
                                textAlign: 'center',
                                zIndex: 10,
                                lineHeight: 1.35,
                                border: '1px solid #334155',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.25)',
                                pointerEvents: 'none',
                            }}>
                                <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: v !== null ? barColor(v) : '#64748b', marginBottom: '2px' }}>
                                    {v !== null ? `${v}` : '—'}<span style={{ fontSize: '9px', color: '#64748b' }}>{v !== null ? ' / 100' : ''}</span>
                                </div>
                                {m.desc}
                                <div style={{
                                    position: 'absolute', top: '100%', left: '50%', marginLeft: '-4px',
                                    borderWidth: '4px', borderStyle: 'solid',
                                    borderColor: '#1e293b transparent transparent transparent',
                                }} />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
