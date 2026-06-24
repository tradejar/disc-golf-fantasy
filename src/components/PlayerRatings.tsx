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
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            marginTop: '0.3rem',
            background: 'rgba(15, 23, 42, 0.3)',
            padding: '0.4rem 0.5rem',
            borderRadius: '6px',
            border: '1px solid #1e293b',
        }}>
            {metrics.map((m) => {
                const v = m.val ?? null;
                return (
                    <div
                        key={m.label}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', position: 'relative' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setActiveTooltip(activeTooltip === m.label ? null : m.label);
                        }}
                        onMouseEnter={() => setActiveTooltip(m.label)}
                        onMouseLeave={() => setActiveTooltip(null)}
                        title={m.desc} // Native fallback
                    >
                        <span style={{ width: '26px', fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                            {m.label}
                        </span>
                        <div style={{ flex: 1, height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                            {v !== null && (
                                <div style={{ width: `${v}%`, height: '100%', background: barColor(v), borderRadius: '3px', transition: 'width 0.3s' }} />
                            )}
                        </div>
                        <span style={{ width: '22px', textAlign: 'right', fontSize: '9px', fontFamily: 'monospace', fontWeight: 700, color: v !== null ? '#e2e8f0' : '#64748b' }}>
                            {v !== null ? v : '—'}
                        </span>

                        {/* Custom Tooltip */}
                        {activeTooltip === m.label && (
                            <div style={{
                                position: 'absolute',
                                bottom: '100%',
                                left: '0',
                                marginBottom: '6px',
                                background: '#1e293b',
                                color: '#e2e8f0',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                width: 'max-content',
                                maxWidth: '210px',
                                textAlign: 'left',
                                zIndex: 10,
                                lineHeight: 1.35,
                                border: '1px solid #334155',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                                pointerEvents: 'none',
                            }}>
                                {m.desc}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
