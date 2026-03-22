'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NAV_CARDS = [
    { href: '/season', label: 'DRAFT', col: 0 },
    { href: '/leagues', label: 'LEAGUES', col: 1 },
    { href: '/leaderboard', label: 'LEADERBOARD', col: 2 },
    { href: '/tournaments', label: 'MY HISTORY', col: 0 },
    { href: '/leaderboard?tab=stats', label: 'STATS', col: 1 },
    { href: '/premium', label: 'SUBSCRIPTION', col: 2 },
];

const COL_COLORS = ['#4c7ef3', '#1db8a4', '#22c55e'];

export default function HomeCards() {
    const router = useRouter();
    const [clicked, setClicked] = useState<string | null>(null);

    const handleClick = (href: string) => {
        setClicked(href);
        setTimeout(() => { setClicked(null); router.push(href); }, 260);
    };

    return (
        <>
            <style>{`
                @keyframes circlePress {
                    0%   { transform: scale(1); }
                    30%  { transform: scale(0.88); }
                    65%  { transform: scale(1.06); }
                    100% { transform: scale(1); }
                }
                .circ-btn {
                    display: flex; flex-direction: column; align-items: center;
                    gap: 6px; background: none; border: none;
                    cursor: pointer; padding: 0; flex: 1; min-width: 0;
                    -webkit-tap-highlight-color: transparent;
                }
                .circ-disc {
                    border-radius: 50%;
                    width: 68px; height: 68px;
                    transition: transform 0.13s ease, box-shadow 0.13s ease;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12);
                }
                .circ-btn:hover .circ-disc { transform: scale(1.08); }
                .circ-disc.pressed { animation: circlePress 0.26s cubic-bezier(.22,1,.36,1) forwards; }
                .circ-label {
                    font-size: 0.58rem; font-weight: 800; letter-spacing: 0.07em;
                    color: #374151; text-transform: uppercase; text-align: center;
                }
                @media (min-width: 380px) { .circ-disc { width: 78px; height: 78px; } }
            `}</style>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                columnGap: '4px',
                rowGap: '20px',
                padding: '20px 20px 24px',
                maxWidth: '420px',
                margin: '0 auto',
                width: '100%',
            }}>
                {NAV_CARDS.map(card => (
                    <button key={card.href} className="circ-btn" onClick={() => handleClick(card.href)}>
                        <div
                            className={`circ-disc${clicked === card.href ? ' pressed' : ''}`}
                            style={{
                                background: COL_COLORS[card.col],
                                boxShadow: `0 6px 16px rgba(0,0,0,0.28), 0 2px 4px rgba(0,0,0,0.18), 0 3px 10px ${COL_COLORS[card.col]}55`,
                            }}
                        />
                        <span className="circ-label">{card.label}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
