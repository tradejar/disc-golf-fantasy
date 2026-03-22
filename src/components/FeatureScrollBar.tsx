'use client';

// Single white feature scroll bar with subtle multi-color gradient
// Text: "Create private leagues, customize your prizepool & payout structure,
//        choose DGPT tournaments, pick your roster of PDGA pros & earn fantasy points,
//        watch live scores & stats, chat with your friends & comment on their roster."

const FULL_TEXT =
    'Create private leagues, customize your prizepool & payout structure, ' +
    'choose DGPT tournaments, pick your roster of PDGA pros & earn fantasy points, ' +
    'watch live scores & stats, chat with your friends & comment on their roster.';

export default function FeatureScrollBar() {
    return (
        <>
            <style>{`
                @keyframes featureTicker {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .feature-track {
                    display: inline-block;
                    white-space: nowrap;
                    animation: featureTicker 32s linear infinite;
                    will-change: transform;
                }
                .feature-track:hover { animation-play-state: paused; }
            `}</style>
            <div style={{
                background: '#fff',
                overflow: 'hidden',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid #e5e7eb',
                flexShrink: 0,
                userSelect: 'none',
            }}>
                <span className="feature-track" style={{
                    fontSize: '0.76rem',
                    fontStyle: 'italic',
                    fontWeight: 500,
                    padding: '0 2rem',
                    background: 'linear-gradient(90deg, #4c7ef3, #1db8a4 33%, #22c55e 66%, #4c7ef3)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    backgroundSize: '200% auto',
                    animation: 'featureTicker 32s linear infinite, gradShift 8s linear infinite',
                }}>
                    {FULL_TEXT}&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;{FULL_TEXT}&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;
                </span>
            </div>
            <style>{`
                @keyframes gradShift {
                    0%   { background-position: 0% center; }
                    100% { background-position: 200% center; }
                }
            `}</style>
        </>
    );
}
