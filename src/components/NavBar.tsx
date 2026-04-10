'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import SubscriptionPage from './SubscriptionPage';

const NAV_LINKS = [
    { href: '/season', label: 'Draft' },
    { href: '/leagues', label: 'Leagues' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/tournaments', label: 'My History' },
    { href: '/stats', label: 'Stats' },
    { href: '/rules', label: 'Rules' },
];

const NAV_HEIGHT = 56;

function TierBadge() {
    const [isPremium, setIsPremium] = useState<boolean | null>(null);

    useEffect(() => {
        fetch('/api/premium/status')
            .then(r => r.json())
            .then(d => setIsPremium(!!d.isPremium))
            .catch(() => setIsPremium(false));
    }, []);

    if (isPremium === null) return null;

    if (isPremium) {
        return (
            <Link href="/premium" style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'rgba(251,191,36,0.2)',
                border: '1px solid rgba(251,191,36,0.5)',
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#fbbf24',
                letterSpacing: '0.02em',
                textDecoration: 'none',
            }}>
                ⚡ Premium
            </Link>
        );
    }

    return (
        <Link href="/premium" style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '20px',
            padding: '2px 8px 2px 10px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: 'white',
            textDecoration: 'none',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
        }}>
            Free · <span style={{ color: '#fff', fontWeight: 900 }}>Upgrade ↑</span>
        </Link>
    );
}

// DGF circle logo badge
function DGFBadge() {
    return (
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #60a5fa, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                border: '2px solid rgba(255,255,255,0.25)',
            }}>
                <span style={{
                    color: 'white',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                }}>DGF</span>
            </div>
        </Link>
    );
}

export default function NavBar() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <style>{`
                @media (max-width: 640px) {
                    .desktop-nav { display: none !important; }
                    .hamburger { display: flex !important; }
                }
                .hamburger-line {
                    display: block;
                    width: 22px;
                    height: 2px;
                    background: white;
                    transition: all 0.2s;
                }
            `}</style>

            {/* Fixed green header */}
            <header style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                zIndex: 50,
                padding: '0 1rem',
                height: `${NAV_HEIGHT}px`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            }}>
                {/* Left: DGF Badge */}
                <DGFBadge />

                {/* Center: desktop nav */}
                <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="desktop-nav">
                    {NAV_LINKS.map(l => (
                        <Link key={l.href} href={l.href} style={{
                            color: 'rgba(255,255,255,0.9)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            letterSpacing: '0.01em',
                        }}>
                            {l.label}
                        </Link>
                    ))}
                </nav>

                {/* Right: auth + hamburger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                padding: '0.4rem 1rem',
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.4)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                            }}>
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <TierBadge />
                        <UserButton>
                            <UserButton.UserProfilePage
                                label="Subscription"
                                labelIcon={<span style={{ fontSize: '0.9rem' }}>⚡</span>}
                                url="subscription"
                            >
                                <SubscriptionPage />
                            </UserButton.UserProfilePage>
                            <UserButton.MenuItems>
                                <UserButton.Link
                                    label="Manage Subscription"
                                    labelIcon={<span style={{ fontSize: '0.9rem' }}>⚡</span>}
                                    href="/premium"
                                />
                                <UserButton.Link
                                    label="Privacy & ToS"
                                    labelIcon={<span style={{ fontSize: '0.9rem' }}>📄</span>}
                                    href="/privacy"
                                />
                            </UserButton.MenuItems>
                        </UserButton>
                    </SignedIn>

                    {/* Hamburger (mobile only) */}
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="hamburger"
                        aria-label="Menu"
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '4px', display: 'none',
                            flexDirection: 'column', gap: '5px',
                        }}
                    >
                        <span className="hamburger-line" style={{ transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
                        <span className="hamburger-line" style={{ opacity: open ? 0 : 1 }} />
                        <span className="hamburger-line" style={{ transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
                    </button>
                </div>
            </header>

            {/* Spacer */}
            <div style={{ height: `${NAV_HEIGHT}px`, flexShrink: 0 }} />

            {/* Mobile dropdown */}
            {open && (
                <nav style={{
                    position: 'fixed',
                    top: `${NAV_HEIGHT}px`,
                    left: 0, right: 0,
                    zIndex: 49,
                    background: '#15803d',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }} className="mobile-menu">
                    {NAV_LINKS.map(l => (
                        <Link
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            style={{
                                display: 'block',
                                padding: '0.85rem 1.5rem',
                                color: 'white',
                                textDecoration: 'none',
                                fontWeight: 600,
                                fontSize: '1rem',
                                borderBottom: '1px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            {l.label}
                        </Link>
                    ))}
                    <Link
                        href="/premium"
                        onClick={() => setOpen(false)}
                        style={{
                            display: 'block',
                            padding: '0.85rem 1.5rem',
                            color: '#fbbf24',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '1rem',
                        }}
                    >
                        ⚡ Premium
                    </Link>
                </nav>
            )}
        </>
    );
}
