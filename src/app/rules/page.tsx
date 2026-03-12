import React from 'react';
import Link from 'next/link';

export const metadata = {
    title: 'Rules | DGPT Fantasy 2026',
    description: 'How to play DGPT Fantasy 2026 — drafting, scoring, and draft rules.',
};

const DIVIDER = (
    <div style={{ height: '1px', background: '#1e293b', margin: '0' }} />
);

const SECTION_STYLE = {
    padding: '2rem',
};

const H2_STYLE = {
    margin: '0 0 1rem 0',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#38bdf8',
};

const BODY_STYLE = {
    color: '#94a3b8',
    lineHeight: 1.7,
    fontSize: '0.95rem',
};

const UL_STYLE = {
    ...BODY_STYLE,
    paddingLeft: '1.25rem',
    margin: 0,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '0.5rem',
};

function StatPill({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem 0',
            borderBottom: '1px solid #1e293b',
        }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{label}</span>
            <span style={{ color: '#f8fafc', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        </div>
    );
}

export default function RulesPage() {
    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', color: '#f8fafc', fontFamily: 'inherit' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 0 4rem' }}>

                {/* Page header */}
                <div style={{ padding: '2rem 2rem 1.5rem' }}>
                    <Link href="/" style={{ color: '#475569', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
                        ← Back
                    </Link>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc' }}>
                        How to Play
                    </h1>
                    <p style={{ margin: '0.4rem 0 0', color: '#475569', fontSize: '0.9rem' }}>
                        DGPT Fantasy 2026
                    </p>
                </div>

                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>

                    {/* Drafting */}
                    <div style={SECTION_STYLE}>
                        <h2 style={H2_STYLE}>Drafting</h2>
                        <ul style={UL_STYLE}>
                            <li>Salary cap of <strong style={{ color: '#f8fafc' }}>$950</strong> per event</li>
                            <li>Pick <strong style={{ color: '#f8fafc' }}>4 MPO</strong> + <strong style={{ color: '#f8fafc' }}>2 FPO</strong> players</li>
                            <li>
                                <strong style={{ color: '#f8fafc' }}>Dynamic Pricing Engine:</strong>
                                <ul style={{ ...UL_STYLE, paddingTop: '0.4rem' }}>
                                    <li><strong style={{ color: '#38bdf8' }}>Ratings Affinity:</strong> Player prices fluctuate organically based on two key factors:</li>
                                    <li><strong style={{ color: '#38bdf8' }}>Course Fit:</strong> Player ratings are compared against the course's specific difficulty ratings (±1% per star variance). <br /> <strong style={{ color: '#f8fafc' }}>!!! Exception:</strong> A 5/5 distance player on a 5/5 distance course gains a strict +5% premium.</li>
                                    <li><strong style={{ color: '#38bdf8' }}>Recent Form:</strong> We track the last 5 tournaments of the current season. Players earn a +3% to +1% bonus for recent podium finishes, but suffer a compounding -3% discount every time they miss the cash line.</li>
                                </ul>
                            </li>
                            <li>Draft locks at first tee time of the tournament</li>
                        </ul>
                    </div>

                    {DIVIDER}

                    {/* Draft rules */}
                    <div style={SECTION_STYLE}>
                        <h2 style={H2_STYLE}>Draft Rules</h2>
                        <ul style={UL_STYLE}>
                            <li><strong style={{ color: '#f8fafc' }}>Next event only.</strong> You can only draft for the upcoming tournament. Past and future draft pages redirect automatically.</li>
                            <li><strong style={{ color: '#f8fafc' }}>Registered players only.</strong> The player pool is filtered to confirmed PDGA entrants for that event.</li>
                            <li><strong style={{ color: '#f8fafc' }}>Auto-Draft penalty.</strong> Miss the deadline and an entry is generated with a reduced <strong style={{ color: '#f8fafc' }}>$850</strong> budget — $100 less than manual drafters.</li>
                        </ul>
                    </div>

                    {DIVIDER}

                    {/* Hole scoring */}
                    <div style={SECTION_STYLE}>
                        <h2 style={H2_STYLE}>Hole Scoring</h2>
                        <div>
                            <StatPill label="Eagle or better" value="+8 pts" />
                            <StatPill label="Birdie" value="+3 pts" />
                            <StatPill label="Par" value="0 pts" />
                            <StatPill label="Bogey" value="−2 pts" />
                            <StatPill label="Double bogey" value="−4 pts" />
                            <StatPill label="Triple bogey+" value="−5 pts" />
                        </div>
                    </div>

                    {DIVIDER}

                    {/* Round bonuses */}
                    <div style={SECTION_STYLE}>
                        <h2 style={H2_STYLE}>Round Bonuses</h2>
                        <div>
                            <StatPill label="Ace / Hole-in-one" value="+15 pts" />
                            <StatPill label="Bogey-free round" value="+5 pts" />
                            <StatPill label="3 birdies in a row" value="+3 pts" />
                        </div>
                        <p style={{ ...BODY_STYLE, marginTop: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                            Ace bonus stacks with Eagle hole points. Birdie streak bonus awarded per 3 consecutive birdies.
                        </p>
                    </div>

                    {DIVIDER}

                    {/* Placement */}
                    <div style={SECTION_STYLE}>
                        <h2 style={H2_STYLE}>Tournament Placement Bonus</h2>
                        <p style={{ ...BODY_STYLE, marginBottom: '1rem' }}>
                            Added to your total after final results are published.
                        </p>
                        <div>
                            <StatPill label="1st place" value="+33 pts" />
                            <StatPill label="2nd place" value="+24 pts" />
                            <StatPill label="3rd place" value="+20 pts" />
                            <StatPill label="4th place" value="+18 pts" />
                            <StatPill label="5th place" value="+16 pts" />
                            <StatPill label="Top 10" value="+10 pts" />
                            <StatPill label="Top 20" value="+6 pts" />
                            <StatPill label="Top 30" value="+4 pts" />
                            <StatPill label="Top 40" value="+3 pts" />
                            <StatPill label="Top 50" value="+2 pts" />
                            <StatPill label="Top 100" value="+1 pt" />
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}
