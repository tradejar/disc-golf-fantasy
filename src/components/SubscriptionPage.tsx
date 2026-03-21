'use client';

import { useState, useEffect } from 'react';

const BENEFITS = [
    { icon: '🤖', label: 'Auto-Draft' },
    { icon: '⭐', label: 'Player Star Ratings' },
    { icon: '💬', label: 'Draft Comments' },
    { icon: '⚡', label: 'Unlimited Chat' },
];

export default function SubscriptionPage() {
    const [isPremium, setIsPremium] = useState<boolean | null>(null);
    const [activePlan, setActivePlan] = useState<'monthly' | 'yearly' | null>(null);
    const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [loading, setLoading] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelDone, setCancelDone] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);

    useEffect(() => {
        fetch('/api/premium/status')
            .then(r => r.json())
            .then(d => {
                setIsPremium(!!d.isPremium);
                if (d.plan) {
                    setActivePlan(d.plan);
                    setPlan(d.plan === 'monthly' ? 'yearly' : 'monthly');
                }
            })
            .catch(() => setIsPremium(false));
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
            if (data.checkoutUrl) window.location.href = data.checkoutUrl;
            else { alert(data.error || 'Something went wrong.'); setLoading(false); }
        } catch { alert('Network error.'); setLoading(false); }
    };

    const handleCancel = async () => {
        setCancelling(true);
        try {
            const res = await fetch('/api/premium/cancel', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setCancelDone(true);
                setConfirmCancel(false);
            } else {
                alert(data.error || 'Failed to cancel. Please try again.');
            }
        } catch { alert('Network error.'); }
        setCancelling(false);
    };

    if (isPremium === null) {
        return <div style={{ padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>Loading…</div>;
    }

    return (
        <div style={{ padding: '1.5rem 2rem' }}>
            {/* Status header */}
            {isPremium ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>⚡</span>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>Premium Active</div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                            {activePlan ? `${activePlan.charAt(0).toUpperCase() + activePlan.slice(1)} plan · ` : ''}Renews automatically
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', marginBottom: '0.5rem' }}>
                    Upgrade to Premium
                </div>
            )}

            {cancelDone && (
                <div style={{ marginBottom: '1rem', padding: '0.6rem 0.9rem', background: '#fef3c7', borderRadius: '8px', fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>
                    Subscription cancelled. You'll keep access until the end of your billing period.
                </div>
            )}

            {/* Benefits */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '1.1rem' }}>
                {BENEFITS.map(b => (
                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#374151' }}>
                        <span>{b.icon}</span> {b.label}
                    </div>
                ))}
            </div>

            {/* Plan header */}
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: '0.5rem' }}>
                {isPremium ? 'Your plan · Switch anytime' : 'Choose a plan'}
            </div>

            {/* Plan toggle */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.9rem' }}>
                {(['monthly', 'yearly'] as const).map(p => {
                    const isActive = activePlan === p;
                    return (
                        <button
                            key={p}
                            onClick={() => !isActive && setPlan(p)}
                            disabled={isActive}
                            style={{
                                flex: 1, padding: '0.6rem 0.65rem',
                                borderRadius: '10px', cursor: isActive ? 'default' : 'pointer', textAlign: 'left',
                                border: `2px solid ${isActive ? '#d1d5db' : plan === p ? '#f59e0b' : '#e2e8f0'}`,
                                background: isActive ? '#f3f4f6' : plan === p ? '#fffbeb' : '#f8fafc',
                                color: isActive ? '#9ca3af' : plan === p ? '#92400e' : '#374151',
                                transition: 'all 0.15s', opacity: isActive ? 0.7 : 1,
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: '0.83rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                {p === 'monthly' ? '$2.99 / mo' : '$19.99 / yr'}
                                {isActive && <span style={{ fontSize: '0.63rem', background: '#e5e7eb', borderRadius: '4px', padding: '1px 5px', color: '#6b7280', fontWeight: 600 }}>Current</span>}
                            </div>
                            <div style={{ fontSize: '0.68rem', opacity: 0.7, marginTop: '2px' }}>
                                {p === 'monthly' ? 'Auto-renews monthly' : 'Save ~44% · Auto-renews yearly'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* CTA */}
            <button
                onClick={handleCheckout}
                disabled={loading || activePlan === plan}
                style={{
                    width: '100%', padding: '0.7rem',
                    borderRadius: '8px', border: 'none',
                    cursor: (loading || activePlan === plan) ? 'not-allowed' : 'pointer',
                    background: (loading || activePlan === plan) ? '#e2e8f0' : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                    color: (loading || activePlan === plan) ? '#9ca3af' : '#7c2d12',
                    fontWeight: 800, fontSize: '0.9rem', transition: 'all 0.15s',
                }}
            >
                {loading
                    ? 'Redirecting…'
                    : activePlan === plan
                        ? '✓ Current plan'
                        : isPremium
                            ? `Switch to ${plan} — ${plan === 'monthly' ? '$2.99/mo' : '$19.99/yr'} →`
                            : `Subscribe ${plan === 'monthly' ? '— $2.99/mo' : '— $19.99/yr'} →`}
            </button>

            <div style={{ fontSize: '0.68rem', color: '#9ca3af', textAlign: 'center', marginTop: '0.55rem', marginBottom: isPremium ? '1rem' : 0 }}>
                Secured by Stripe · Cancel anytime
            </div>

            {/* Unsubscribe section — only for premium users */}
            {isPremium && !cancelDone && (
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.85rem' }}>
                    {!confirmCancel ? (
                        <button
                            onClick={() => setConfirmCancel(true)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.78rem', textDecoration: 'underline', padding: 0 }}
                        >
                            Cancel subscription
                        </button>
                    ) : (
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#374151', marginBottom: '0.5rem', fontWeight: 600 }}>
                                Cancel your subscription?
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#6b7280', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                                You'll keep Premium access until the end of your current billing period.
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handleCancel}
                                    disabled={cancelling}
                                    style={{
                                        flex: 1, padding: '0.5rem', borderRadius: '7px', border: '1px solid #fca5a5',
                                        background: cancelling ? '#f9fafb' : '#fff1f2', color: cancelling ? '#9ca3af' : '#dc2626',
                                        fontWeight: 700, fontSize: '0.8rem', cursor: cancelling ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                                </button>
                                <button
                                    onClick={() => setConfirmCancel(false)}
                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '7px', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                    Keep Premium
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
