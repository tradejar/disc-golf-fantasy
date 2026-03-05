'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinLeaguePage() {
    const router = useRouter();
    const [accessCode, setAccessCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/leagues/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to join league');
            }

            // Redirect to the league's page
            router.push(`/leagues/${data.league.id}`);
        } catch (err: any) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem' }}>
                    ← Back to Dashboard
                </Link>

                <div style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '16px',
                    padding: '2rem'
                }}>
                    <h1 style={{ color: 'white', marginTop: 0, marginBottom: '0.5rem' }}>Join a Mini-League</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.5 }}>
                        Enter the 8-character access code provided by the league creator.
                    </p>

                    {error && (
                        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #ef4444' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', color: 'white', fontWeight: 600, marginBottom: '0.5rem' }}>Access Code</label>
                            <input
                                type="text"
                                required
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                                placeholder="e.g. ABCD-1234"
                                maxLength={9}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #334155',
                                    background: '#0f172a',
                                    color: 'white',
                                    fontSize: '1.2rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    textAlign: 'center'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || accessCode.length < 8}
                            style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: '8px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: isSubmitting || accessCode.length < 8 ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting || accessCode.length < 8 ? 0.7 : 1,
                                marginTop: '1rem'
                            }}
                        >
                            {isSubmitting ? 'Joining...' : 'Join League'}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
