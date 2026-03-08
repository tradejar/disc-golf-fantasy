import React from 'react';

interface Props {
    distance?: number;
    technical?: number;
    elevation?: number;
    climate?: number;
    bias?: number;
}

export default function CourseRatings({ distance, technical, elevation, climate, bias }: Props) {
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
        { label: 'Dist', val: distance },
        { label: 'Tech', val: technical },
        { label: 'Elev', val: elevation },
        { label: 'Clim', val: climate },
        { label: 'Bias', val: bias },
    ];

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
                <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                        {m.label}
                    </span>
                    {renderStars(m.val)}
                </div>
            ))}
        </div>
    );
}
