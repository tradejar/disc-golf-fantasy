'use client';
import React, { useState, useEffect } from 'react';

interface Props {
    distance?: number;
    technical?: number;
    elevation?: number;
    climate?: number;
    bias?: number;
}

export default function CourseRatings({ distance, technical, elevation, climate, bias }: Props) {
    if (process.env.NEXT_PUBLIC_DISABLE_DYNAMIC_PRICING === 'true') return null;
    if (!distance && !technical && !elevation && !climate && !bias) return null;

    const renderStars = (count?: number) => {
        if (!count) return <span style={{ color: '#64748b', fontSize: '12px' }}>—</span>;
        return (
            <div style={{ display: 'flex', gap: '1px', color: '#fbbf24' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} style={{ opacity: i < count ? 1 : 0.2, fontSize: '11px', lineHeight: 1 }}>★</span>
                ))}
            </div>
        );
    };

    const metrics = [
        { label: 'Dist', val: distance, desc: 'Measures the sheer length of the course' },
        { label: 'Tech', val: technical, desc: 'Measures the required shot-shaping and precision' },
        { label: 'Elev', val: elevation, desc: 'Measures the physical and strategic impact of hills' },
        { label: 'Clim', val: climate, desc: 'Measures the typical wind, rain, and weather severity' },
        { label: 'Bias', val: bias, desc: 'Advantage: 1 = Forehand, 5 = Backhand' },
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
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginTop: '0.75rem',
            marginBottom: '0.5rem',
            background: 'rgba(15, 23, 42, 0.4)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid #334155',
            justifyContent: 'space-between'
        }}>
            {metrics.map((m) => (
                <div
                    key={m.label}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', position: 'relative' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveTooltip(activeTooltip === m.label ? null : m.label);
                    }}
                    onMouseEnter={() => setActiveTooltip(m.label)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    title={m.desc} // Native fallback
                >
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
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
