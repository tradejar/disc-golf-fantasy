'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { grossUp, platformFee } from '@/lib/fee-utils';

function JoinLeagueContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const prefillCode = searchParams.get('code') ?? '';

    const [accessCode, setAccessCode] = useState(prefillCode.toUpperCase());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Payment confirmation step (for paid leagues)
    const [paymentLeague, setPaymentLeague] = useState<{
        leagueId: string; leagueName: string; entryFee: number;
    } | null>(null);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const handleCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/leagues/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to look up league');

            if (data.requiresPayment) {
                // Show payment confirmation card
                setPaymentLeague({ leagueId: data.leagueId, leagueName: data.leagueName, entryFee: data.entryFee });
            } else {
                router.push(`/leagues/${data.league.id}`);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckout = async () => {
        if (!paymentLeague) return;
        setIsCheckingOut(true);
        try {
            const res = await fetch(`/api/leagues/${paymentLeague.leagueId}/checkout`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');
            window.location.href = data.url; // Redirect to Stripe
        } catch (err: any) {
            setError(err.message);
            setIsCheckingOut(false);
        }
    };

    const charged = paymentLeague ? grossUp(paymentLeague.entryFee) : 0;
    const pFee = paymentLeague ? platformFee(paymentLeague.entryFee) : 0;
    const prizeContrib = paymentLeague ? paymentLeague.entryFee - pFee : 0;

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <Link href="/leagues" style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem', fontSize: '0.95rem' }}>
                    ← Back to Leagues
                </Link>

                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2rem' }}>

                    {/* Step 1: Enter code */}
                    {!paymentLeague ? (
                        <>
                            <h1 style={{ color: 'white', marginTop: 0, marginBottom: '0.4rem', fontSize: '1.75rem', fontWeight: 900 }}>Join a League</h1>
                            <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6, marginTop: 0 }}>
                                Enter the 8-character invite code shared by the league creator.
                            </p>

                            {error && (
                                <div style={{ background: '#450a0a', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dc2626', fontSize: '0.9rem' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleCodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: 'white', fontWeight: 600, marginBottom: '0.5rem' }}>Invite Code</label>
                                    <input
                                        type="text" required
                                        value={accessCode}
                                        onChange={e => setAccessCode(e.target.value.toUpperCase())}
                                        placeholder="ABCD1234"
                                        maxLength={9}
                                        style={{
                                            width: '100%', padding: '0.85rem', boxSizing: 'border-box',
                                            borderRadius: '8px', border: '1px solid #334155',
                                            background: '#0f172a', color: 'white',
                                            fontSize: '1.4rem', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: '4px', textAlign: 'center',
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit" disabled={isSubmitting || accessCode.length < 8}
                                    style={{
                                        background: isSubmitting || accessCode.length < 8 ? '#334155' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                        color: 'white', border: 'none', padding: '1rem',
                                        borderRadius: '10px', fontSize: '1.05rem', fontWeight: 700,
                                        cursor: isSubmitting || accessCode.length < 8 ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {isSubmitting ? 'Looking up…' : 'Continue →'}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Step 2: Payment confirmation */
                        <>
                            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</div>
                                <h1 style={{ color: 'white', margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 900 }}>
                                    {paymentLeague.leagueName}
                                </h1>
                                <p style={{ color: '#94a3b8', margin: 0 }}>Paid league — review your entry fee</p>
                            </div>

                            {error && (
                                <div style={{ background: '#450a0a', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dc2626', fontSize: '0.9rem' }}>
                                    {error}
                                </div>
                            )}

                            {/* Fee breakdown */}
                            <div style={{ background: '#0f172a', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid #334155' }}>
                                {[
                                    { label: 'Entry fee', value: `$${paymentLeague.entryFee.toFixed(2)}` },
                                    { label: 'Platform fee (10%, cap $5)', value: `$${pFee.toFixed(2)}`, sub: true },
                                    { label: 'Your prize pool contribution', value: `$${prizeContrib.toFixed(2)}`, sub: true },
                                    { label: 'Processing fee (Stripe 2.9% + $0.30)', value: `~$${(charged - paymentLeague.entryFee).toFixed(2)}`, sub: true },
                                ].map((row, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: i < 3 ? '1px solid #1e293b' : 'none' }}>
                                        <span style={{ color: row.sub ? '#64748b' : '#94a3b8', fontSize: row.sub ? '0.85rem' : '0.95rem' }}>{row.label}</span>
                                        <span style={{ color: row.sub ? '#64748b' : '#94a3b8', fontSize: row.sub ? '0.85rem' : '0.95rem', fontWeight: row.sub ? 400 : 600 }}>{row.value}</span>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
                                    <span style={{ color: 'white', fontWeight: 700 }}>Total billed</span>
                                    <span style={{ color: '#38bdf8', fontWeight: 900, fontSize: '1.1rem' }}>${charged.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={handleCheckout} disabled={isCheckingOut}
                                style={{
                                    width: '100%', background: isCheckingOut ? '#334155' : 'linear-gradient(135deg, #059669, #0ea5e9)',
                                    color: 'white', border: 'none', padding: '1rem',
                                    borderRadius: '10px', fontSize: '1.05rem', fontWeight: 700,
                                    cursor: isCheckingOut ? 'not-allowed' : 'pointer',
                                    boxShadow: isCheckingOut ? 'none' : '0 4px 14px rgba(5,150,105,0.35)',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                {isCheckingOut ? 'Redirecting to Stripe…' : `Pay $${charged.toFixed(2)} & Join →`}
                            </button>
                            <button
                                onClick={() => { setPaymentLeague(null); setError(''); }}
                                style={{ width: '100%', background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '0.75rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.95rem' }}
                            >
                                ← Change code
                            </button>
                            <p style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', marginTop: '0.75rem', marginBottom: 0 }}>
                                Secured by Stripe. Card details never touch our servers.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
}

export default function JoinLeaguePage() {
    return (
        <Suspense>
            <JoinLeagueContent />
        </Suspense>
    );
}
