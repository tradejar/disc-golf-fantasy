'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Player } from '@/data/mock-schema';
import { StatCategory, CATEGORY_LABEL, STAT_META } from '@/data/statmando-types';

interface Props {
    player: Player;
    isPremium: boolean;
}

const ORDER: StatCategory[] = ['main', 'teegreen', 'putt'];

function fmt(val: number, pct?: boolean): string {
    if (pct) return `${val.toFixed(1)}%`;
    // Strokes-gained / averages read best at 1–2 dp; integers stay clean.
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
}

export default function PlayerStatsPanel({ player, isPremium }: Props) {
    const sm = player.statmando;
    const available = ORDER.filter(c => sm?.[c] && Object.keys(sm[c]!.stats).length > 0);
    const [tab, setTab] = useState<StatCategory>(available[0] ?? 'main');
    const [activeTip, setActiveTip] = useState<string | null>(null);

    // Auto-dismiss the info popup (mainly for mobile, where there's no mouse-leave)
    useEffect(() => {
        if (!activeTip) return;
        const t = setTimeout(() => setActiveTip(null), 3500);
        return () => clearTimeout(t);
    }, [activeTip]);

    // ── Non-premium: locked upsell ────────────────────────────────────────────
    if (!isPremium) {
        return (
            <div style={panelWrap}>
                <div style={{ textAlign: 'center', padding: '0.75rem 1rem' }}>
                    <div style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                        🔒 Premium stat sheet
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.6rem', lineHeight: 1.4 }}>
                        Unlock full StatMando season splits — driving, scramble, Circle 1 & 2 putting,
                        strokes gained and more — for every player.
                    </div>
                    <Link
                        href="/premium"
                        onClick={e => e.stopPropagation()}
                        style={{
                            display: 'inline-block', background: '#fbbf24', color: '#0f172a',
                            fontWeight: 700, fontSize: '0.8rem', padding: '6px 14px',
                            borderRadius: '6px', textDecoration: 'none',
                        }}
                    >
                        Go Premium →
                    </Link>
                </div>
            </div>
        );
    }

    // ── No data for this player ───────────────────────────────────────────────
    if (available.length === 0) {
        return (
            <div style={panelWrap}>
                <div style={{ textAlign: 'center', padding: '0.75rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                    No tracked stats for this player yet — insufficient data.
                </div>
            </div>
        );
    }

    const activeTab = available.includes(tab) ? tab : available[0];
    const cat = sm![activeTab]!;
    const meta = STAT_META[activeTab].filter(m => cat.stats[m.label] !== undefined);

    return (
        <div style={panelWrap}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', padding: '0.6rem 0.75rem 0', flexWrap: 'wrap' }}>
                {available.map(c => (
                    <button
                        key={c}
                        onClick={e => { e.stopPropagation(); setTab(c); }}
                        style={{
                            background: c === activeTab ? '#3b82f6' : 'rgba(148,163,184,0.12)',
                            color: c === activeTab ? '#fff' : '#cbd5e1',
                            border: 'none', borderRadius: '6px 6px 0 0',
                            padding: '5px 12px', fontSize: '0.74rem', fontWeight: 700,
                            cursor: 'pointer', letterSpacing: '0.02em',
                        }}
                    >
                        {CATEGORY_LABEL[c]}
                    </button>
                ))}
            </div>

            {/* Stat grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))',
                gap: '0.4rem',
                padding: '0.7rem 0.75rem',
            }}>
                {meta.map(m => (
                    <div
                        key={m.label}
                        style={statCell}
                        onClick={(e) => { e.stopPropagation(); setActiveTip(activeTip === m.label ? null : m.label); }}
                        onMouseEnter={() => setActiveTip(m.label)}
                        onMouseLeave={() => setActiveTip(null)}
                    >
                        <span style={{ fontSize: '0.62rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.03em' }}>
                            {m.label}
                        </span>
                        <span style={{ fontSize: '0.95rem', color: '#f1f5f9', fontWeight: 700, fontFamily: 'monospace' }}>
                            {fmt(cat.stats[m.label], m.pct)}
                        </span>

                        {activeTip === m.label && (
                            <div style={tooltipBubble}>
                                <span style={{ fontWeight: 700, color: '#f8fafc' }}>{m.label}</span>
                                <span style={{ display: 'block', marginTop: '2px', color: '#cbd5e1' }}>{m.desc}</span>
                                <div style={tooltipArrow} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer: sample size + source */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem',
                padding: '0 0.85rem 0.7rem', fontSize: '0.66rem', color: '#64748b',
            }}>
                <span>
                    {cat.events != null && `${cat.events} events`}
                    {cat.events != null && cat.rounds != null && ' · '}
                    {cat.rounds != null && `${cat.rounds} rounds`}
                </span>
                <span>Source: StatMando{cat.sourceUpdated ? ` · ${cat.sourceUpdated}` : ''}</span>
            </div>
        </div>
    );
}

const panelWrap: React.CSSProperties = {
    background: '#0f172a',
    borderBottom: '1px solid #334155',
    borderLeft: '3px solid #3b82f6',
};

const statCell: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    background: 'rgba(30,41,59,0.6)',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '6px 4px',
    cursor: 'pointer',
};

const tooltipBubble: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    width: 'max-content',
    maxWidth: '200px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    padding: '7px 10px',
    fontSize: '11px',
    lineHeight: 1.35,
    textAlign: 'left',
    zIndex: 20,
    boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
    pointerEvents: 'none',
};

const tooltipArrow: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: '50%',
    marginLeft: '-5px',
    borderWidth: '5px',
    borderStyle: 'solid',
    borderColor: '#1e293b transparent transparent transparent',
};
