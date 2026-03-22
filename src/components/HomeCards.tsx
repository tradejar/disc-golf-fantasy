'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Gradient stops cycling blue → teal → green across 3 columns
const CARD_COLORS = [
    { col: 0, color: '#3b82f6', glow: 'rgba(59,130,246,0.5)' },   // blue
    { col: 1, color: '#06b6d4', glow: 'rgba(6,182,212,0.5)' },    // teal
    { col: 2, color: '#10b981', glow: 'rgba(16,185,129,0.5)' },   // green
];

const NAV_CARDS = [
    { href: '/season', label: 'DRAFT', icon: '🥏', col: 0 },
    { href: '/leagues', label: 'LEAGUES', icon: '🏆', col: 1 },
    { href: '/leaderboard', label: 'LEADERBOARD', icon: '📊', col: 2 },
    { href: '/tournaments', label: 'MY HISTORY', icon: '📅', col: 0 },
    { href: '/leaderboard?tab=stats', label: 'STATS', icon: '📈', col: 1 },
    { href: '/premium', label: 'SUBSCRIPTION', icon: '⚡', col: 2 },
];

export default function HomeCards() {
    const router = useRouter();
    const [clicked, setClicked] = useState<string | null>(null);
    const [hovered, setHovered] = useState<string | null>(null);

    const handleClick = (href: string) => {
        setClicked(href);
        setTimeout(() => {
            setClicked(null);
            router.push(href);
        }, 320);
    };

    return (
        <>
            <style>{`
                @keyframes circleRipple {
                    0%   { box-shadow: 0 0 0 0px var(--btn-glow); opacity: 1; transform: scale(0.93); }
                    40%  { box-shadow: 0 0 0 14px transparent; opacity: 0.8; transform: scale(1.06); }
                    70%  { transform: scale(0.97); }
                    100% { box-shadow: 0 0 0 0px transparent; opacity: 1; transform: scale(1); }
                }
                .circ-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.6rem;
                    cursor: pointer;
                    background: none;
                    border: none;
                    padding: 0;
                    flex: 1;
                    min-width: 0;
                }
                .circ-inner {
                    width: 88px;
                    height: 88px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                    position: relative;
                }
                .circ-btn:hover .circ-inner {
                    transform: scale(1.07);
                }
                .circ-inner.clicked {
                    animation: circleRipple 0.32s cubic-bezier(.22,1,.36,1) forwards;
                }
                .circ-label {
                    font-size: 0.62rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    color: #cbd5e1;
                    text-transform: uppercase;
                    text-align: center;
                    line-height: 1.2;
                }
                @media (min-width: 400px) {
                    .circ-inner { width: 96px; height: 96px; }
                }
                @media (min-width: 600px) {
                    .circ-inner { width: 108px; height: 108px; font-size: 2.3rem; }
                    .circ-label { font-size: 0.7rem; }
                }
            `}</style>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1.4rem 0.5rem',
                padding: '2.5rem 1.2rem',
                maxWidth: '520px',
                margin: '0 auto',
                width: '100%',
            }}>
                {NAV_CARDS.map((card) => {
                    const { color, glow } = CARD_COLORS[card.col];
                    const isClicked = clicked === card.href;
                    const isHovered = hovered === card.href;

                    return (
                        <button
                            key={card.href}
                            className="circ-btn"
                            onClick={() => handleClick(card.href)}
                            onMouseEnter={() => setHovered(card.href)}
                            onMouseLeave={() => setHovered(null)}
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-expect-error css custom props
                            style={{ '--btn-glow': glow }}
                        >
                            <div
                                className={`circ-inner${isClicked ? ' clicked' : ''}`}
                                style={{
                                    background: `radial-gradient(circle at 35% 35%, ${color}dd, ${color}88)`,
                                    boxShadow: isHovered
                                        ? `0 0 0 3px ${color}44, 0 8px 28px ${glow}`
                                        : `0 4px 16px ${color}44`,
                                    border: `2px solid ${color}66`,
                                }}
                            >
                                {card.icon}
                            </div>
                            <span className="circ-label">{card.label}</span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
