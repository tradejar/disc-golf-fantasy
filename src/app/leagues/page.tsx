'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
interface League {
    id: string;
    name: string;
    accessCode: string;
    entryFee: number;
    payoutStructure: string;
    memberCount: number;
    isOwner: boolean;
    invitePaused: boolean;
    archivedAt: string | null;
    tournaments: { id: string; name: string; startDate: string; lockDate: string }[];
    latestMessageAt: string | null;
}

const PAYOUT_LABELS: Record<string, string> = {
    WINNER_TAKE_ALL: 'Winner Take All',
    TOP_3: 'Top 3 (50/30/20%)',
    TOP_HALF: 'Top Half',
};

/* Pulsing badge — shows only when there are messages newer than the user's last visit */
function UnreadChatBadge({ leagueId, latestMessageAt }: { leagueId: string; latestMessageAt: string | null }) {
    const [show, setShow] = useState(false);
    useEffect(() => {
        if (!latestMessageAt) { setShow(false); return; }
        try {
            const seen = localStorage.getItem(`league_chat_seen_${leagueId}`);
            // Show badge only if there's a message newer than the last time the user viewed chat
            setShow(!seen || new Date(latestMessageAt) > new Date(seen));
        } catch { setShow(false); }
    }, [leagueId, latestMessageAt]);
    if (!show) return null;
    return (
        <>
            <style>{`
                @keyframes pulse-chat{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.75)}}
                .pulse-chat-badge{animation:pulse-chat 1.5s ease-in-out infinite}
            `}</style>
            <span className="pulse-chat-badge" title="New messages" style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                background: '#0c2231', border: '1px solid #0ea5e9', borderRadius: '10px',
                padding: '0.1rem 0.45rem', fontSize: '0.7rem', color: '#38bdf8', fontWeight: 700,
            }}>
                💬 new
            </span>
        </>
    );
}




