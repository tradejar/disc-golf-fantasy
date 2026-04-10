'use client';

import { useEffect, useRef, useState, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const LeagueChat = dynamic(() => import('@/components/LeagueChat'), { ssr: false });

interface LeaderboardRow {
    rank: number;
    userId: string;
    displayName: string;
    totalPoints: number;
    entries: { tournamentId: string; tournamentName: string; points: number; rank: number | null; rosterData: any[]; breakdownData: Record<string, any> }[];
}

interface Tournament { id: string; name: string; startDate: string; endDate: string; lockDate: string; }

const PAYOUT_LABELS: Record<string, string> = {
    WINNER_TAKE_ALL: 'Winner Take All',
    TOP_2: 'Top 2 (65/35%)',
    TOP_3: 'Top 3 (50/30/20%)',
    TOP_3_FLAT: 'Top 3 Equal',
    TOP_5: 'Top 5',
    TOP_HALF: 'Top Half',
};

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

function computePayouts(structure: string, totalPot: number, memberCount: number): { place: string; amount: number; pct: number }[] {
    const splits: number[] = (() => {
        switch (structure) {
            case 'WINNER_TAKE_ALL': return [1];
            case 'TOP_2': return [0.65, 0.35];
            case 'TOP_3': return [0.5, 0.3, 0.2];
            case 'TOP_3_FLAT': return [1 / 3, 1 / 3, 1 / 3];
            case 'TOP_5': return [0.40, 0.25, 0.18, 0.10, 0.07];
            case 'TOP_HALF': {
                const n = Math.max(1, Math.floor(memberCount / 2));
                const share = 1 / n;
                return Array(n).fill(share);
            }
            default: return [1];
        }
    })();
    return splits.map((pct, i) => ({
        place: ORDINALS[i] ?? `${i + 1}th`,
        pct,
        amount: Math.floor(totalPot * pct * 100) / 100,
    }));
}

function PrizePool({ entryFee, payoutStructure, memberCount }: { entryFee: number; payoutStructure: string; memberCount: number }) {
    if (!entryFee || entryFee <= 0) return null;
    const totalPot = entryFee * memberCount;
    const payouts = computePayouts(payoutStructure, totalPot, memberCount);
    const MEDAL: Record<string, string> = { '1st': '🥇', '2nd': '🥈', '3rd': '🥉' };
    return (
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>💰 Prize Pool</div>
                <div style={{ color: '#4ade80', fontWeight: 900, fontSize: '1.4rem' }}>${totalPot.toLocaleString()}</div>
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{memberCount} × ${entryFee}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {payouts.map(p => (
                    <div key={p.place} style={{
                        background: '#0f172a', borderRadius: '10px', border: '1px solid #334155',
                        padding: '0.5rem 0.85rem', textAlign: 'center', minWidth: '72px',
                    }}>
                        <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>{MEDAL[p.place] ?? '🏅'}</div>
                        <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>{p.place}</div>
                        <div style={{ color: '#4ade80', fontWeight: 800, fontSize: '0.95rem' }}>${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div style={{ color: '#475569', fontSize: '0.68rem' }}>{Math.round(p.pct * 100)}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function LeagueDetailPage() {
    return <Suspense><LeagueDetail /></Suspense>;
}

const RESPONSIVE_CSS = `
.league-grid {
    display: grid;
    grid-template-columns: minmax(0,1fr) minmax(0,380px);
    gap: 1.25rem;
    align-items: start;
}
@media (max-width: 700px) {
    .league-grid { grid-template-columns: 1fr; }
    .league-header-inner { flex-direction: row !important; flex-wrap: nowrap !important; align-items: center !important; }
    .league-invite-box { padding: 0.35rem 0.6rem !important; }
    .league-invite-label { display: none !important; }
    .league-invite-code { font-size: 0.95rem !important; letter-spacing: 1px !important; }
    .league-invite-copy { display: none !important; }
}
@keyframes pulse-badge {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.7); }
}
.pulse-badge { animation: pulse-badge 1.6s ease-in-out infinite; }
`;

/* ─── Draft Comment Thread ─────────────────────────────────────── */
function DraftComments({ leagueId, tournamentId, targetUserId, onView, isPremium }: { leagueId: string; tournamentId: string; targetUserId: string; onView?: () => void; isPremium: boolean }) {
    const [comments, setComments] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [locked, setLocked] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetch(`/api/leagues/${leagueId}/drafts/${targetUserId}/comments?tournamentId=${tournamentId}`)
            .then(r => r.json())
            .then(d => {
                if (d.locked) setLocked(true);
                else { setComments(d.comments ?? []); onView?.(); }
            });
    }, [leagueId, targetUserId, tournamentId]); // eslint-disable-line react-hooks/exhaustive-deps

    const post = async () => {
        if (!input.trim() || sending) return;
        setSending(true);
        try {
            const res = await fetch(`/api/leagues/${leagueId}/drafts/${targetUserId}/comments`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: input, tournamentId }),
            });
            const d = await res.json();
            if (d.comment) { setComments(prev => [...prev, d.comment]); setInput(''); }
        } finally { setSending(false); }
    };

    if (locked) return (
        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
            🔒 Draft comments open after tournament locks
        </p>
    );

    if (!isPremium) return (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' }}>
            <a
                href="/premium"
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
                    borderRadius: '8px', padding: '0.45rem 0.9rem',
                    color: '#fbbf24', fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none',
                }}
            >
                🔒 Premium only — Upgrade →
            </a>
        </div>
    );

    return (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                💬 Comments
            </div>
            {comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    {comments.map((c: any) => (
                        <div key={c.id} style={{ background: '#1e293b', borderRadius: '6px', padding: '0.4rem 0.7rem' }}>
                            <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700 }}>
                                {c.display_name ?? 'Unknown'}
                            </span>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginLeft: '0.5rem' }}>{c.content}</span>
                        </div>
                    ))}
                </div>
            )}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && post()}
                    placeholder="Leave a comment…"
                    style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}
                />
                <button onClick={post} disabled={sending || !input.trim()}
                    style={{ background: sending ? '#334155' : '#3b82f6', border: 'none', borderRadius: '6px', color: 'white', padding: '0.4rem 0.75rem', cursor: 'pointer', fontWeight: 700 }}>
                    {sending ? '…' : '↑'}
                </button>
            </div>
        </div>
    );
}

