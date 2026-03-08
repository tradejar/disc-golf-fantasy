import React from 'react';
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
        { label: 'Pow', val: power },
        { label: 'Acc', val: accuracy },
        { label: 'Rec', val: recovery },
        { label: 'Res', val: resilience },
        { label: 'Ver', val: versatility },
    ];

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
                <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                    <span style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                        {m.label}
                    </span>
                    {renderStars(m.val)}
                </div>
            ))}
        </div>
    );
}
