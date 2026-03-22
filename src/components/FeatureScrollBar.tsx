'use client';

import { useRef } from 'react';

// Segments of the feature text, each gets a distinct gradient hue range
const SEGMENTS = [
    { text: 'Create private leagues', hue: 210 },
    { text: ', customize your prizepool & payout structure', hue: 240 },
    { text: ', choose DGPT tournaments', hue: 270 },
    { text: ', pick your roster of PDGA pros & earn fantasy points', hue: 150 },
    { text: ', watch live scores & stats', hue: 45 },
    { text: ', chat with your friends & comment on their roster.', hue: 180 },
];

interface GradSpanProps {
    text: string;
    hue: number;
    delay: number;
}

function GradSpan({ text, hue, delay }: GradSpanProps) {
    return (
        <>
            <style>{`
                @keyframes hueShift-${hue} {
                    0%   { filter: hue-rotate(0deg); }
                    50%  { filter: hue-rotate(30deg); }
                    100% { filter: hue-rotate(0deg); }
                }
            `}</style>
            <span
                style={{
                    background: `linear-gradient(90deg, hsl(${hue},90%,45%), hsl(${(hue + 40) % 360},85%,55%), hsl(${hue},90%,45%))`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: 'none',
                    display: 'inline',
                    animation: `hueShift-${hue} 4s ease-in-out ${delay}s infinite`,
                    filter: `drop-shadow(0 1px 6px hsla(${hue},80%,50%,0.45))`,
                    fontWeight: 700,
                }}
            >
                {text}
            </span>
        </>
    );
}

export default function FeatureScrollBar() {
    const trackRef = useRef<HTMLDivElement>(null);

    const inner = (
        <span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            {SEGMENTS.map((seg, i) => (
                <GradSpan key={i} text={seg.text} hue={seg.hue} delay={i * 0.6} />
            ))}
            {/* separator between loops */}
            <span style={{ color: '#9ca3af', margin: '0 2rem', fontWeight: 400 }}> ★ </span>
        </span>
    );

    return (
        <>
            <style>{`
                @keyframes featureTicker {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .feature-ticker-track {
                    display: inline-block;
                    animation: featureTicker 35s linear infinite;
                    will-change: transform;
                }
                .feature-ticker-track:hover {
                    animation-play-state: paused;
                }
            `}</style>
            <div style={{
                background: '#ffffff',
                overflow: 'hidden',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #e5e7eb',
                userSelect: 'none',
                flexShrink: 0,
            }}>
                <div
                    ref={trackRef}
                    className="feature-ticker-track"
                    style={{ fontSize: '0.8rem', padding: '0 1rem' }}
                >
                    {/* Duplicate for seamless loop */}
                    {inner}{inner}
                </div>
            </div>
        </>
    );
}
