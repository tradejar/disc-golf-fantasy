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

// 3-column color progression matching design: blue · teal · green
const COL_COLORS = ['#4a7ff5', '#14b8a6', '#22c55e'];

export default function HomeCards() {
    const router = useRouter();
    const [clicked, setClicked] = useState<string | null>(null);

    const handleClick = (href: string) => {
        setClicked(href);
        setTimeout(() => {
            setClicked(null);
            router.push(href);
        }, 280);
    };

    return (
        <>
            <style>{`
                @keyframes circlePress {
                    0%   { transform: scale(1); }
                    25%  { transform: scale(0.91); }
                    60%  { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
                .circ-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.55rem;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    flex: 1;
                    min-width: 0;
                    -webkit-tap-highlight-color: transparent;
                }
                .circ-disc {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .circ-btn:active .circ-disc,
                .circ-disc.pressed {
                    animation: circlePress 0.28s cubic-bezier(.22,1,.36,1) forwards;
                }
                .circ-btn:hover .circ-disc {
                    transform: scale(1.06);
                }
                .circ-label {
                    font-size: 0.6rem;
                    font-weight: 800;
                    letter-spacing: 0.07em;
                    color: #374151;
                    text-transform: uppercase;
                    text-align: center;
                    line-height: 1.2;
                    margin-top: 2px;
                }
                @media (min-width: 360px) {
                    .circ-disc { width: 88px; height: 88px; }
                }
                @media (min-width: 480px) {
                    .circ-disc { width: 100px; height: 100px; }
                    .circ-label { font-size: 0.68rem; }
                }
            `}</style>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.6rem 0.25rem',
                padding: '2rem 1rem 2.5rem',
                maxWidth: '440px',
                margin: '0 auto',
                width: '100%',
            }}>
                {NAV_CARDS.map(card => {
                    const color = COL_COLORS[card.col];
                    const isPressed = clicked === card.href;
                    return (
                        <button
                            key={card.href}
                            className="circ-btn"
                            onClick={() => handleClick(card.href)}
                        >
                            <div
                                className={`circ-disc${isPressed ? ' pressed' : ''}`}
                                style={{
                                    background: color,
                                    boxShadow: `0 4px 14px ${color}55`,
                                }}
                            />
                            <span className="circ-label">{card.label}</span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
