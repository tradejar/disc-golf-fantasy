'use client';

import { useEffect, useState } from 'react';

// ISO alpha-2 → English country name via the platform Intl API (no lookup table).
function countryName(code: string): string {
    try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

/**
 * Small nationality flag with a country-name tooltip.
 * Hover shows the tooltip on desktop; tap toggles it on mobile (auto-dismisses
 * after 3s, same pattern as PlayerRatings). Renders nothing without a valid
 * ISO alpha-2 code. Flag images served by flagcdn.com (SVG-derived PNGs) so
 * they render identically on every OS — emoji flags don't show on Windows.
 */
export default function NationalityFlag({ country }: { country?: string | null }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setOpen(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [open]);

    if (!country || country.trim().length !== 2) return null;

    const code = country.trim().toLowerCase();
    const name = countryName(code);

    return (
        <span
            style={{ position: 'relative', display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle', cursor: 'pointer' }}
            onClick={(e) => {
                e.stopPropagation();
                setOpen(o => !o);
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny external flag asset, next/image overhead not worth it */}
            <img
                src={`https://flagcdn.com/w20/${code}.png`}
                srcSet={`https://flagcdn.com/w40/${code}.png 2x`}
                width={20}
                alt={name}
                loading="lazy"
                style={{ display: 'inline-block', borderRadius: '2px', boxShadow: '0 0 0 1px rgba(148, 163, 184, 0.25)', verticalAlign: 'middle' }}
            />
            {open && (
                <span style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '6px',
                    background: '#1e293b',
                    color: '#e2e8f0',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    border: '1px solid #334155',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    lineHeight: 1.4,
                }}>
                    {name}
                    <span style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        marginLeft: '-4px',
                        borderWidth: '4px',
                        borderStyle: 'solid',
                        borderColor: '#1e293b transparent transparent transparent',
                    }} />
                </span>
            )}
        </span>
    );
}
