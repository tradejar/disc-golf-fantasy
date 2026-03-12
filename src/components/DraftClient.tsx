'use client';

import { useState, useEffect, useRef } from 'react';
import { Player } from '@/data/mock-schema';
import PlayerRow from './PlayerRow';
import styles from './Draft.module.css';
import { SCORING_RULES, RoundStats, getPlacementPoints } from '@/lib/scoring';

interface DraftProps {
    players: Player[];
    tournamentId: string;
    tournamentName: string;
    isLocked?: boolean;
    lockTime?: string;
    existingEntry?: { id: string; roster_data: unknown; budget_remaining: number } | null;
}

const BUDGET_CAP = 950;
const SLOTS_MPO = 4;
const SLOTS_FPO = 2;

export default function DraftClient({ players, tournamentId, tournamentName, isLocked = false, lockTime, existingEntry }: DraftProps) {
    const [roster, setRoster] = useState<Player[]>([]);
    const [confirmed, setConfirmed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [banked, setBanked] = useState(0);
    const [entryId, setEntryId] = useState<string | null>(null);
    const [simResults, setSimResults] = useState<{ player: Player, stats: RoundStats }[] | null>(null);
    const [activeTab, setActiveTab] = useState<'MPO' | 'FPO'>('MPO');
    const [searchTerm, setSearchTerm] = useState('');
    // Live countdown derived from lockTime
    const [clientLocked, setClientLocked] = useState(isLocked);
    // Approximate display countdown — purely cosmetic, does NOT trigger lock
    const [approxLeft, setApproxLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

    // Dynamic fixed-position heights — measured from actual rendered elements
    const dashboardRef = useRef<HTMLElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const NAV_HEIGHT = 56;
    const [dashboardHeight, setDashboardHeight] = useState(0);
    const [controlsHeight, setControlsHeight] = useState(0);
    const controlsTop = NAV_HEIGHT + dashboardHeight;

    useEffect(() => {
        // Restore existing entry on mount.
        // Convert old static IDs ("1", "2") to new PDGA-based IDs by matching players in the pool
        // to prevent duplicate ghost players on re-saves.
        if (existingEntry) {
            const rawRoster = (existingEntry.roster_data as Player[]) || [];
            const mappedRoster = rawRoster.map(saved => {
                // Try matching by pdgaNumber first, then name
                const currentPoolPlayer = players.find(p =>
                    (saved.pdgaNumber && p.pdgaNumber === saved.pdgaNumber) ||
                    (p.firstName === saved.firstName && p.lastName === saved.lastName)
                );
                // CRITICAL FIX: Preserve the original purchase price so dynamic inflation 
                // between sessions doesn't push the user's budget into the negative!
                if (currentPoolPlayer) {
                    return { ...currentPoolPlayer, price: saved.price ?? currentPoolPlayer.price };
                }
                return saved;
            });

            setRoster(mappedRoster);
            setEntryId(existingEntry.id);
            if (mappedRoster.length > 0) setConfirmed(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — only run once on mount

    // Measure dashboard height → drives controls fixed top
    useEffect(() => {
        const el = dashboardRef.current;
        if (!el) return;
        const update = () => setDashboardHeight(el.offsetHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Measure controls height → drives player list top-spacer
    useEffect(() => {
        const el = controlsRef.current;
        if (!el) return;
        const update = () => setControlsHeight(el.offsetHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);


    // Approximate display countdown — ticks every second for UX urgency.
    // Purely cosmetic: ~ symbol shows it's estimated. Actual lock = PDGA data.
    useEffect(() => {
        if (!lockTime || clientLocked) return;
        const target = new Date(lockTime).getTime();
        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) { setApproxLeft(null); return; }
            setApproxLeft({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [lockTime, clientLocked]);

    // Poll PDGA live status every 10 min — matches card tee-off intervals.
    // Only polls within 12h of the tournament start date to avoid unnecessary requests.
    useEffect(() => {
        if (clientLocked) return;
        if (!lockTime) return;

        const lockDate = new Date(lockTime);
        const today = new Date();
        const msUntilLock = lockDate.getTime() - today.getTime();
        if (msUntilLock > 12 * 60 * 60 * 1000) return; // too early, skip polling

        const checkLive = async () => {
            try {
                const res = await fetch(`/api/live-status?tournamentId=${tournamentId}`);
                const data = await res.json();
                if (data.isLive) {
                    setClientLocked(true);
                }
            } catch {
                // ignore network errors silently
            }
        };

        checkLive(); // immediate check on mount
        const interval = setInterval(checkLive, 10 * 60_000); // every 10 minutes
        return () => clearInterval(interval);
    }, [tournamentId, lockTime, clientLocked]);

    const mpoCount = roster.filter(p => p.division === 'MPO').length;
    const fpoCount = roster.filter(p => p.division === 'FPO').length;
    const currentSpend = roster.reduce((sum, p) => sum + p.price, 0);
    const remainingBudget = BUDGET_CAP - currentSpend;

    const isFull = mpoCount === SLOTS_MPO && fpoCount === SLOTS_FPO;
    const isValid = isFull && remainingBudget >= 0;

    const handleDraft = (player: Player) => {
        if (clientLocked) return;

        const isSelected = roster.some(p => p.id === player.id);

        if (isSelected) {
            setRoster(roster.filter(p => p.id !== player.id));
        } else {
            if (currentSpend + player.price > BUDGET_CAP) {
                alert("Over Budget!");
                return;
            }
            if (player.division === 'MPO' && mpoCount >= SLOTS_MPO) return;
            if (player.division === 'FPO' && fpoCount >= SLOTS_FPO) return;

            setRoster([...roster, player]);
        }
    };

    const handleConfirm = async () => {
        if (!isValid) return;

        const ok = window.confirm("Save your entry? You can keep editing until the draft locks.");
        if (!ok) return;

        setConfirmed(true);
        setIsSaving(true);
        setBanked(remainingBudget);

        // Save to Database
        try {
            const res = await fetch('/api/save-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roster: roster,
                    budgetRemaining: remainingBudget,
                    tournamentId,
                    tournamentName
                })
            });

            if (!res.ok) {
                setConfirmed(false); // Revert UI state
                if (res.status === 401) alert("Please Sign In to save your team!");
                else alert("Failed to save team (Server Error)");
            } else {
                const data = await res.json();
                if (data.entry && data.entry.id) {
                    setEntryId(data.entry.id);
                }
                console.log("Team Saved!");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    // Simulation Logic (Now fetches real data!)
    const runSimulation = async () => {
        if (!entryId) return;
        setIsSaving(true);
        try {
            // 1. Fetch real stats and fantasy points from our API
            const res = await fetch('/api/run-tournament', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roster, tournamentId })
            });

            if (!res.ok) {
                alert("Failed to run tournament. Please try again.");
                setIsSaving(false);
                return;
            }

            const data = await res.json();
            const { totalPoints, breakdownData, tournamentRank } = data;

            // 2. Map back to UI format
            const myResults = roster.map(player => ({
                player,
                stats: breakdownData[player.id].totals
            }));

            // Sort by fantasy points descending
            myResults.sort((a, b) => b.stats.totalPoints - a.stats.totalPoints);

            setSimResults(myResults);

            // 3. Save to DB
            await fetch('/api/save-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entryId,
                    totalPoints,
                    tournamentRank,
                    breakdownData,
                    tournamentId,
                    tournamentName
                })
            });

        } catch (e) {
            console.error("Simulation error:", e);
            alert("Error running tournament.");
        } finally {
            setIsSaving(false);
        }
    };

    if (clientLocked) {
        return (
            <div className={styles.container}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>{tournamentName}</h1>
                </div>
                <div style={{
                    background: '#1e293b',
                    border: '2px solid #f59e0b',
                    borderRadius: '10px',
                    padding: '2rem',
                    textAlign: 'center',
                    marginTop: '2rem'
                }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ color: '#f59e0b', margin: '0 0 0.5rem 0' }}>Draft Window Closed</h2>
                    <p style={{ color: '#94a3b8', margin: 0 }}>
                        Drafting locked {lockTime ? `at ${new Date(lockTime).toLocaleString()}` : 'before tournament start'}.
                    </p>
                    <p style={{ color: '#64748b', margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                        Check the Leaderboard to see how everyone scored!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container} style={{ paddingTop: dashboardHeight + controlsHeight }}>
            {/* Compact page header — tournament name + lock countdown, scrolls away under fixed bars */}
            <div style={{ padding: '0.75rem 0 0.5rem', borderBottom: '1px solid #1e293b' }}>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>{tournamentName}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    {approxLeft ? (
                        <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            🔒 ~{approxLeft.days > 0 ? `${approxLeft.days}d ` : ''}{String(approxLeft.hours).padStart(2, '0')}:{String(approxLeft.minutes).padStart(2, '0')}:{String(approxLeft.seconds).padStart(2, '0')}
                        </span>
                    ) : (
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Open until first card tees off</span>
                    )}
                </div>
            </div>
            {/* Budget dashboard — position:fixed eliminates iOS sticky scroll jitter */}
            <header
                className={styles.dashboard}
                ref={dashboardRef}
                style={{ position: 'fixed', top: NAV_HEIGHT, left: 0, right: 0, zIndex: 40, borderRadius: 0, margin: 0 }}
            >
                {/* Centering wrapper — on mobile this wraps into two rows */}
                <div className={styles.dashboardInner}>
                    <div className={styles.metric}>
                        <span className={styles.metricLabel}>Budget</span>
                        <span className={`${styles.metricValue} ${remainingBudget < 0 ? styles.danger : ''}`}>${remainingBudget}</span>
                    </div>

                    {/* Slot groups row — on mobile this drops to its own full-width row */}
                    <div className={styles.slotsRow}>
                        {/* MPO */}
                        <div className={styles.slotGroup}>
                            <div className={styles.slotMetric}>
                                <span className={styles.metricLabel}>MPO</span>
                                <span className={styles.metricValue}>{mpoCount}/{SLOTS_MPO}</span>
                            </div>
                            {roster.filter(p => p.division === 'MPO').length > 0 && (
                                <div className={styles.slotNames}>
                                    {roster.filter(p => p.division === 'MPO').map((p, i) => (
                                        <span key={p.id} className={styles.slotChip}>
                                            {i > 0 && <span className={styles.slotDivider}>·</span>}
                                            <span className={styles.slotFullName}>{p.firstName} {p.lastName}</span>
                                            <span className={styles.slotShortName}>{p.lastName}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* FPO */}
                        <div className={styles.slotGroup}>
                            <div className={styles.slotMetric}>
                                <span className={styles.metricLabel}>FPO</span>
                                <span className={styles.metricValue}>{fpoCount}/{SLOTS_FPO}</span>
                            </div>
                            {roster.filter(p => p.division === 'FPO').length > 0 && (
                                <div className={styles.slotNames}>
                                    {roster.filter(p => p.division === 'FPO').map((p, i) => (
                                        <span key={p.id} className={styles.slotChip}>
                                            {i > 0 && <span className={styles.slotDivider}>·</span>}
                                            <span className={styles.slotFullName}>{p.firstName} {p.lastName}</span>
                                            <span className={styles.slotShortName}>{p.lastName}</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.actionArea}>
                        {isValid && !confirmed && !clientLocked && (
                            <button className={styles.confirmButton} onClick={handleConfirm} disabled={isSaving}>
                                Save Entry
                            </button>
                        )}
                        {confirmed && !simResults && (
                            <>
                                {!clientLocked && (
                                    <button
                                        className={styles.confirmButton}
                                        onClick={handleConfirm}
                                        disabled={isSaving || !isValid}
                                        style={{ background: '#10b981' }}
                                    >
                                        {isSaving ? 'Saving...' : '✓ Saved · Update'}
                                    </button>
                                )}
                                {/* Sim only shown in non-production environments */}
                                {process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production' && (
                                    <button
                                        className={styles.simButton}
                                        onClick={runSimulation}
                                        disabled={isSaving || !entryId}
                                        style={{ opacity: (isSaving || !entryId) ? 0.5 : 1, cursor: (isSaving || !entryId) ? 'not-allowed' : 'pointer', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                    >
                                        {isSaving || !entryId ? 'Saving...' : 'Sim'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>{/* end centering wrapper */}
            </header>

            {
                simResults ? (
                    <div className={styles.resultsPanel}>
                        <h2>Tournament Results</h2>
                        <table className={styles.resultsTable}>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Player</th>
                                    <th>Score</th>
                                    <th>Fantasy Pts</th>
                                    <th>Breakdown</th>
                                </tr>
                            </thead>
                            <tbody>
                                {simResults.map((r, i) => (
                                    <tr key={r.player.id} className={i === 0 ? styles.winner : ''}>
                                        <td>
                                            <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>#{r.stats.tournamentRank}</span>
                                            <span style={{ fontSize: '0.7em', color: '#94a3b8', display: 'block' }}>{r.player.division}</span>
                                        </td>
                                        <td>{r.player.firstName} {r.player.lastName}</td>
                                        <td>
                                            {r.stats.strokes}
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginLeft: '6px' }}>
                                                ({r.stats.toPar != null ? (r.stats.toPar > 0 ? `+${r.stats.toPar}` : r.stats.toPar) : ''})
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{r.stats.totalPoints.toFixed(1)}</strong>
                                            {r.stats.placementPoints && r.stats.placementPoints > 0 && (
                                                <div style={{ fontSize: '0.7em', color: '#4ade80' }}>+{r.stats.placementPoints} Rank</div>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                                            {r.stats.breakdown.eagles > 0 && <span style={{ color: '#a3e635' }}> {r.stats.breakdown.eagles}E, </span>}
                                            {r.stats.breakdown.birdies}B, {r.stats.breakdown.pars}P, {r.stats.breakdown.bogeys}Bg
                                            {r.stats.breakdown.doubles > 0 && <span style={{ color: '#f87171' }}> {r.stats.breakdown.doubles}Dbl</span>}
                                            {r.stats.breakdown.triples > 0 && <span style={{ color: '#ef4444' }}> {r.stats.breakdown.triples}Trip</span>}
                                            {r.stats.bonuses.bogeyFree && <span style={{ color: '#facc15', marginLeft: '4px' }}>★</span>}
                                            {r.stats.bonuses.ace && <span style={{ color: '#f472b6', marginLeft: '4px' }}>ACE!</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={styles.totalScore}>
                            Team Total: {simResults.reduce((sum, r) => sum + r.stats.totalPoints, 0).toFixed(1)}
                        </div>
                        <button
                            className={styles.resetButton}
                            onClick={() => { setSimResults(null); setConfirmed(false); setEntryId(null); setRoster([]); }}
                        >
                            New Draft
                        </button>
                    </div>
                ) : (
                    <div className={styles.listContainer}>
                        <div
                            className={styles.listControlsContainer}
                            ref={controlsRef}
                            style={{
                                position: 'fixed',
                                top: controlsTop,
                                left: 0,
                                right: 0,
                                zIndex: 35,
                                borderRadius: 0,
                            }}
                        >
                            {/* Centering wrapper — matches the container's max-width + padding so column headers align with player rows */}
                            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem' }}>
                                <div className={styles.listControls}>
                                    <div className={styles.divisionToggles}>
                                        <button
                                            onClick={() => setActiveTab('MPO')}
                                            className={`${styles.tabBtn} ${activeTab === 'MPO' ? styles.tabMPO : ''}`}
                                        >
                                            MPO
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('FPO')}
                                            className={`${styles.tabBtn} ${activeTab === 'FPO' ? styles.tabFPO : ''}`}
                                        >
                                            FPO
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search players..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={styles.searchInput}
                                    />
                                </div>
                                {/* listHeader column labels */}
                                <div className={styles.listHeader}>
                                    <span>Rating</span>
                                    <span>Player</span>
                                    <span>Stats (Price / Value)</span>
                                    <span style={{ textAlign: 'right', paddingRight: '0.5rem' }}>Action</span>
                                </div>
                            </div>{/* end centering wrapper */}
                        </div>
                        {players
                            .filter(player => player.division === activeTab)
                            .filter(player => {
                                if (!searchTerm) return true;
                                const full = `${player.firstName} ${player.lastName}`.toLowerCase();
                                return full.includes(searchTerm.toLowerCase());
                            })
                            .map(player => {
                                const isSelected = roster.some(p => p.id === player.id);
                                const isFullType = player.division === 'MPO' ? mpoCount >= SLOTS_MPO : fpoCount >= SLOTS_FPO;
                                const tooExpensive = player.price > remainingBudget;
                                // All players in the list are pre-filtered to registered-only by the server
                                const isRegistered = true;

                                return (
                                    <PlayerRow
                                        key={player.id}
                                        player={player}
                                        onDraft={handleDraft}
                                        isSelected={isSelected}
                                        disabled={clientLocked || (!isSelected && (isFullType || tooExpensive))}
                                        isRegistered={isRegistered}
                                    />
                                );
                            })}
                    </div>
                )
            }
        </div >
    );
}
