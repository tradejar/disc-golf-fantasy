'use client';

// Single white feature scroll bar with subtle multi-color gradient
// Sticky just below the TopScrollBar (top: NAV_HEIGHT + 28px info ticker)

const NAV_HEIGHT = 56;
const TOP_TICKER_HEIGHT = 28;

const FULL_TEXT =
    'Create private leagues, customize your prizepool & payout structure, ' +
    'choose DGPT tournaments, pick your roster of PDGA pros & earn fantasy points, ' +
    'watch live scores & stats, chat with your friends & comment on their roster.';

export default function FeatureScrollBar() {
    return (
        <div style={{
            background: '#fff',
            overflow: 'hidden',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
            userSelect: 'none',
            position: 'sticky',
            top: `${NAV_HEIGHT + TOP_TICKER_HEIGHT}px`,
            zIndex: 38,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
            <span
                className="ticker-track"
                style={{
                    ['--ticker-dur' as string]: '64s',
                    fontStyle: 'italic',
                    fontWeight: 500,
                    padding: '0 2rem',
                    background: 'linear-gradient(90deg, #4c7ef3, #1db8a4 33%, #22c55e 66%, #4c7ef3)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    backgroundSize: '300% auto',
                    animation: 'tickerScroll 64s linear infinite, gradShift 10s linear infinite',
                }}
            >
                {FULL_TEXT}&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;{FULL_TEXT}&nbsp;&nbsp;&nbsp;★&nbsp;&nbsp;&nbsp;
            </span>
            <style>{`
                @keyframes gradShift {
                    0%   { background-position: 0% center; }
                    100% { background-position: 300% center; }
                }
            `}</style>
        </div>
    );
}
