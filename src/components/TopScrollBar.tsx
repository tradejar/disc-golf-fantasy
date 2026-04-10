'use client';

import { useEffect, useState } from 'react';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

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

function useCountdown(targetDate: Date) {
    const [msLeft, setMsLeft] = useState(() => targetDate.getTime() - Date.now());
    useEffect(() => {
        const id = setInterval(() => setMsLeft(targetDate.getTime() - Date.now()), 1000);
        return () => clearInterval(id);
    }, [targetDate]);
    return msLeft;
}

function formatCountdown(ms: number) {
    if (ms <= 0) return 'LIVE NOW';
    const s = Math.floor(ms / 1000);
    const days = Math.floor(s / 86400);
    const hrs = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    return `${hrs}h ${mins}m ${secs}s`;
}

export default function TopScrollBar() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const upcoming = getUpcomingTournament();
    const lockTime = getLockTime(upcoming);
    const msToLock = useCountdown(lockTime);
    const countdownStr = msToLock > 0 ? formatCountdown(msToLock) : 'LIVE NOW';

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
    const tickerText = `NEXT STOP: ${upcoming.name.replace(/^2026\s*/i, '')}  ·  ${upcoming.location}  ·  DRAFTS IN: ${countdownStr}  ·  ${parStr}  ·  ${distStr}  ·  ${prognosisStr}${champStr}`;
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
                {content.split(/(NEXT STOP:|PREV CHAMP:|PROGNOSIS:|DRAFTS IN:)/g).map((part, i) => {
                    if (part === 'NEXT STOP:' || part === 'PREV CHAMP:') {
                        return <span key={i} style={{ color: GREEN, marginRight: '2px' }}>{part}</span>;
                    }
                    if (part === 'PROGNOSIS:') {
                        return <span key={i} style={{ color: AMBER, marginRight: '2px' }}>{part}</span>;
                    }
                    if (part === 'DRAFTS IN:') {
                        return <span key={i} style={{ color: '#f472b6', marginRight: '2px' }}>{part}</span>;
                    }
                    return part.split(/(\d+°F|\d+mph|\d+d \d+h \d+m|\d+h \d+m \d+s|LIVE NOW)/g).map((chunk, j) => {
                        if (/\d+°F/.test(chunk) || /\d+mph/.test(chunk)) return <span key={`${i}-${j}`} style={{ color: BLUE }}>{chunk}</span>;
                        if (/\d+[dhms]/.test(chunk) || chunk === 'LIVE NOW') return <span key={`${i}-${j}`} style={{ color: '#f472b6', fontWeight: 900 }}>{chunk}</span>;
                        return <span key={`${i}-${j}`}>{chunk}</span>;
                    });
                })}
            </span>
        </div>
    );
}
