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

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

            {/* Tabs */}
            {leagues.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #334155', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    <button
                        onClick={() => setActiveTab('global')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: activeTab === 'global' ? '#38bdf8' : '#94a3b8',
                            fontWeight: activeTab === 'global' ? 'bold' : 'normal',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            borderBottom: activeTab === 'global' ? '2px solid #38bdf8' : '2px solid transparent',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Global
                    </button>
                    {leagues.map(l => (
                        <button
                            key={l.id}
                            onClick={() => setActiveTab(l.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: activeTab === l.id ? '#38bdf8' : '#94a3b8',
                                fontWeight: activeTab === l.id ? 'bold' : 'normal',
                                padding: '0.5rem 1rem',
                                cursor: 'pointer',
                                borderBottom: activeTab === l.id ? '2px solid #38bdf8' : '2px solid transparent',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {l.name}
                        </button>
                    ))}
                </div>
            )}

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
