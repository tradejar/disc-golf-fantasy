'use client';
import React, { useState, useEffect } from 'react';
import { Player } from '@/data/mock-schema';

interface Props {
    player: Player;
}

export default function PlayerRatings({ player }: Props) {
    const { power, accuracy, recovery, resilience, versatility } = player;

    // If player doesn't have ratings, don't break the layout but show placeholders
    const hasRatings = power !== undefined || accuracy !== undefined || recovery !== undefined;
    if (!hasRatings) return null;

    const renderStars = (count?: number) => {
        if (!count) return <span style={{ color: '#64748b', fontSize: '9px' }}>—</span>;
        return (
            <div style={{ display: 'flex', gap: '1px', color: '#38bdf8' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ opacity: i < count ? 1 : 0.2, fontSize: '9px', lineHeight: 1 }}>★</span>
                ))}
            </div>
        );
    };

    const metrics = [
        { label: 'Pow', val: power, desc: 'Measures maximum throwing distance' },
        { label: 'Acc', val: accuracy, desc: 'Measures precision in hitting gaps and landing zones' },
        { label: 'Rec', val: recovery, desc: 'Measures scrambling ability and saving par from trouble' },
        { label: 'Res', val: resilience, desc: 'Measures mental toughness and performing under pressure' },
        { label: 'Ver', val: versatility, desc: 'Measures the variety of shot types (forehand, backhand, etc)' },
    ];

    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    // Auto-dismiss tooltip after 3 seconds on mobile
    useEffect(() => {
        if (activeTooltip) {
            const timer = setTimeout(() => setActiveTooltip(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [activeTooltip]);

    return (
        <div style={{
            display: 'flex',
            gap: '0.4rem',
            flexWrap: 'wrap',
            marginTop: '0.3rem',
            background: 'rgba(15, 23, 42, 0.3)',
            padding: '0.3rem 0.5rem',
            borderRadius: '6px',
            border: '1px solid #1e293b',
        }}>
            {metrics.map((m) => (
                <div
                    key={m.label}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', cursor: 'pointer', position: 'relative' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveTooltip(activeTooltip === m.label ? null : m.label);
                    }}
                    onMouseEnter={() => setActiveTooltip(m.label)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    title={m.desc} // Native fallback
                >
                    <span style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                        {m.label}
                    </span>
                    {renderStars(m.val)}

                    {/* Custom Tooltip */}
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
                            maxWidth: '180px',
                            textAlign: 'center',
                            zIndex: 10,
                            lineHeight: 1.3,
                            border: '1px solid #334155',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                        }}>
                            {m.desc}
                            {/* Little triangle arrow */}
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                marginLeft: '-4px',
                                borderWidth: '4px',
                                borderStyle: 'solid',
                                borderColor: '#1e293b transparent transparent transparent'
                            }} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