function LeagueCard({ league, onArchive, onRestore }: {
    league: League;
    onArchive?: (id: string) => void;
    onRestore?: (id: string) => void;
}) {
    const [actioning, setActioning] = useState(false);

    const handleArchive = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!confirm('Archive this league? It will be hidden from your dashboard but other members can still access it.')) return;
        setActioning(true);
        await fetch(`/api/leagues/${league.id}/archive`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archive: true }),
        });
        onArchive?.(league.id);
        setActioning(false);
    };

    const handleRestore = async (e: React.MouseEvent) => {
        e.preventDefault();
        setActioning(true);
        await fetch(`/api/leagues/${league.id}/archive`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ archive: false }),
        });
        onRestore?.(league.id);
        setActioning(false);
    };

    return (
        <div style={{ position: 'relative' }}>
            <Link href={`/leagues/${league.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                    background: '#1e293b', border: '1px solid #334155',
                    borderRadius: '14px', padding: '1.5rem',
                    transition: 'border-color 0.15s, box-shadow 0.15s', cursor: 'pointer',
                    opacity: league.archivedAt ? 0.75 : 1,
                }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 1px #3b82f6';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#334155';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{league.name}</h3>
                                {league.isOwner && (
                                    <span style={{ background: '#1e3a5f', color: '#38bdf8', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>
                                        Owner
                                    </span>
                                )}
                                {league.invitePaused && (
                                    <span style={{ background: '#1c1400', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                                        ⏸ Invites paused
                                    </span>
                                )}
                                {/* Unread chat badge — shown only when latestMessageAt > lastSeen in localStorage */}
                                <UnreadChatBadge leagueId={league.id} latestMessageAt={league.latestMessageAt} />
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.875rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <span>👥 {league.memberCount} member{league.memberCount !== 1 ? 's' : ''}</span>
                                <span>🏅 {PAYOUT_LABELS[league.payoutStructure] ?? league.payoutStructure}</span>
                                <span>💰 {league.entryFee > 0 ? `$${league.entryFee}` : 'Free'}</span>
                                <span>🎯 {(() => {
                                    const now = new Date();
                                    const played = league.tournaments.filter(t => new Date(t.lockDate) <= now).length;
                                    const total = league.tournaments.length;
                                    return `${played}/${total} events`;
                                })()}</span>
                            </div>
                            {league.tournaments.length > 0 && (
                                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {league.tournaments.slice(0, 4).map(t => (
                                        <span key={t.id} style={{ background: '#0f172a', color: '#94a3b8', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #334155' }}>
                                            {t.name.replace(/^2026\s/, '')}
                                        </span>
                                    ))}
                                    {league.tournaments.length > 4 && (
                                        <span style={{ background: '#0f172a', color: '#64748b', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #334155' }}>
                                            +{league.tournaments.length - 4} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                            <div style={{ background: '#0f172a', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Code</div>
                                <div style={{ color: league.invitePaused ? '#64748b' : '#38bdf8', fontWeight: 700, letterSpacing: '2px', fontSize: '1rem' }}>
                                    {league.invitePaused ? '—' : league.accessCode}
                                </div>
                            </div>
                            {/* Archive / Restore */}
                            {onArchive && (
                                <button onClick={handleArchive} disabled={actioning}
                                    style={{ background: 'none', border: '1px solid #334155', borderRadius: '6px', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                                    {actioning ? '…' : '📥 Archive'}
                                </button>
                            )}
                            {onRestore && (
                                <button onClick={handleRestore} disabled={actioning}
                                    style={{ background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: '6px', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem', padding: '0.25rem 0.6rem', fontWeight: 700 }}>
                                    {actioning ? '…' : '↩ Restore'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}

export default function LeaguesPage() {
    const router = useRouter();
    const [leagues, setLeagues] = useState<League[]>([]);
    const [archivedLeagues, setArchivedLeagues] = useState<League[]>([]);
    const [loading, setLoading] = useState(true);
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    const loadLeagues = () => {
        fetch('/api/leagues/my')
            .then(r => r.json())
            .then(d => {
                setLeagues(d.leagues ?? []);
                setArchivedLeagues(d.archivedLeagues ?? []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { loadLeagues(); }, []);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setJoining(true);
        setJoinError('');
        try {
            const res = await fetch('/api/leagues/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessCode: joinCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to join');
            // Paid league — redirect to checkout flow
            if (data.requiresPayment) {
                router.push(`/leagues/${data.leagueId}/checkout`);
                return;
            }
            // Free league — data.league is the full DB row
            router.push(`/leagues/${data.league.id}`);
        } catch (err: any) {
            setJoinError(err.message);
            setJoining(false);
        }
    };

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '860px', margin: '0 auto' }}>

                <div style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{ color: 'white', margin: '0 0 0.5rem', fontSize: '2.2rem', fontWeight: 900 }}>
                        🏆 Private Leagues
                    </h1>
                    <p style={{ color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                        Compete in custom leagues with friends across selected DGPT events.
                    </p>
                </div>

                {/* Action row */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem', alignItems: 'flex-start' }}>
                    <Link href="/leagues/create" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: 'white', textDecoration: 'none',
                        padding: '0.85rem 1.5rem', borderRadius: '10px',
                        fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap',
                        boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
                    }}>
                        + Create League
                    </Link>
                    <form onSubmit={handleJoin} style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
                        <input
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="Enter invite code…"
                            maxLength={9}
                            style={{
                                flex: 1, minWidth: '180px', padding: '0.75rem 1rem',
                                borderRadius: '10px', border: '1px solid #334155',
                                background: '#1e293b', color: 'white', fontSize: '1rem',
                                letterSpacing: '2px', textTransform: 'uppercase',
                            }}
                        />
                        <button type="submit" disabled={joining || joinCode.length < 8}
                            style={{
                                background: joining || joinCode.length < 8 ? '#334155' : '#0ea5e9',
                                color: 'white', border: 'none', padding: '0.75rem 1.25rem',
                                borderRadius: '10px', fontWeight: 700, cursor: joining || joinCode.length < 8 ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap', fontSize: '1rem',
                            }}>
                            {joining ? 'Joining…' : 'Join'}
                        </button>
                        {joinError && <p style={{ color: '#f87171', width: '100%', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{joinError}</p>}
                    </form>
                </div>

                {/* Active Leagues */}
                {loading ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '4rem' }}>Loading…</div>
                ) : leagues.length === 0 && archivedLeagues.length === 0 ? (
                    <div style={{ background: '#1e293b', border: '2px dashed #334155', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
                        <h2 style={{ color: 'white', marginBottom: '0.5rem' }}>No leagues yet</h2>
                        <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>Create your own or join one with an invite code.</p>
                        <Link href="/leagues/create" style={{ background: '#3b82f6', color: 'white', textDecoration: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 700 }}>
                            Create a League
                        </Link>
                    </div>
                ) : (
                    <>
                        {leagues.length > 0 && (
                            <>
                                <h2 style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                                    My Leagues ({leagues.length})
                                </h2>
                                <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
                                    {leagues.map(league => (
                                        <LeagueCard key={league.id} league={league}
                                            onArchive={() => { setLeagues(p => p.filter(l => l.id !== league.id)); setArchivedLeagues(p => [{ ...league, archivedAt: new Date().toISOString() }, ...p]); }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Archived section */}
                        {archivedLeagues.length > 0 && (
                            <div>
                                <button onClick={() => setShowArchived(v => !v)}
                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: showArchived ? '1rem' : 0, padding: 0 }}>
                                    <span>{showArchived ? '▲' : '▼'}</span>
                                    Archived ({archivedLeagues.length})
                                </button>
                                {showArchived && (
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {archivedLeagues.map(league => (
                                            <LeagueCard key={league.id} league={league}
                                                onRestore={() => { setArchivedLeagues(p => p.filter(l => l.id !== league.id)); setLeagues(p => [{ ...league, archivedAt: null }, ...p]); }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </main>
    );
}
