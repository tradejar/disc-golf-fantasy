import * as React from 'react';

interface Props {
    tournamentName: string;
    lockTimeDisplay: string; // e.g. "Friday, March 27 at 9:00 AM ET"
    draftUrl: string;
    displayName?: string;
}

export function DraftLockReminderEmail({ tournamentName, lockTimeDisplay, draftUrl, displayName }: Props) {
    const name = displayName ?? 'there';
    const shortName = tournamentName.replace(/^2026\s/, '');

    return (
        <html>
            <head />
            <body style={{ backgroundColor: '#0f172a', fontFamily: 'Inter, Helvetica, Arial, sans-serif', margin: 0, padding: 0 }}>
                <table width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#0f172a', padding: '40px 16px' }}>
                    <tr>
                        <td align="center">
                            <table width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: '520px', backgroundColor: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' }}>
                                {/* Header */}
                                <tr>
                                    <td style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', padding: '28px 32px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🥏</div>
                                        <h1 style={{ color: 'white', margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
                                            Draft closes soon
                                        </h1>
                                    </td>
                                </tr>
                                {/* Body */}
                                <tr>
                                    <td style={{ padding: '28px 32px' }}>
                                        <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: '1rem', lineHeight: 1.6 }}>
                                            Hey {name} 👋
                                        </p>
                                        <p style={{ color: '#e2e8f0', margin: '0 0 24px', fontSize: '1rem', lineHeight: 1.6 }}>
                                            Your <strong style={{ color: 'white' }}>DGPT Fantasy</strong> draft for{' '}
                                            <strong style={{ color: '#38bdf8' }}>{shortName}</strong> locks at{' '}
                                            <strong style={{ color: 'white' }}>{lockTimeDisplay}</strong>.
                                        </p>
                                        {/* CTA */}
                                        <table width="100%" cellPadding={0} cellSpacing={0}>
                                            <tr>
                                                <td align="center" style={{ paddingBottom: '24px' }}>
                                                    <a href={draftUrl}
                                                        style={{
                                                            display: 'inline-block',
                                                            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                                            color: 'white', textDecoration: 'none',
                                                            padding: '14px 32px', borderRadius: '10px',
                                                            fontWeight: 700, fontSize: '1rem',
                                                            letterSpacing: '0.01em',
                                                        }}>
                                                        Draft My Team →
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                        <p style={{ color: '#475569', margin: 0, fontSize: '0.8rem', lineHeight: 1.5, textAlign: 'center' }}>
                                            You&apos;re receiving this because you have an account on DGPT Fantasy.<br />
                                            If you&apos;ve already submitted your draft, you can ignore this.
                                        </p>
                                    </td>
                                </tr>
                                {/* Footer */}
                                <tr>
                                    <td style={{ padding: '16px 32px', borderTop: '1px solid #334155', textAlign: 'center' }}>
                                        <p style={{ color: '#475569', margin: 0, fontSize: '0.75rem' }}>
                                            DGPT Fantasy · <a href="https://disc-golf-fantasy.vercel.app" style={{ color: '#38bdf8', textDecoration: 'none' }}>disc-golf-fantasy.vercel.app</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
        </html>
    );
}