/* ─── Main League Detail ───────────────────────────────────────── */
function LeagueDetail() {
    const params = useParams();
    const leagueId = params.id as string;
    const searchParams = useSearchParams();
    const paymentStatus = searchParams.get('payment');

    const [league, setLeague] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [accessCode, setAccessCode] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    // expandedEntry tracks which tournament entry is showing roster cards: `userId::tournamentId`
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null);
    const [filterTournamentId, setFilterTournamentId] = useState<string | null>(null);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isOwner, setIsOwner] = useState(false);
    const [invitePaused, setInvitePaused] = useState(false);
    const [pauseLoading, setPauseLoading] = useState(false);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [leaveLoading, setLeaveLoading] = useState(false);
    const [hasUnreadChat, setHasUnreadChat] = useState(false);
    const [unreadCommentUsers, setUnreadCommentUsers] = useState<Set<string>>(new Set());
    const [isPremium, setIsPremium] = useState(false);

    // Fetch premium status for DraftComments gating
    useEffect(() => {
        fetch('/api/premium/status').then(r => r.json()).then(d => {
            if (d.isPremium) setIsPremium(true);
        }).catch(() => { });
    }, []);

    // Check for unread messages per league on mount (before full load)
    useEffect(() => {
        try {
            const lsKey = `league_chat_seen_${leagueId}`;
            const seen = localStorage.getItem(lsKey);
            // We don't know the latest message ts yet — optimistically false until LeagueChat reports
            if (!seen) setHasUnreadChat(true); // new user, never seen any messages
        } catch { }
    }, [leagueId]);

    // Check unread draft comments for each member after leaderboard loads
    useEffect(() => {
        if (!leaderboard.length || !activeTournamentId) return;
        const unread = new Set<string>();
        for (const row of leaderboard) {
            const lsKey = `comments_seen_${leagueId}_${row.userId}_${activeTournamentId}`;
            try {
                const seen = localStorage.getItem(lsKey);
                if (!seen) unread.add(row.userId); // never viewed their comments
            } catch { }
        }
        setUnreadCommentUsers(unread);
    }, [leaderboard, activeTournamentId, leagueId]);

    useEffect(() => {
        fetch(`/api/leagues/${leagueId}/leaderboard`)
            .then(r => r.json())
            .then(lb => {
                if (lb.error) { setError(lb.error); setLoading(false); return; }
                setLeaderboard(lb.leaderboard ?? []);
                setTournaments(lb.tournaments ?? []);
                setAccessCode(lb.accessCode ?? '');
                setLeague({ name: lb.leagueName, entryFee: lb.entryFee, payoutStructure: lb.payoutStructure });
                setCurrentUserId(lb.currentUserId ?? '');
                setIsOwner(lb.isOwner ?? false);
                setInvitePaused(lb.invitePaused ?? false);
                const now = new Date();
                const active = (lb.tournaments ?? []).find((t: Tournament) =>
                    new Date(t.startDate) <= now && new Date(t.endDate) >= now
                ) ?? (lb.tournaments ?? [])[0] ?? null;
                setActiveTournamentId(active?.id ?? null);
                setLoading(false);
            }).catch(() => { setError('Failed to load league'); setLoading(false); });
    }, [leagueId]);

    const copyCode = () => {
        if (accessCode && !invitePaused) { navigator.clipboard.writeText(accessCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    };

    const togglePause = async () => {
        setPauseLoading(true);
        const res = await fetch(`/api/leagues/${leagueId}/settings`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invitePaused: !invitePaused }),
        });
        const d = await res.json();
        if (!res.ok) { setPauseLoading(false); return; }
        setInvitePaused(d.invitePaused);
        setPauseLoading(false);
    };

    const archiveLeague = async () => {
        if (!confirm('Archive this league? It will be hidden from your dashboard only — other members are unaffected.')) return;
        setArchiveLoading(true);
        await fetch(`/api/leagues/${leagueId}/archive`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archive: true }),
        });
        window.location.href = '/leagues';
    };

    const handleLeave = async () => {
        // Determine if first event has started to warn user about entry fee
        const now = new Date();
        const firstLocked = tournaments.length > 0 && new Date(tournaments[0].lockDate) <= now;
        const confirmMsg = firstLocked
            ? 'The first event has already started. You can still leave, but your play-money entry fee stays in the pot. Continue?'
            : `Leave this league? Your $${league?.entryFee ?? 0} play-money entry fee will be removed from the pot.`;
        if (!confirm(confirmMsg)) return;
        setLeaveLoading(true);
        try {
            const res = await fetch(`/api/leagues/${leagueId}/leave`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to leave');
            window.location.href = '/leagues';
        } catch (err: any) {
            alert(err.message);
            setLeaveLoading(false);
        }
    };

    if (loading) return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>
            <div style={{ paddingTop: '4rem' }}>Loading league…</div>
        </main>
    );
    if (error) return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem', color: 'white', textAlign: 'center' }}>
            <h2>{error}</h2>
            <Link href="/leagues" style={{ color: '#3b82f6' }}>← Back to Leagues</Link>
        </main>
    );

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem 1rem' }}>
            <style>{RESPONSIVE_CSS}</style>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                <Link href="/leagues" style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-block', marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                    ← Leagues
                </Link>

                {/* Payment banners */}
                {!bannerDismissed && paymentStatus === 'success' && (
                    <div style={{ background: '#052e16', border: '1px solid #16a34a', borderRadius: '10px', padding: '0.9rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>✅ Payment successful — welcome to the league!</span>
                        <button onClick={() => setBannerDismissed(true)} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                    </div>
                )}
                {!bannerDismissed && paymentStatus === 'cancelled' && (
                    <div style={{ background: '#1c1400', border: '1px solid #d97706', borderRadius: '10px', padding: '0.9rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fbbf24', fontWeight: 600 }}>⚠️ Payment cancelled — your spot is not confirmed yet.</span>
                        <button onClick={() => setBannerDismissed(true)} style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
                    </div>
                )}

                {/* ── League Header Card ─────────────────────────── */}
                <div style={{ background: '#1e293b', borderRadius: '14px', padding: '1.5rem', border: '1px solid #334155', marginBottom: '1.25rem' }}>
                    <div className="league-header-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <h1 style={{ color: 'white', margin: '0 0 0.6rem', fontSize: '1.6rem', fontWeight: 900, wordBreak: 'break-word' }}>{league?.name}</h1>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', color: '#94a3b8', fontSize: '0.875rem' }}>
                                <span>👥 {leaderboard.length} member{leaderboard.length !== 1 ? 's' : ''}</span>
                                <span>🏅 {PAYOUT_LABELS[league?.payoutStructure] ?? league?.payoutStructure ?? '—'}</span>
                                <span>💰 {league?.entryFee > 0 ? `$${league.entryFee}` : 'Free'}</span>
                                <span>🎯 {(() => {
                                    const now = new Date();
                                    const played = tournaments.filter(t => new Date(t.lockDate) <= now).length;
                                    return `${played}/${tournaments.length} events`;
                                })()}</span>
                            </div>
                        </div>
                        <div className="league-invite-box" style={{ background: '#0f172a', padding: '0.75rem 1.25rem', borderRadius: '10px', border: `1px solid ${invitePaused ? '#475569' : '#334155'}`, textAlign: 'center', flexShrink: 0 }}>
                            <div className="league-invite-label" style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invite Code</div>
                            {invitePaused ? (
                                <div className="league-invite-code" style={{ color: '#64748b', fontWeight: 700, fontSize: '1rem', letterSpacing: '1px' }}>⏸ Paused</div>
                            ) : (
                                <>
                                    <div className="league-invite-code" style={{ color: '#38bdf8', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '3px' }}>{accessCode || '—'}</div>
                                    {accessCode && (
                                        <button className="league-invite-copy" onClick={copyCode}
                                            style={{ background: 'none', border: 'none', color: copied ? '#4ade80' : '#64748b', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0', marginTop: '0.1rem' }}>
                                            {copied ? '✓ Copied!' : 'Copy'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Events — collapsible filter */}
                    {tournaments.length > 0 && (
                        <details style={{ marginTop: '1rem' }}>
                            <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.8rem', fontWeight: 600, listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', userSelect: 'none' }}>
                                <span style={{ color: '#38bdf8' }}>▼</span>
                                {filterTournamentId
                                    ? `Filtered: ${tournaments.find(t => t.id === filterTournamentId)?.name.replace(/^2026\s/, '') ?? ''}`
                                    : (() => {
                                        const now = new Date();
                                        const played = tournaments.filter(t => new Date(t.lockDate) <= now).length;
                                        return `${played}/${tournaments.length} events — tap to filter`;
                                    })()}
                            </summary>
                            <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setFilterTournamentId(null)}
                                    style={{ background: !filterTournamentId ? '#1e3a5f' : '#0f172a', color: !filterTournamentId ? '#38bdf8' : '#94a3b8', border: `1px solid ${!filterTournamentId ? '#3b82f6' : '#334155'}`, fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                    All
                                </button>
                                {tournaments.map(t => (
                                    <button key={t.id}
                                        onClick={() => setFilterTournamentId(t.id === filterTournamentId ? null : t.id)}
                                        style={{ background: filterTournamentId === t.id ? '#1e3a5f' : '#0f172a', color: filterTournamentId === t.id ? '#38bdf8' : '#94a3b8', border: `1px solid ${filterTournamentId === t.id ? '#3b82f6' : '#334155'}`, fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        {t.name.replace(/^2026\s/, '')}
                                    </button>
                                ))}
                            </div>
                        </details>
                    )}

                    {/* ── Creator Settings ───────────────────────── */}
                    {isOwner && (
                        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>⚙ Creator Settings</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Invite Code</span>
                                <button onClick={togglePause} disabled={pauseLoading}
                                    style={{
                                        background: invitePaused ? '#1c1400' : '#052e16',
                                        border: `1px solid ${invitePaused ? '#d97706' : '#16a34a'}`,
                                        color: invitePaused ? '#fbbf24' : '#4ade80',
                                        borderRadius: '20px', padding: '0.25rem 0.75rem',
                                        cursor: pauseLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '0.8rem', fontWeight: 700,
                                    }}>
                                    {pauseLoading ? '…' : invitePaused ? '⏸ Paused — click to resume' : '✓ Active — click to pause'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Archive League ─────────────────────────── */}
                    <PrizePool
                        entryFee={league?.entryFee ?? 0}
                        payoutStructure={league?.payoutStructure ?? ''}
                        memberCount={leaderboard.length}
                    />
                    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {isOwner ? (
                            <button onClick={archiveLeague} disabled={archiveLoading}
                                style={{ background: 'none', border: '1px solid #334155', borderRadius: '8px', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', padding: '0.35rem 0.85rem', fontWeight: 600 }}>
                                {archiveLoading ? '…' : '📥 Archive this league'}
                            </button>
                        ) : (
                            <button onClick={handleLeave} disabled={leaveLoading}
                                style={{ background: 'none', border: '1px solid #ef4444', borderRadius: '8px', color: '#f87171', cursor: leaveLoading ? 'not-allowed' : 'pointer', fontSize: '0.8rem', padding: '0.35rem 0.85rem', fontWeight: 600, opacity: leaveLoading ? 0.6 : 1 }}>
                                {leaveLoading ? '…' : '🚪 Leave League'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="league-grid">

                    {/* Left: Leaderboard */}
                    <div style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ color: 'white', margin: 0, fontSize: '1rem', fontWeight: 700 }}>🏆 Season Standings</h2>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{leaderboard.length} members</span>
                        </div>

                        {leaderboard.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No scores yet — drafts open soon!</div>
                        ) : (() => {
                            // Filter and optionally re-sort by selected tournament
                            const rows = filterTournamentId
                                ? [...leaderboard]
                                    .map(r => ({ ...r, filteredPoints: r.entries.find(e => e.tournamentId === filterTournamentId)?.points ?? 0, filteredRank: r.entries.find(e => e.tournamentId === filterTournamentId)?.rank ?? null }))
                                    .sort((a, b) => b.filteredPoints - a.filteredPoints)
                                    .map((r, i) => ({ ...r, displayRank: i + 1 }))
                                : leaderboard.map(r => ({ ...r, filteredPoints: r.totalPoints, filteredRank: null, displayRank: r.rank }));
                            return rows.map(row => (
                                <div key={row.userId}>
                                    <div onClick={() => setExpanded(expanded === row.userId ? null : row.userId)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.9rem 1.25rem', cursor: 'pointer', background: expanded === row.userId ? '#0f172a' : 'transparent', transition: 'background 0.1s', borderBottom: '1px solid #1e293b' }}>
                                        <div style={{ width: '28px', textAlign: 'center', fontWeight: 900, fontSize: row.displayRank <= 3 ? '1.1rem' : '0.9rem', color: ['#fbbf24', '#94a3b8', '#b45309'][row.displayRank - 1] ?? '#64748b', flexShrink: 0 }}>
                                            {row.displayRank <= 3 ? ['🥇', '🥈', '🥉'][row.displayRank - 1] : row.displayRank}
                                        </div>
                                        <div style={{ flex: 1, color: 'white', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            {row.displayName}
                                            {unreadCommentUsers.has(row.userId) && (
                                                <span className="pulse-badge" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8', flexShrink: 0, display: 'inline-block' }} title="New comments" />
                                            )}
                                        </div>
                                        <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.05rem', flexShrink: 0 }}>
                                            {row.filteredPoints} <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 400 }}>pts</span>
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '0.75rem', flexShrink: 0 }}>{expanded === row.userId ? '▲' : '▼'}</div>
                                    </div>

                                    {expanded === row.userId && (
                                        <div style={{ background: '#0f172a', padding: '0.75rem 1.25rem 1rem', borderBottom: '1px solid #334155' }}>
                                            {/* Per-event score breakdown — filtered if a tournament is selected */}
                                            {(() => {
                                                const entries = filterTournamentId
                                                    ? row.entries.filter(e => e.tournamentId === filterTournamentId)
                                                    : row.entries.sort((a, b) => b.points - a.points);
                                                return entries.length === 0 ? (
                                                    <p style={{ color: '#64748b', margin: '0 0 0.75rem', fontSize: '0.875rem' }}>No scores for this event yet.</p>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                                        {entries.map(e => {
                                                            const entryKey = `${row.userId}::${e.tournamentId}`;
                                                            const isEntryExpanded = expandedEntry === entryKey;
                                                            const hasCards = e.rosterData?.length > 0;
                                                            return (
                                                                <div key={e.tournamentId}>
                                                                    {/* Tournament score row — clickable if has roster data */}
                                                                    <div
                                                                        onClick={() => hasCards && setExpandedEntry(isEntryExpanded ? null : entryKey)}
                                                                        style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.7rem', borderRadius: isEntryExpanded ? '6px 6px 0 0' : '6px', background: '#1e293b', gap: '0.5rem', cursor: hasCards ? 'pointer' : 'default', transition: 'background 0.1s' }}
                                                                    >
                                                                        <div style={{ minWidth: 0 }}>
                                                                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.tournamentName.replace(/^2026\s/, '')}</div>
                                                                            {e.rank && <div style={{ color: '#64748b', fontSize: '0.72rem' }}>#{e.rank}</div>}
                                                                            {!hasCards && row.userId !== currentUserId && (() => {
                                                                                const t = tournaments.find(t => t.id === e.tournamentId);
                                                                                const isPreLock = t && new Date(t.lockDate) > new Date();
                                                                                return isPreLock ? (
                                                                                    <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '2px' }}>🔒 Picks hidden until tournament starts</div>
                                                                                ) : null;
                                                                            })()}
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                                                            <div style={{ color: '#38bdf8', fontWeight: 700 }}>{e.points} pts</div>
                                                                            {hasCards && <span style={{ color: '#475569', fontSize: '0.7rem' }}>{isEntryExpanded ? '▲' : '▼'}</span>}
                                                                        </div>
                                                                    </div>
                                                                    {/* Roster performance cards */}
                                                                    {isEntryExpanded && (
                                                                        <div style={{ background: '#070f1a', border: '1px solid #1e293b', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '0.75rem' }}>
                                                                            <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>🥏 Roster Performance</div>
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                                                {e.rosterData.map((player: any) => {
                                                                                    const rawStats = e.breakdownData?.[player.id];
                                                                                    const totals = rawStats?.totals ?? rawStats;
                                                                                    const rounds: any[] = rawStats?.rounds ?? (rawStats ? [rawStats] : []);
                                                                                    const pts = totals?.totalPoints;
                                                                                    const breakdown = totals?.breakdown ?? rounds[0]?.breakdown;
                                                                                    return (
                                                                                        <div key={player.id} style={{ background: '#0f172a', borderRadius: '8px', padding: '0.6rem 0.8rem', border: '1px solid #1e293b' }}>
                                                                                            {/* Player header */}
                                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: breakdown ? '0.4rem' : 0 }}>
                                                                                                <div>
                                                                                                    <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.88rem' }}>{player.firstName} {player.lastName}</span>
                                                                                                    <span style={{ color: '#475569', fontSize: '0.75rem', marginLeft: '0.4rem' }}>{player.division}</span>
                                                                                                </div>
                                                                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                                                    {totals?.tournamentRank && <span style={{ color: '#64748b', fontSize: '0.72rem' }}>#{totals.tournamentRank}</span>}
                                                                                                    <span style={{ color: pts != null ? '#38bdf8' : '#475569', fontWeight: 800, fontSize: '0.95rem' }}>
                                                                                                        {pts != null ? `${pts} pts` : '—'}
                                                                                                    </span>
                                                                                                </div>
                                                                                            </div>
                                                                                            {/* Per-round cards */}
                                                                                            {rounds.length > 0 && (
                                                                                                <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column', marginTop: '0.4rem' }}>
                                                                                                    {rounds.map((r: any) => (
                                                                                                        <div key={r.roundNumber} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.65rem' }}>
                                                                                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Round {r.roundNumber}</div>
                                                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                                                                                                                <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                                                                                                                    {r.strokes} <span style={{ color: r.toPar < 0 ? '#4ade80' : r.toPar > 0 ? '#f87171' : '#94a3b8', fontSize: '0.75rem' }}>({r.toPar > 0 ? '+' : ''}{r.toPar})</span>
                                                                                                                </span>
                                                                                                                <span style={{ color: r.totalPoints > 0 ? '#38bdf8' : r.totalPoints < 0 ? '#ef4444' : '#94a3b8', fontWeight: 700, fontSize: '0.85rem' }}>{r.totalPoints > 0 ? '+' : ''}{r.totalPoints}</span>
                                                                                                            </div>
                                                                                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', fontSize: '0.72rem', color: '#94a3b8' }}>
                                                                                                                {(r.breakdown?.albatrosses || 0) > 0 && <span style={{ color: '#fbbf24' }}>Alb: {r.breakdown.albatrosses}</span>}
                                                                                                                <span>Egl: {r.breakdown?.eagles || 0}</span>
                                                                                                                <span>B: {r.breakdown?.birdies || 0}</span>
                                                                                                                <span>P: {r.breakdown?.pars || 0}</span>
                                                                                                                <span style={{ color: (r.breakdown?.bogeys || 0) > 0 ? '#f97316' : '#94a3b8' }}>Bg: {r.breakdown?.bogeys || 0}</span>
                                                                                                                {(r.breakdown?.doubles || 0) > 0 && <span style={{ color: '#ef4444' }}>Dbl: {r.breakdown.doubles}</span>}
                                                                                                                {(r.breakdown?.triples || 0) > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>Tri+: {r.breakdown.triples}</span>}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                    {rounds.length > 1 && totals && (
                                                                                                        <div style={{ background: '#0f1f3d', border: '1px solid #3b82f6', borderRadius: '8px', padding: '0.5rem 0.65rem' }}>
                                                                                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>Tournament Total</div>
                                                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                                                                                                                <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>{totals.strokes} strokes</span>
                                                                                                                <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.85rem' }}>{totals.totalPoints > 0 ? '+' : ''}{totals.totalPoints} pts</span>
                                                                                                            </div>
                                                                                                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', fontSize: '0.72rem', color: '#94a3b8' }}>
                                                                                                                {(totals.breakdown?.albatrosses || 0) > 0 && <span style={{ color: '#fbbf24' }}>Alb: {totals.breakdown.albatrosses}</span>}
                                                                                                                <span>Egl: {totals.breakdown?.eagles || 0}</span>
                                                                                                                <span>B: {totals.breakdown?.birdies || 0}</span>
                                                                                                                <span>P: {totals.breakdown?.pars || 0}</span>
                                                                                                                <span>Bg: {totals.breakdown?.bogeys || 0}</span>
                                                                                                                {(totals.breakdown?.doubles || 0) > 0 && <span style={{ color: '#ef4444' }}>Dbl: {totals.breakdown.doubles}</span>}
                                                                                                                {(totals.breakdown?.triples || 0) > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>Tri+: {totals.breakdown.triples}</span>}
                                                                                                                {(totals.placementPoints || 0) > 0 && <span style={{ color: '#a78bfa', fontWeight: 700 }}>+{totals.placementPoints} place</span>}
                                                                                                                {(totals.difficultyBonusPct || 0) > 0 && <span style={{ color: '#34d399' }}>+{totals.difficultyBonusPct}% course</span>}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                            {!rawStats && <div style={{ color: '#475569', fontSize: '0.78rem' }}>No scoring data yet</div>}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })()}
                                            {activeTournamentId && (
                                                <DraftComments
                                                    leagueId={leagueId}
                                                    tournamentId={activeTournamentId}
                                                    targetUserId={row.userId}
                                                    isPremium={isPremium}
                                                    onView={() => {
                                                        // Mark as seen when user opens this player's comments
                                                        const lsKey = `comments_seen_${leagueId}_${row.userId}_${activeTournamentId}`;
                                                        try { localStorage.setItem(lsKey, new Date().toISOString()); } catch { }
                                                        setUnreadCommentUsers(prev => { const n = new Set(prev); n.delete(row.userId); return n; });
                                                    }}
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>

                    {/* Right: League Chat — pulse badge in header if unread */}
                    <div>
                        <LeagueChat
                            leagueId={leagueId}
                            currentUserId={currentUserId}
                            onUnreadChange={setHasUnreadChat}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}
