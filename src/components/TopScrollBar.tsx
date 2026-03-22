'use client';

import { useEffect, useState } from 'react';
import { SEASON_2026 } from '@/data/tournaments';

interface WeatherData {
    temp: number;
    condition: string;
    windSpeed?: number;
    forecast?: { temp: number; condition: string; windSpeed: number } | null;
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

    // Fetch current weather + event-day forecast
    useEffect(() => {
        if (!upcoming.lat || !upcoming.lon) return;
        const eventHour = upcoming.lockHour ?? 13; // Use lock hour as proxy for round start
        const url = `/api/weather?lat=${upcoming.lat}&lon=${upcoming.lon}&date=${upcoming.startDate}&hour=${eventHour}`;
        fetch(url)
            .then(r => r.json())
            .then(d => { if (typeof d.temp === 'number') setWeather(d); })
            .catch(() => { });
    }, [upcoming.id, upcoming.lat, upcoming.lon, upcoming.startDate, upcoming.lockHour]);

    const distStr = upcoming.totalDistanceFt
        ? `${upcoming.totalDistanceFt.toLocaleString()}ft`
        : 'n/a';
    const parStr = upcoming.par ? `Par ${upcoming.par}` : 'Par —';

    // Current conditions
    const weatherStr = weather
        ? `${weather.condition} ${weather.temp}°F`
        : 'Weather: —';

    // Prognosis for event day
    const prognosisStr = weather
        ? weather.forecast
            ? `PROGNOSIS: ${weather.forecast.temp}°F ${weather.forecast.condition} ${weather.forecast.windSpeed}mph`
            : 'PROGNOSIS: Unavailable'
        : 'PROGNOSIS: —';

    // Previous year's champion
    const champParts: string[] = [];
    if (upcoming.prevChampMPO) champParts.push(`MPO: ${upcoming.prevChampMPO}`);
    if (upcoming.prevChampFPO) champParts.push(`FPO: ${upcoming.prevChampFPO}`);
    const champStr = champParts.length > 0
        ? `  ·  PREV CHAMP:  ${champParts.join('  ·  ')}`
        : '';

    const sep = '          ';
    const tickerText = `NEXT STOP: ${upcoming.name.replace(/^2026\s*/i, '')}  ·  ${upcoming.location}  ·  ${parStr}  ·  ${distStr}  ·  ${weatherStr}  ·  ${prognosisStr}${champStr}`;
    const content = [tickerText, tickerText, tickerText, tickerText].join(sep);

    const GREEN = '#4ade80';
    const BLUE = '#38bdf8';
    const AMBER = '#fbbf24';

    return (
        <div className="info-ticker" style={{
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
        }}>
            <span
                className="ticker-track"
                style={{
                    ['--ticker-dur' as string]: '55s',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#fff',
                    padding: '0 1rem',
                }}
            >
                {content.split(/(NEXT STOP:|PREV CHAMP:|PROGNOSIS:)/g).map((part, i) => {
                    if (part === 'NEXT STOP:' || part === 'PREV CHAMP:') {
                        return <span key={i} style={{ color: GREEN, marginRight: '2px' }}>{part}</span>;
                    }
                    if (part === 'PROGNOSIS:') {
                        return <span key={i} style={{ color: AMBER, marginRight: '2px' }}>{part}</span>;
                    }
                    return part.split(/(\d+°F|\d+mph)/g).map((chunk, j) => {
                        if (/\d+°F/.test(chunk)) return <span key={`${i}-${j}`} style={{ color: BLUE }}>{chunk}</span>;
                        if (/\d+mph/.test(chunk)) return <span key={`${i}-${j}`} style={{ color: BLUE }}>{chunk}</span>;
                        return <span key={`${i}-${j}`}>{chunk}</span>;
                    });
                })}
            </span>
        </div>
    );
}
