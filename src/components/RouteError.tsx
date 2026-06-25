'use client';
import { useEffect } from 'react';

// Shared error boundary UI for route-level error.tsx files. Branded, with a
// retry (reset) instead of Next's default white error page.
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('Route error:', error);
    }, [error]);

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🥏</div>
                <h1 style={{ color: '#f8fafc', fontSize: '1.3rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Something went wrong</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                    We hit a snag loading this page. Try again — if it keeps happening, give it a minute and refresh.
                </p>
                <button
                    onClick={reset}
                    style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
                >
                    Try again
                </button>
            </div>
        </main>
    );
}
