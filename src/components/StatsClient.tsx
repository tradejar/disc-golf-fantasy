'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import styles from './StatsClient.module.css';
import type { TournamentStats, PlayerStat, RoundStat } from '@/app/api/stats/route';

const NAV_HEIGHT = 56; // must match NavBar.tsx

interface StatsClientProps {
    tournaments: TournamentStats[];
    isPremium: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toParStr(n: number) { return n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`; }
function toParClass(n: number, s: typeof styles) {
    return n < 0 ? s.perfToParUnder : n === 0 ? s.perfToParEven : s.perfToParOver;
}
function pct(n: number) { return `${Math.round(n)}%`; }
function breakdownHasContent(bd: RoundStat['breakdown']) {
    return bd.eagles > 0 || bd.birdies > 0 || bd.pars > 0 || bd.bogeys > 0 || bd.doubles > 0 || bd.triples > 0;
}

// ── Breakdown display ─────────────────────────────────────────────────────────

function BreakdownChips({ bd }: { bd: { eagles: number; birdies: number; pars: number; bogeys: number; doubles: number; triples: number } }) {
    return (
        <div className={styles.breakdown}>
            {bd.eagles > 0 && <span className={`${styles.bdChip} ${styles.bdChipHot}`}>Egl {bd.eagles}</span>}
            {bd.birdies > 0 && <span className={`${styles.bdChip} ${styles.bdChipGood}`}>B {bd.birdies}</span>}
            {bd.pars > 0 && <span className={styles.bdChip}>P {bd.pars}</span>}
            {bd.bogeys > 0 && <span className={`${styles.bdChip} ${styles.bdChipBad}`}>Bg {bd.bogeys}</span>}
            {bd.doubles > 0 && <span className={`${styles.bdChip} ${styles.bdChipBad}`}>Dbl {bd.doubles}</span>}
            {bd.triples > 0 && <span className={`${styles.bdChip} ${styles.bdChipBad}`}>Tri+ {bd.triples}</span>}
        </div>
    );
}

function AdvancedGrid({ av }: { av: RoundStat['advanced'] }) {
    if (!av) return null;
    const hasAdv = av.fairwayHits || av.c1InReg || av.c2InReg || av.scramble || av.c1xPutting || av.c2Putting;
    if (!hasAdv) return null;
    return (
        <div className={styles.advGrid}>
            <div className={styles.advStat}><span className={styles.advLabel}>Fairway</span><span className={styles.advValue}>{pct(av.fairwayHits)}</span></div>
            <div className={styles.advStat}><span className={styles.advLabel}>C1 Reg</span><span className={styles.advValue}>{pct(av.c1InReg)}</span></div>
            <div className={styles.advStat}><span className={styles.advLabel}>C2 Reg</span><span className={styles.advValue}>{pct(av.c2InReg)}</span></div>
            <div className={styles.advStat}><span className={styles.advLabel}>Scramble</span><span className={styles.advValue}>{pct(av.scramble)}</span></div>
            <div className={styles.advStat}><span className={styles.advLabel}>C1x</span><span className={styles.advValue}>{pct(av.c1xPutting)}</span></div>
            <div className={styles.advStat}><span className={styles.advLabel}>C2</span><span className={styles.advValue}>{pct(av.c2Putting)}</span></div>
        </div>
    );
}

// ── Performance card ──────────────────────────────────────────────────────────

function PerformanceCard({
    player, tournamentName, rank, isPremium,
}: {
    player: PlayerStat; tournamentName?: string; rank?: number; isPremium: boolean;
}) {
    const [activeRound, setActiveRound] = useState<'totals' | number>('totals');

    const displayStat: { toPar: number; breakdown: PlayerStat['breakdown']; advanced: RoundStat['advanced'] } =
        activeRound === 'totals'
            ? { toPar: player.toPar, breakdown: player.breakdown, advanced: player.advanced }
            : (() => {
                const r = player.rounds.find(r => r.round === activeRound);
                return r ? { toPar: r.toPar, breakdown: r.breakdown, advanced: r.advanced } : { toPar: player.toPar, breakdown: player.breakdown, advanced: player.advanced };
            })();

    const numRounds = player.rounds.length;
    const showRoundTabs = numRounds > 0;

    return (
        <div className={styles.perfCard}>
            <div className={styles.perfCardHeader}>
                {rank !== undefined && <span className={styles.perfRank}>{rank}</span>}
                <span className={styles.perfPlayerName} title={player.name}>{player.name}</span>
                {player.rating > 0 && <span className={styles.perfRating}>⭐ {player.rating}</span>}
                <span className={`${styles.perfToPar} ${toParClass(displayStat.toPar, styles)}`}>
                    {toParStr(displayStat.toPar)}
                </span>
            </div>

            {/* Round tabs */}
            {showRoundTabs && (
                <div className={styles.roundTabBar}>
                    <button
                        className={`${styles.roundTab} ${activeRound === 'totals' ? styles.roundTabActive : ''}`}
                        onClick={() => setActiveRound('totals')}
                    >
                        Totals
                    </button>
                    {player.rounds.map((r, i) => {
                        const locked = !isPremium && i > 0;
                        return (
                            <button
                                key={r.round}
                                className={`${styles.roundTab} ${activeRound === r.round ? styles.roundTabActive : ''} ${locked ? styles.roundTabLocked : ''}`}
                                onClick={() => !locked && setActiveRound(r.round)}
                                title={locked ? 'Premium only' : undefined}
                            >
                                {locked ? '🔒' : `Day ${r.round}`}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Card body */}
            {!isPremium && activeRound !== 'totals' && player.rounds.findIndex(r => r.round === activeRound) > 0 ? (
                <div className={styles.premiumGate}>
                    <div className={styles.premiumGateText}>⚡ Premium</div>
                    <div className={styles.premiumGateSub}>Unlock all rounds</div>
                    <Link href="/premium" className={styles.premiumGateBtn}>Upgrade</Link>
                </div>
            ) : (
                <div className={styles.perfCardBody}>
                    {tournamentName && <div className={styles.tournCardName}>{tournamentName}</div>}
                    <BreakdownChips bd={displayStat.breakdown} />
                    <AdvancedGrid av={displayStat.advanced} />
                </div>
            )}
        </div>
    );
}

// ── MPO/FPO mini-tabs inside a tournament accordion ───────────────────────────

type Division = 'MPO' | 'FPO';

function DivisionTabs({ players, query, isPremium }: { players: PlayerStat[]; query: string; isPremium: boolean }) {
    const [div, setDiv] = useState<Division>('MPO');
    const mpo = players.filter(p => p.division === 'MPO');
    const fpo = players.filter(p => p.division === 'FPO');
    const activeFull = div === 'MPO' ? mpo : fpo;
    const active = query ? activeFull.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) : activeFull;

    return (
        <div>
            <div className={styles.divTabBar}>
                {(['MPO', 'FPO'] as Division[]).map(d => (
                    <button key={d} className={`${styles.divTab} ${div === d ? styles.divTabActive : ''}`} onClick={() => setDiv(d)}>
                        {d}<span className={styles.divCount}>{d === 'MPO' ? mpo.length : fpo.length}</span>
                    </button>
                ))}
            </div>
            {active.length === 0 ? (
                <div className={styles.divEmpty}>{query ? `No results for "${query}"` : `No ${div} data.`}</div>
            ) : (
                <div className={styles.playerGrid}>
                    {active.map((p) => (
                        <PerformanceCard
                            key={p.pdgaNumber}
                            player={p}
                            rank={activeFull.indexOf(p) + 1}
                            isPremium={isPremium}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Accordion ─────────────────────────────────────────────────────────────────

function Accordion({ title, meta, count, children }: {
    title: string; meta?: string; count?: number; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`${styles.accordion} ${open ? styles.open : ''}`}>
            <div className={styles.accordionHeader} onClick={() => setOpen(o => !o)}>
                <div className={styles.accordionHeaderLeft}>
                    <div className={styles.accordionName}>{title}</div>
                    {meta && <div className={styles.accordionMeta}>{meta}</div>}
                </div>
                <div className={styles.accordionRight}>
                    {count !== undefined && <span className={styles.countBadge}>{count} players</span>}
                    <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>▼</span>
                </div>
            </div>
            {open && <div className={styles.accordionBody}>{children}</div>}
        </div>
    );
}

// ── Tournaments tab ───────────────────────────────────────────────────────────

function TournamentsTab({ tournaments, query, isPremium }: { tournaments: TournamentStats[]; query: string; isPremium: boolean }) {
    if (!tournaments.length) return <div className={styles.empty}>No completed tournaments yet this season.</div>;
    return (
        <div className={styles.accordionList}>
            {tournaments.map(t => (
                <Accordion
                    key={t.id}
                    title={t.name.replace(/^2026\s*/i, '')}
                    meta={`${t.location} · ${new Date(t.startDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    count={t.players.length}
                >
                    <DivisionTabs players={t.players} query={query} isPremium={isPremium} />
                </Accordion>
            ))}
        </div>
    );
}

