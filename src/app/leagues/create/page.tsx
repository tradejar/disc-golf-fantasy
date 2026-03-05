'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateLeaguePage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [entryFee, setEntryFee] = useState('0');
    const [payoutStructure, setPayoutStructure] = useState('WINNER_TAKE_ALL');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/leagues/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    entryFee: Number(entryFee),
                    payoutStructure
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create league');
            }

            // Redirect to the new league's page
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
                    <h1 style={{ color: 'white', marginTop: 0, marginBottom: '0.5rem' }}>Create a Mini-League</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.5 }}>
                        Start a private group with your friends. You'll get an invite code to share after creation.
                    </p>

                    {error && (
                        <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #ef4444' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', color: 'white', fontWeight: 600, marginBottom: '0.5rem' }}>League Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Texas DGPT Crew"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #334155',
                                    background: '#0f172a',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'white', fontWeight: 600, marginBottom: '0.5rem' }}>Entry Fee (per tournament)</label>
                            <select
                                value={entryFee}
                                onChange={(e) => setEntryFee(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #334155',
                                    background: '#0f172a',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="0">Free ($0)</option>
                                <option value="10" disabled>Paid Tiers coming soon in Phase 2...</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', color: 'white', fontWeight: 600, marginBottom: '0.5rem' }}>Payout Structure</label>
                            <select
                                value={payoutStructure}
                                onChange={(e) => setPayoutStructure(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid #334155',
                                    background: '#0f172a',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            >
                                <option value="WINNER_TAKE_ALL">Winner Take All (1st Place: 100%)</option>
                                <option value="TOP_3">Top 3 (50% / 30% / 20%)</option>
                                <option value="TOP_HALF">Top Half (Double your money)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: '8px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.7 : 1,
                                marginTop: '1rem'
                            }}
                        >
                            {isSubmitting ? 'Creating...' : 'Create League'}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
