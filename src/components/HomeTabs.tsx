'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const TABS = [
    { id: 'season', label: '🗓 Season' },
    { id: 'leagues', label: '🏅 Leagues' },
    { id: 'leaderboard', label: '🏆 Leaderboard' },
    { id: 'history', label: '📋 My History' },
];

interface Props {
    activeTab: string;
}

export default function HomeTabs({ activeTab }: Props) {
    const router = useRouter();

    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        background: isActive ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isActive ? '#38bdf8' : '#334155'}`,
        borderRadius: '8px',
        color: isActive ? '#38bdf8' : '#cbd5e1',
        fontWeight: isActive ? 700 : 500,
        fontSize: '0.9rem',
        padding: '0.55rem 1.1rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        flexShrink: 0,
    });

    return (
        <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '2rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
        }}>
            {TABS.map(tab => (
                <button
                    key={tab.id}
                    style={tabStyle(activeTab === tab.id)}
                    onClick={() => router.push(`/?tab=${tab.id}`)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
