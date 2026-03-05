'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

const NAV_LINKS = [
    { href: '/', label: 'Season' },
    { href: '/tournaments', label: 'My History' },
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/rules', label: 'Rules' },
];

const NAV_HEIGHT = 56;

export default function NavBar() {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Fixed header — position:fixed is immune to iOS URL bar jitter */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                padding: '0 1rem',
                height: `${NAV_HEIGHT}px`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#0f172a',
                borderBottom: '1px solid #334155',
            }}>
                {/* Logo */}
                <Link href="/" style={{ fontWeight: 900, fontSize: '1.2rem', color: '#38bdf8', textDecoration: 'none', letterSpacing: '-0.03em', flexShrink: 0 }}>
                    DGF
                </Link>

                {/* Desktop nav */}
                <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="desktop-nav">
                    {NAV_LINKS.map(l => (
                        <Link key={l.href} href={l.href} style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>
                            {l.label}
                        </Link>
                    ))}
                </nav>

                {/* Right side: auth + hamburger */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <SignedOut>
                        <SignInButton mode="modal">
                            <button style={{ background: '#3b82f6', color: 'white', padding: '0.45rem 0.9rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton>
                            <UserButton.MenuItems>
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
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'none', flexDirection: 'column', gap: '5px' }}
                    >
                        <span style={{ display: 'block', width: '22px', height: '2px', background: open ? '#38bdf8' : 'white', transition: 'all 0.2s', transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
                        <span style={{ display: 'block', width: '22px', height: '2px', background: 'white', opacity: open ? 0 : 1, transition: 'all 0.2s' }} />
                        <span style={{ display: 'block', width: '22px', height: '2px', background: open ? '#38bdf8' : 'white', transition: 'all 0.2s', transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
                    </button>
                </div>
            </header>

            {/* Spacer — always 56px to push page content below the fixed header */}
            <div style={{ height: `${NAV_HEIGHT}px`, flexShrink: 0 }} />

            {/* Mobile dropdown — also fixed so it floats over content without affecting layout */}
            {open && (
                <nav style={{
                    position: 'fixed',
                    top: `${NAV_HEIGHT}px`,
                    left: 0,
                    right: 0,
                    zIndex: 49,
                    background: '#1e293b',
                    borderBottom: '1px solid #334155',
                    padding: '0.5rem 0',
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
                                fontWeight: 'bold',
                                fontSize: '1rem',
                                borderBottom: '1px solid #334155',
                            }}
                        >
                            {l.label}
                        </Link>
                    ))}
                </nav>
            )}

            <style>{`
                @media (max-width: 640px) {
                    .desktop-nav { display: none !important; }
                    .hamburger { display: flex !important; }
                }
            `}</style>
        </>
    );
}
