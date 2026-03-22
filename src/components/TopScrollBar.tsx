'use client';

import { useEffect, useState } from 'react';
import { SEASON_2026 } from '@/data/tournaments';

interface WeatherData {
    temp: number;
    condition: string;
}

function getUpcomingTournament() {
    const now = new Date();
    const upcoming = SEASON_2026.find(t => new Date(t.endDate + 'T23:59:59Z') >= now);
    return upcoming ?? SEASON_2026[SEASON_2026.length - 1];
}

const NAV_HEIGHT = 56; // must match NavBar.tsx

export default function TopScrollBar() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const upcoming = getUpcomingTournament();

    // Fetch current weather for upcoming tournament via Open-Meteo
    useEffect(() => {
        if (!upcoming.lat || !upcoming.lon) return;
        fetch(`/api/weather?lat=${upcoming.lat}&lon=${upcoming.lon}`)
            .then(r => r.json())
            .then(d => { if (typeof d.temp === 'number') setWeather(d); })
            .catch(() => { });
    }, [upcoming.id, upcoming.lat, upcoming.lon]);

    const distStr = upcoming.totalDistanceFt
        ? `${upcoming.totalDistanceFt.toLocaleString()}ft`
        : 'n/a';
    const parStr = upcoming.par ? `Par ${upcoming.par}` : 'Par —';
    const weatherStr = weather ? `${weather.condition} ${weather.temp}°F` : 'Weather: —';

    // Previous year's champion for this same event/course (from tournament data)
    const champParts: string[] = [];
    if (upcoming.prevChampMPO) champParts.push(`MPO: ${upcoming.prevChampMPO}`);
    if (upcoming.prevChampFPO) champParts.push(`FPO: ${upcoming.prevChampFPO}`);
    const champStr = champParts.length > 0
        ? `  ·  PREV CHAMP:  ${champParts.join('  ·  ')}`
        : '';

    const tickerText = `NEXT STOP: ${upcoming.name.replace(/^2026\s*/i, '')}  ·  ${upcoming.location}  ·  ${parStr}  ·  ${distStr}  ·  ${weatherStr}${champStr}`;
    const content = `${tickerText}          ${tickerText}`;

    return (
        <div style={{
            background: '#000',
            overflow: 'hidden',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #1a1a1a',
            userSelect: 'none',
            flexShrink: 0,
            position: 'sticky',
            top: `${NAV_HEIGHT}px`,
            zIndex: 39,
        }}>
            <span
                className="ticker-track"
                style={{
                    ['--ticker-dur' as string]: '40s',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#fff',
                    padding: '0 1rem',
                }}
            >
                {content.split(/(NEXT STOP:|PREV CHAMP:)/g).map((part, i) => {
                    if (part === 'NEXT STOP:' || part === 'PREV CHAMP:') {
                        return (
                            <span key={i} style={{ color: '#4ade80', marginRight: '2px' }}>
                                {part}
                            </span>
                        );
                    }
                    return part.split(/(\d+°F)/g).map((chunk, j) => {
                        if (/\d+°F/.test(chunk)) {
                            return <span key={`${i}-${j}`} style={{ color: '#38bdf8' }}>{chunk}</span>;
                        }
                        return <span key={`${i}-${j}`}>{chunk}</span>;
                    });
                })}
            </span>
        </div>
    );
}
