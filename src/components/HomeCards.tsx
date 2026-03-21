'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NAV_CARDS = [
    {
        href: '/season',
        label: 'Season',
        desc: 'Draft your roster for each event and track live scores as they happen.',
        accent: '#3b82f6',
    },
    {
        href: '/leagues',
        label: 'Leagues',
        desc: 'Create private leagues, invite friends, and compete for your own prizepool.',
        accent: '#8b5cf6',
    },
    {
        href: '/leaderboard',
        label: 'Leaderboard',
        desc: "See who's leading the 2026 season standings across all completed events.",
        accent: '#f59e0b',
    },
    {
        href: '/tournaments',
        label: 'My History',
        desc: 'Review your entries, final rosters, and point totals from past tournaments.',
        accent: '#10b981',
    },
];

export default function HomeCards() {
    const router = useRouter();
    const [hovered, setHovered] = useState<string | null>(null);
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
        @keyframes cardFlash {
          0%   { opacity: 1; transform: scale(1); }
          30%  { opacity: 0.85; transform: scale(0.97); }
          60%  { opacity: 1; transform: scale(1.015); }
          100% { opacity: 1; transform: scale(1); }
        }
        .home-card {
          display: flex;
          align-items: stretch;
          background: #111827;
          border: 1px solid #1e293b;
          border-radius: 10px;
          text-decoration: none;
          overflow: hidden;
          cursor: pointer;
          transition:
            transform 0.18s cubic-bezier(.22,1,.36,1),
            box-shadow 0.18s ease,
            border-color 0.18s ease;
        }
        .home-card:hover {
          transform: translateY(-4px) scale(1.01);
        }
        .home-card.clicked {
          animation: cardFlash 0.28s ease forwards;
        }
      `}</style>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '0.75rem',
                marginBottom: '4rem',
            }}>
                {NAV_CARDS.map(card => {
                    const isHovered = hovered === card.href;
                    const isClicked = clicked === card.href;

                    return (
                        <div
                            key={card.href}
                            className={`home-card${isClicked ? ' clicked' : ''}`}
                            style={{
                                boxShadow: isHovered
                                    ? `0 8px 32px ${card.accent}33, 0 2px 8px rgba(0,0,0,0.4)`
                                    : '0 2px 8px rgba(0,0,0,0.2)',
                                borderColor: isHovered ? `${card.accent}66` : '#1e293b',
                            }}
                            onMouseEnter={() => setHovered(card.href)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={() => handleClick(card.href)}
                        >
                            {/* Left accent bar — expands on hover */}
                            <div style={{
                                width: isHovered ? '6px' : '4px',
                                background: card.accent,
                                flexShrink: 0,
                                transition: 'width 0.18s ease',
                            }} />
                            <div style={{ padding: '1.75rem 1.5rem' }}>
                                <div style={{
                                    color: isHovered ? card.accent : 'white',
                                    fontWeight: 800,
                                    fontSize: '1.3rem',
                                    marginBottom: '0.5rem',
                                    letterSpacing: '-0.02em',
                                    transition: 'color 0.18s ease',
                                }}>
                                    {card.label}
                                </div>
                                <div style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.55 }}>
                                    {card.desc}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
