'use client';

import { useState } from 'react';
import SeasonLeaderboardClient from './SeasonLeaderboardClient';

interface LeagueInfo {
    id: string;
    name: string;
}

interface Props {
    leagues: LeagueInfo[];
}

export default function SeasonLeaderboardTabs({ leagues }: Props) {
    const [activeTab, setActiveTab] = useState<string>('global');

    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        background: isActive ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? '#38bdf8' : '#334155'}`,
        borderRadius: '8px',
        color: isActive ? '#38bdf8' : '#cbd5e1',           // ← Fix #4: #cbd5e1 instead of #94a3b8
        fontWeight: isActive ? 700 : 500,
        fontSize: '0.875rem',
        padding: '0.45rem 1rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
        transition: 'all 0.15s',
        flexShrink: 0,
    });

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

            {/* Tabs — Fix #4: pill-style tabs with real contrast */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '2rem',
                overflowX: 'auto',
                paddingBottom: '0.25rem',
            }}>
                <button onClick={() => setActiveTab('global')} style={tabStyle(activeTab === 'global')}>
                    Global
                </button>
                {/* Fix #2: only user's own leagues appear here (filtered server-side) */}
                {leagues.map(l => (
                    <button
                        key={l.id}
                        onClick={() => setActiveTab(l.id)}
                        style={tabStyle(activeTab === l.id)}
                    >
                        {l.name}
                    </button>
                ))}
            </div>

            {activeTab === 'global' ? (
                <SeasonLeaderboardClient
                    title="2026 Season Leaderboard"
                    subtitle="Cumulative fantasy points across all completed tournaments"
                />
            ) : (
                <SeasonLeaderboardClient
                    title={`${leagues.find(l => l.id === activeTab)?.name} Standings`}
                    subtitle="Mini-League cumulative fantasy points"
                    leagueId={activeTab}
                />
            )}
        </div>
    );
}
