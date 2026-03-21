'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const BENEFITS = [
    { icon: '🤖', title: 'Auto-Draft', desc: 'Never miss a tournament. We\'ll build you a full $950 roster automatically when the draft locks.' },
    { icon: '⭐', title: 'Player Star Ratings', desc: 'See Power, Accuracy, Recovery, Resilience & Versatility ratings on every player in the draft.' },
    { icon: '💬', title: 'Draft Comments', desc: 'Trash-talk your league mates\' picks after a tournament locks. Comments stay visible all season.' },
    { icon: '⚡', title: 'Unlimited Chat', desc: 'Free users can send 1 message every 3 minutes. Premium members chat without any rate limit.' },
];

function PremiumContent() {
    const searchParams = useSearchParams();
    const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [loading, setLoading] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const upgraded = searchParams.get('upgraded') === '1';
    const cancelled = searchParams.get('cancelled') === '1';

    useEffect(() => {
        fetch('/api/premium/status').then(r => r.json()).then(d => {
            if (d.isPremium) setIsPremium(true);
        }).catch(() => { });
    }, []);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/premium/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            });
            const data = await res.json();
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                alert(data.error || 'Something went wrong. Please try again.');
                setLoading(false);
            }
        } catch {
            alert('Network error. Please try again.');
            setLoading(false);
        }
    };

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '3rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-block', marginBottom: '2rem' }}>
                    ← Home
                </Link>

                {/* Success / cancelled banners */}
                {upgraded && (
                    <div style={{ background: '#052e16', border: '1px solid #16a34a', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#4ade80', fontWeight: 600, fontSize: '1rem' }}>
                        🎉 You're now a Premium member! All features unlocked.
                    </div>
                )}
                {cancelled && (
                    <div style={{ background: '#1c1400', border: '1px solid #d97706', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#fbbf24', fontWeight: 600, fontSize: '1rem' }}>
                        ⚠️ Checkout cancelled — your membership is unchanged.
                    </div>
                )}
                {isPremium && !upgraded && (
                    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '1.5rem', color: '#4ade80', fontWeight: 600, fontSize: '1rem', textAlign: 'center' }}>
                        ✅ You already have an active Premium membership. Enjoy the perks!
                    </div>
                )}

                {/* Hero */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>⚡</div>
                    <h1 style={{ color: 'white', fontSize: '2.4rem', fontWeight: 900, margin: '0 0 0.75rem', lineHeight: 1.15 }}>
                        DGPT Fantasy<br />
                        <span style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Premium</span>
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, margin: 0 }}>
                        Support indie development &amp; unlock the full DGPT Fantasy experience.
                    </p>
                </div>

                {/* Benefits grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem', marginBottom: '2.5rem' }}>
                    {BENEFITS.map(b => (
                        <div key={b.title} style={{
                            background: '#1e293b', borderRadius: '12px', border: '1px solid #334155',
                            padding: '1.25rem',
                        }}>
                            <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{b.icon}</div>
                            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>{b.title}</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>{b.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Plan picker + checkout */}
                {!isPremium && (
                    <div style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '2rem' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>Choose a plan</div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Monthly */}
                            {(['monthly', 'yearly'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPlan(p)}
                                    style={{
                                        flex: '1 1 200px',
                                        padding: '1.1rem 1.25rem',
                                        borderRadius: '12px',
                                        border: `2px solid ${plan === p ? '#fbbf24' : '#334155'}`,
                                        background: plan === p ? 'rgba(251,191,36,0.08)' : '#0f172a',
                                        color: plan === p ? '#fbbf24' : '#94a3b8',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>
                                        {p === 'monthly' ? '$4.99 / month' : '$39.99 / year'}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', opacity: 0.8 }}>
                                        {p === 'monthly' ? 'Billed monthly, cancel anytime' : 'Save ~33% vs monthly · Best value'}
                                    </div>
                                    {p === 'yearly' && (
                                        <div style={{ marginTop: '0.35rem', display: 'inline-block', background: 'rgba(251,191,36,0.15)', borderRadius: '4px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 800, color: '#fbbf24' }}>
                                            POPULAR
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: loading ? '#334155' : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                color: loading ? '#64748b' : '#0f172a',
                                fontWeight: 900,
                                fontSize: '1.05rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s',
                                boxShadow: loading ? 'none' : '0 4px 20px rgba(251,191,36,0.3)',
                            }}
                        >
                            {loading
                                ? 'Redirecting…'
                                : `Subscribe ${plan === 'monthly' ? '— $4.99/mo' : '— $39.99/yr'} →`}
                        </button>

                        <p style={{ color: '#475569', fontSize: '0.78rem', textAlign: 'center', marginTop: '1rem', marginBottom: 0 }}>
                            Secured by Stripe · Cancel anytime in your account · No hidden fees
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function PremiumPage() {
    return <Suspense><PremiumContent /></Suspense>;
}
