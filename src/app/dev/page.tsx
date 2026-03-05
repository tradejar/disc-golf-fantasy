import { currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

const ADMIN_EMAIL = 'misupeinternet@gmail.com';

export const dynamic = 'force-dynamic';

export default async function DevPage() {
    // ── Auth gate ──────────────────────────────────────────────────────────
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!user || userEmail !== ADMIN_EMAIL) return notFound();

    // ── Next upcoming tournament ───────────────────────────────────────────
    const now = new Date();
    const nextTournament = SEASON_2026.find(t => getLockTime(t) > now);
    if (!nextTournament) {
        return (
            <main style={{ padding: '2rem', color: 'white', background: '#0f172a', minHeight: '100vh' }}>
                <h1 style={{ color: '#38bdf8' }}>Dev Dashboard</h1>
                <p style={{ color: '#64748b' }}>No upcoming tournament found — season may be over.</p>
            </main>
        );
    }

    const tournamentId = nextTournament.id;
    const lockTime = getLockTime(nextTournament);

    // ── Data fetches ───────────────────────────────────────────────────────
    const [registrationsRes, entriesRes, profilesRes, debugEntriesRes] = await Promise.all([
        supabaseAdmin
            .from('tournament_registrations')
            .select('pdga_number')
            .eq('tournament_id', tournamentId),
        supabaseAdmin
            .from('entries')
            .select('id, user_id, roster_data, budget_remaining, created_at')
            .eq('tournament_id', tournamentId)
            .order('created_at', { ascending: false }),
        supabaseAdmin
            .from('profiles')
            .select('id, email, display_name'),
        // Debug: fetch last 10 entries from ANY tournament so we can see what IDs are stored
        supabaseAdmin
            .from('entries')
            .select('id, tournament_id, user_id, created_at')
            .order('created_at', { ascending: false })
            .limit(10),
    ]);

    const registrations: { pdga_number: number }[] = registrationsRes.data || [];
    const entries: any[] = entriesRes.data || [];
    const profiles: { id: string; email: string; display_name: string }[] = profilesRes.data || [];
    const debugEntries: any[] = debugEntriesRes.data || [];

    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // registrations: only pdga_number available
    const mpoCount = registrations.length; // Can't split by division without that column

    // ── Styles ─────────────────────────────────────────────────────────────
    const card = {
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '1.25rem',
        marginBottom: '1rem',
    };

    const label = { color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em' };
    const accent = { color: '#38bdf8', fontWeight: 700 };
    const tableHeader = { color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.06em', padding: '0.4rem 0.6rem', borderBottom: '1px solid #334155' };
    const td = { padding: '0.5rem 0.6rem', color: '#cbd5e1', fontSize: '0.88rem', borderBottom: '1px solid #1e293b', verticalAlign: 'top' as const };

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem 1rem', color: 'white', fontFamily: 'inherit' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ ...label, marginBottom: '0.25rem' }}>Admin Only</div>
                    <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>Dev Dashboard</h1>
                    <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        {nextTournament.name} · Locks {lockTime.toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
                    </div>
                </div>

                {/* Summary pills */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                    {[
                        { l: 'Registered players', v: registrations.length },
                        { l: 'Draft Entries', v: entries.length },
                        { l: 'Auto-Drafted', v: 0 },
                    ].map(({ l: lbl, v }) => (
                        <div key={lbl} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.75rem 1.25rem', minWidth: '110px' }}>
                            <div style={label}>{lbl}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>{v}</div>
                        </div>
                    ))}
                </div>

                {/* Entries / picks */}
                <h2 style={{ ...label, fontSize: '0.7rem', marginBottom: '0.75rem' }}>Draft Entries</h2>
                {entries.length === 0 ? (
                    <div style={{ ...card, color: '#475569' }}>No entries yet for this tournament.</div>
                ) : (
                    <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ textAlign: 'left' }}>
                                    <th style={tableHeader}>User</th>
                                    <th style={tableHeader}>Submitted</th>
                                    <th style={tableHeader}>Budget left</th>
                                    <th style={tableHeader}>MPO picks</th>
                                    <th style={tableHeader}>FPO picks</th>
                                    <th style={tableHeader}>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => {
                                    const profile = profileMap.get(entry.user_id);
                                    const name = profile?.display_name || profile?.email?.split('@')[0] || entry.user_id.slice(0, 8);
                                    const roster: any[] = entry.roster_data || [];
                                    const mpo = roster.filter(p => p.division === 'MPO');
                                    const fpo = roster.filter(p => p.division === 'FPO');
                                    const submitted = new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                                    return (
                                        <tr key={entry.id}>
                                            <td style={td}>
                                                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{name}</div>
                                                <div style={{ color: '#475569', fontSize: '0.75rem' }}>{profile?.email}</div>
                                            </td>
                                            <td style={{ ...td, color: '#64748b', fontSize: '0.8rem' }}>{submitted}</td>
                                            <td style={{ ...td, ...accent }}>${entry.budget_remaining}</td>
                                            <td style={td}>
                                                {mpo.map((p: any) => (
                                                    <div key={p.id} style={{ marginBottom: '2px' }}>
                                                        {p.firstName} {p.lastName}
                                                        <span style={{ color: '#475569', fontSize: '0.75rem', marginLeft: '4px' }}>${p.price}</span>
                                                    </div>
                                                ))}
                                            </td>
                                            <td style={td}>
                                                {fpo.map((p: any) => (
                                                    <div key={p.id} style={{ marginBottom: '2px' }}>
                                                        {p.firstName} {p.lastName}
                                                        <span style={{ color: '#475569', fontSize: '0.75rem', marginLeft: '4px' }}>${p.price}</span>
                                                    </div>
                                                ))}
                                            </td>
                                            <td style={td}>
                                                <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 600 }}>✍️ Manual</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Registrations */}
                <h2 style={{ ...label, fontSize: '0.7rem', marginTop: '2rem', marginBottom: '0.75rem' }}>PDGA Registrations ({registrations.length})</h2>
                <div style={{ ...card, padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
                    {registrations.length === 0 ? (
                        <div style={{ padding: '1rem', color: '#475569', fontSize: '0.85rem' }}>No registrations scraped yet. Run the registrations cron first.</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '1rem' }}>
                            {registrations.map(r => (
                                <span key={r.pdga_number} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '4px', padding: '0.2rem 0.5rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {r.pdga_number}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Debug section */}
                <details open style={{ marginTop: '2rem' }}>
                    <summary style={{ color: '#475569', fontSize: '0.8rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
                        Debug info
                    </summary>
                    <div style={{ background: '#0a0f1a', border: '1px solid #1e293b', borderRadius: '6px', padding: '1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#64748b' }}>
                        <div><strong style={{ color: '#94a3b8' }}>Queried tournament_id:</strong> {tournamentId}</div>
                        <div style={{ marginTop: '0.5rem' }}><strong style={{ color: '#94a3b8' }}>entries query error:</strong> {entriesRes.error?.message || 'none'}</div>
                        <div style={{ marginTop: '0.5rem' }}><strong style={{ color: '#94a3b8' }}>registrations query error:</strong> {registrationsRes.error?.message || 'none'}</div>
                        <div style={{ marginTop: '1rem' }}><strong style={{ color: '#94a3b8' }}>Last 10 entries in DB (any tournament):</strong></div>
                        {debugEntries.length === 0 ? (
                            <div>— no entries found in DB at all —</div>
                        ) : debugEntries.map(e => (
                            <div key={e.id} style={{ marginTop: '0.25rem' }}>
                                tournament_id: <span style={{ color: '#38bdf8' }}>{e.tournament_id}</span>
                                {' · '}{new Date(e.created_at).toLocaleDateString()}
                                {' · '}<span style={{ color: '#475569' }}>{e.user_id?.slice(0, 12)}…</span>
                            </div>
                        ))}
                    </div>
                </details>

            </div>
        </main>
    );
}
