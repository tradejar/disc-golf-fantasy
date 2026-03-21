'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

// Future events only (not yet locked at render time)
const now = new Date();
const FUTURE_EVENTS = SEASON_2026.filter(t => getLockTime(t) > now);

const PAYOUT_OPTIONS = [
    { value: 'WINNER_TAKE_ALL', label: 'Winner Take All', sub: '1st: 100%' },
    { value: 'TOP_2', label: 'Top 2', sub: '65% / 35%' },
    { value: 'TOP_3', label: 'Top 3 Podium', sub: '50% / 30% / 20%' },
    { value: 'TOP_3_FLAT', label: 'Top 3 Equal', sub: '40% / 33% / 27%' },
    { value: 'TOP_5', label: 'Top 5', sub: '35% / 25% / 20% / 12% / 8%' },
    { value: 'TOP_HALF', label: 'Top Half', sub: 'Double your entry' },
];

export default function CreateLeaguePage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [entryFee, setEntryFee] = useState('0');
    const [customFee, setCustomFee] = useState('');
    const [payoutStructure, setPayoutStructure] = useState('WINNER_TAKE_ALL');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const allSelected = FUTURE_EVENTS.length > 0 && selectedIds.length === FUTURE_EVENTS.length;
    const toggleAll = () => setSelectedIds(allSelected ? [] : FUTURE_EVENTS.map(t => t.id));
    const toggleEvent = (id: string) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedIds.length === 0) { setError('Select at least one event.'); return; }
        setIsSubmitting(true);
        setError('');
        const fee = entryFee === 'custom' ? (Number(customFee) || 0) : Number(entryFee);
        try {
            const res = await fetch('/api/leagues/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, entryFee: fee, payoutStructure, tournamentIds: selectedIds }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create league');
            // Entry fee is play money only — always redirect straight to the league
            router.push(`/leagues/${data.league.id}`);
        } catch (err: any) {
            setError(err.message);
            setIsSubmitting(false);
        }
    };

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                <Link href="/leagues" style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem', fontSize: '0.95rem' }}>
                    ← Back to Leagues
                </Link>

                <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '2rem' }}>
                    <h1 style={{ color: 'white', marginTop: 0, marginBottom: '0.4rem', fontSize: '1.75rem', fontWeight: 900 }}>Create a League</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6, marginTop: 0 }}>
                        Invite friends with a code after setup. Select at least one future event.
                    </p>

                    {error && (
                        <div style={{ background: '#450a0a', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #dc2626', fontSize: '0.9rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                        {/* League Name */}
                        <div>
                            <label style={{ display: 'block', color: 'white', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>League Name</label>
                            <input
                                type="text" required value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Texas DGPT Crew"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', fontSize: '1rem', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Event Picker */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <label style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                                    Select Events <span style={{ color: '#64748b', fontWeight: 400 }}>({selectedIds.length} selected)</span>
                                </label>
                                <button
                                    type="button" onClick={toggleAll}
                                    style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                >
                                    {allSelected ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {FUTURE_EVENTS.map(t => {
                                    const checked = selectedIds.includes(t.id);
                                    return (
                                        <label key={t.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.65rem 0.9rem', borderRadius: '8px', cursor: 'pointer',
                                            background: checked ? '#1e3a5f' : '#0f172a',
                                            border: `1px solid ${checked ? '#3b82f6' : '#1e293b'}`,
                                            transition: 'all 0.12s',
                                        }}>
                                            <input
                                                type="checkbox" checked={checked}
                                                onChange={() => toggleEvent(t.id)}
                                                style={{ accentColor: '#3b82f6', width: '16px', height: '16px', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: checked ? 'white' : '#94a3b8', fontWeight: checked ? 600 : 400, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {t.name.replace(/^2026\s/, '')}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                                    {new Date(t.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {t.location}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                                {FUTURE_EVENTS.length === 0 && (
                                    <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>No upcoming events available.</p>
                                )}
                            </div>
                        </div>

                        {/* Entry Fee */}
                        <div>
                            <label style={{ display: 'block', color: 'white', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Entry Fee</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {[
                                    { value: '0', label: 'Free' },
                                    { value: '5', label: '$5' },
                                    { value: '10', label: '$10' },
                                    { value: '20', label: '$20' },
                                    { value: '50', label: '$50' },
                                    { value: 'custom', label: 'Custom' },
                                ].map(opt => (
                                    <button
                                        key={opt.value} type="button"
                                        onClick={() => { setEntryFee(opt.value); if (opt.value !== 'custom') setCustomFee(''); }}
                                        style={{
                                            padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700,
                                            border: `1px solid ${entryFee === opt.value ? '#3b82f6' : '#334155'}`,
                                            background: entryFee === opt.value ? '#1e3a5f' : '#0f172a',
                                            color: entryFee === opt.value ? '#38bdf8' : '#94a3b8',
                                            cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.12s',
                                        }}
                                    >{opt.label}</button>
                                ))}
                            </div>
                            {entryFee === 'custom' && (
                                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '1.1rem' }}>$</span>
                                    <input
                                        type="number" min="1" step="1"
                                        value={customFee}
                                        onChange={e => setCustomFee(e.target.value)}
                                        placeholder="Enter amount"
                                        style={{ width: '140px', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #3b82f6', background: '#0f172a', color: 'white', fontSize: '1rem' }}
                                    />
                                </div>
                            )}
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.6rem', marginBottom: 0, lineHeight: 1.5 }}>
                                Entry fees are <strong>play money only</strong> — no real payment is collected. Use them to add stakes to your league scoreboard.
                            </p>
                        </div>

                        {/* Payout Structure */}
                        <div>
                            <label style={{ display: 'block', color: 'white', fontWeight: 600, marginBottom: '0.75rem', fontSize: '0.95rem' }}>Payout Structure</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {PAYOUT_OPTIONS.map(opt => (
                                    <label key={opt.value} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer',
                                        background: payoutStructure === opt.value ? '#1e3a5f' : '#0f172a',
                                        border: `1px solid ${payoutStructure === opt.value ? '#3b82f6' : '#1e293b'}`,
                                        transition: 'all 0.12s',
                                    }}>
                                        <input
                                            type="radio" name="payout" value={opt.value}
                                            checked={payoutStructure === opt.value}
                                            onChange={() => setPayoutStructure(opt.value)}
                                            style={{ accentColor: '#3b82f6' }}
                                        />
                                        <div>
                                            <div style={{ color: payoutStructure === opt.value ? 'white' : '#94a3b8', fontWeight: payoutStructure === opt.value ? 600 : 400, fontSize: '0.9rem' }}>{opt.label}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{opt.sub}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit" disabled={isSubmitting}
                            style={{
                                background: isSubmitting ? '#334155' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                color: 'white', border: 'none', padding: '1rem',
                                borderRadius: '10px', fontSize: '1.05rem', fontWeight: 700,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(59,130,246,0.35)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {isSubmitting ? 'Creating…' : 'Create League →'}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
