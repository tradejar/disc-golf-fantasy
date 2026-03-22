'use client';

import { useEffect, useState } from 'react';
import { SEASON_2026, getLockTime } from '@/data/tournaments';

interface TournamentResult {
    mpo_winner?: string;
    fpo_winner?: string;
    mpo_score?: string;
    fpo_score?: string;
}

interface WeatherData {
    temp: number;
    condition: string;
}

function getUpcomingTournament() {
    const now = new Date();
    const upcoming = SEASON_2026.find(t => new Date(t.endDate + 'T23:59:59Z') >= now);
    return upcoming ?? SEASON_2026[SEASON_2026.length - 1];
}

function getPreviousTournament() {
    const now = new Date();
    const completed = SEASON_2026.filter(t => new Date(t.endDate + 'T23:59:59Z') < now);
    return completed[completed.length - 1] ?? null;
}

export default function TopScrollBar() {
    const [result, setResult] = useState<TournamentResult | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const upcoming = getUpcomingTournament();
    const previous = getPreviousTournament();

    // Fetch previous tournament winner from Supabase
    useEffect(() => {
        if (!previous) return;
        fetch(`/api/tournament-results?tournamentId=${previous.id}`)
            .then(r => r.json())
            .then(d => { if (d.result) setResult(d.result); })
            .catch(() => { });
    }, [previous?.id]);

    // Fetch current weather for upcoming tournament via Open-Meteo
    useEffect(() => {
        if (!upcoming.lat || !upcoming.lon) return;
        fetch(`/api/weather?lat=${upcoming.lat}&lon=${upcoming.lon}`)
            .then(r => r.json())
            .then(d => { if (typeof d.temp === 'number') setWeather(d); })
            .catch(() => { });
    }, [upcoming.id, upcoming.lat, upcoming.lon]);

    // Build ticker segments
    const distStr = upcoming.totalDistanceFt
        ? `${upcoming.totalDistanceFt.toLocaleString()}ft`
        : 'n/a';
    const parStr = upcoming.par ? `Par ${upcoming.par}` : 'Par —';
    const weatherStr = weather ? `${weather.condition} ${weather.temp}°F` : 'Weather: —';

    const mpoWinner = result?.mpo_winner
        ? `MPO: ${result.mpo_winner}${result.mpo_score ? ` (${result.mpo_score})` : ''}`
        : null;
    const fpoWinner = result?.fpo_winner
        ? `FPO: ${result.fpo_winner}${result.fpo_score ? ` (${result.fpo_score})` : ''}`
        : null;
    const prevPart = previous && (mpoWinner || fpoWinner)
        ? `  ·  PREV: ${previous.name.replace(/^2026\s*/i, '')}  ·  ${[mpoWinner, fpoWinner].filter(Boolean).join('  ·  ')}`
        : '';

    const tickerText = `NEXT STOP: ${upcoming.name.replace(/^2026\s*/i, '')}  ·  ${upcoming.location}  ·  ${parStr}  ·  ${distStr}  ·  ${weatherStr}${prevPart}`;
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
        }}>
            <span
                className="ticker-track"
                style={{
                    ['--ticker-dur' as string]: '40s',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#fff',
                    padding: '0 1rem',
                }}
            >
                {content.split(/(NEXT STOP:|PREV:)/g).map((part, i) => {
                    if (part === 'NEXT STOP:' || part === 'PREV:') {
                        return (
                            <span key={i} style={{ color: '#4ade80', marginRight: '2px' }}>
                                {part}
                            </span>
                        );
                    }
                    return part.split(/(\([+-]?\d+\)|[\u2600-\u26FF][\u0000-\uffff]*?\d+°F)/g).map((chunk, j) => {
                        if (/^\([+-]?\d+\)$/.test(chunk)) {
                            return <span key={`${i}-${j}`} style={{ color: '#fbbf24' }}>{chunk}</span>;
                        }
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