// ── Players tab ───────────────────────────────────────────────────────────────

interface PlayerRecord {
    pdgaNumber: string; name: string; division: Division; rating: number;
    entries: { tournamentId: string; tournamentName: string; stat: PlayerStat }[];
}

function buildPlayerRecords(tournaments: TournamentStats[]): PlayerRecord[] {
    const map = new Map<string, PlayerRecord>();
    for (const t of tournaments) {
        for (const p of t.players) {
            if (!map.has(p.pdgaNumber)) {
                map.set(p.pdgaNumber, { pdgaNumber: p.pdgaNumber, name: p.name, division: p.division, rating: p.rating, entries: [] });
            }
            map.get(p.pdgaNumber)!.entries.push({
                tournamentId: t.id,
                tournamentName: t.name.replace(/^2026\s*/i, ''),
                stat: p,
            });
        }
    }
    return [...map.values()].sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.name.localeCompare(b.name);
    });
}

function PlayersTab({ tournaments, query, isPremium }: { tournaments: TournamentStats[]; query: string; isPremium: boolean }) {
    const [div, setDiv] = useState<Division>('MPO');
    const allPlayers = useMemo(() => buildPlayerRecords(tournaments), [tournaments]);
    const mpo = allPlayers.filter(p => p.division === 'MPO');
    const fpo = allPlayers.filter(p => p.division === 'FPO');
    const activeAll = div === 'MPO' ? mpo : fpo;
    const activeFiltered = query ? activeAll.filter(p => p.name.toLowerCase().includes(query.toLowerCase())) : activeAll;

    if (!allPlayers.length) return <div className={styles.empty}>No player data yet this season.</div>;

    return (
        <>
            <div className={styles.divTabBarTop}>
                {(['MPO', 'FPO'] as Division[]).map(d => (
                    <button key={d} className={`${styles.divTab} ${styles.divTabLg} ${div === d ? styles.divTabActive : ''}`} onClick={() => setDiv(d)}>
                        {d}<span className={styles.divCount}>{d === 'MPO' ? mpo.length : fpo.length}</span>
                    </button>
                ))}
            </div>
            <div className={styles.accordionList}>
                {activeFiltered.length === 0 ? (
                    <div className={styles.empty}>No results for &ldquo;{query}&rdquo;</div>
                ) : activeFiltered.map((player, idx) => (
                    <Accordion
                        key={player.pdgaNumber}
                        title={`${idx + 1}. ${player.name}`}
                        meta={player.rating > 0
                            ? `Rating ${player.rating} · ${player.entries.length} tournament${player.entries.length !== 1 ? 's' : ''}`
                            : `${player.entries.length} tournament${player.entries.length !== 1 ? 's' : ''}`}
                    >
                        <div className={styles.playerGrid} style={{ paddingTop: '0.25rem' }}>
                            {player.entries.map(e => (
                                <PerformanceCard
                                    key={e.tournamentId}
                                    player={e.stat}
                                    tournamentName={e.tournamentName}
                                    isPremium={isPremium}
                                />
                            ))}
                        </div>
                    </Accordion>
                ))}
            </div>
        </>
    );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function StatsClient({ tournaments, isPremium }: StatsClientProps) {
    const [activeTab, setActiveTab] = useState<'tournaments' | 'players'>('tournaments');
    const [query, setQuery] = useState('');

    return (
        <div className={styles.container}>
            {/* Page header */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>Player Stats</div>
                <div className={styles.headerSub}>
                    {tournaments.length} tournament{tournaments.length !== 1 ? 's' : ''} · 2026 Season
                </div>
            </div>

            {/* Sticky control bar */}
            <div className={styles.stickyBar} style={{ top: NAV_HEIGHT }}>
                <div className={styles.tabBar}>
                    <button className={`${styles.tab} ${activeTab === 'tournaments' ? styles.tabActive : ''}`} onClick={() => setActiveTab('tournaments')}>
                        Tournaments
                    </button>
                    <button className={`${styles.tab} ${activeTab === 'players' ? styles.tabActive : ''}`} onClick={() => setActiveTab('players')}>
                        Players
                    </button>
                </div>
                <div className={styles.searchRow}>
                    <div className={styles.searchWrap}>
                        <span className={styles.searchIcon}>🔍</span>
                        <input
                            className={styles.searchInput}
                            type="text"
                            placeholder="Search players…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && <button className={styles.searchClear} onClick={() => setQuery('')}>✕</button>}
                    </div>
                </div>
            </div>

            {activeTab === 'tournaments' ? (
                <TournamentsTab tournaments={tournaments} query={query} isPremium={isPremium} />
            ) : (
                <PlayersTab tournaments={tournaments} query={query} isPremium={isPremium} />
            )}
        </div>
    );
}
