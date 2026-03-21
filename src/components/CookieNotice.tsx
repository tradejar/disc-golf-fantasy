'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cookie_notice_dismissed';

export default function CookieNotice() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Only show if not already dismissed
        if (!localStorage.getItem(STORAGE_KEY)) {
            setVisible(true);
        }
    }, []);

    if (!visible) return null;

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setVisible(false);
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.97)',
            borderTop: '1px solid #1e293b',
            backdropFilter: 'blur(12px)',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
        }}>
            <p style={{
                margin: 0,
                fontSize: '0.8rem',
                color: '#94a3b8',
                lineHeight: 1.5,
                maxWidth: '680px',
            }}>
                🍪 This site uses <strong style={{ color: '#cbd5e1' }}>essential cookies only</strong> — for authentication via Clerk. No tracking, no analytics, no advertising. These cookies are required for the service to function.{' '}
                <a
                    href="https://clerk.com/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'underline' }}
                >
                    Clerk Privacy Policy
                </a>
            </p>
            <button
                onClick={dismiss}
                style={{
                    flexShrink: 0,
                    padding: '0.4rem 1rem',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#f1f5f9',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                    (e.target as HTMLButtonElement).style.borderColor = '#38bdf8';
                    (e.target as HTMLButtonElement).style.background = '#263347';
                }}
                onMouseLeave={e => {
                    (e.target as HTMLButtonElement).style.borderColor = '#334155';
                    (e.target as HTMLButtonElement).style.background = '#1e293b';
                }}
            >
                Got it
            </button>
        </div>
    );
}
