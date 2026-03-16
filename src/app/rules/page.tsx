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
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{label}</span>
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
                    <Link href="/" style={{ color: '#94a3b8', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
                        ← Back
                    </Link>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#f8fafc' }}>
                        How to Play
                    </h1>
                    <p style={{ margin: '0.4rem 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
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
                            <StatPill label="Albatross (−3 or better) 🦅" value="+24 pts" />
                            <StatPill label="Eagle (−2)" value="+8 pts" />
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
                        <p style={{ ...BODY_STYLE, marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                            An ace on a <strong>par-3</strong> scores <strong>+15 pts only</strong> (ace bonus; eagle bonus does not apply). An ace on a <strong>par-4+</strong> scores <strong>+24 pts only</strong> (albatross bonus; ace bonus does not apply). Aces always count toward birdie streaks.

                        </p>
                        <p style={{ ...BODY_STYLE, marginTop: '0.5rem', fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            💡 Player prices update automatically after each PDGA event based on official rating changes. Prices may occasionally fluctuate by $1–3 due to PDGA rating corrections. Existing drafted rosters are never affected mid-tournament.
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

                    {DIVIDER}

                    {/* Course Difficulty Bonus */}
                    <div style={SECTION_STYLE}>
                        <h2 style={H2_STYLE}>⛰ Course Difficulty Bonus</h2>
                        <p style={{ ...BODY_STYLE, marginBottom: '1rem' }}>
                            Not all courses are created equal — and your fantasy score shouldn't pretend they are.
                            We calculate a bonus for every tournament based on how hard that course actually played
                            compared to a <strong style={{ color: '#f8fafc' }}>normal DGPT event</strong>.
                        </p>
                        <p style={{ ...BODY_STYLE, marginBottom: '1rem' }}>
                            <strong style={{ color: '#f8fafc' }}>Think of it like running:</strong> if you normally
                            finish a 10km race in 50 minutes but today's course has a mountain in it and you finish in
                            54.5 minutes, that course was about <strong style={{ color: '#38bdf8' }}>~9% harder</strong> than
                            normal — and you earn a 9% bonus on your points for tackling it.
                            "Normal" means the{' '}
                            <strong style={{ color: '#f8fafc' }}>2025 DGPT season average</strong> — a baseline
                            built from all 10 Elite Series events that year.
                        </p>
                        <p style={{ ...BODY_STYLE, marginBottom: '1rem' }}>
                            <strong style={{ color: '#f8fafc' }}>How it's calculated (after final round completes):</strong>
                        </p>
                        <ul style={{ ...UL_STYLE, marginBottom: '1rem' }}>
                            <li>Take every finisher's total strokes and their PDGA player rating</li>
                            <li>Drop the <strong style={{ color: '#f8fafc' }}>3 worst finishers</strong> — they may have had an unusually rough week</li>
                            <li>Compute the <strong style={{ color: '#f8fafc' }}>field average strokes</strong> and <strong style={{ color: '#f8fafc' }}>field average rating</strong></li>
                            <li>Use the 2025 baseline to <strong style={{ color: '#f8fafc' }}>predict</strong> how many strokes a field of that rating <em>should</em> shoot on a normal course</li>
                            <li>
                                <strong style={{ color: '#38bdf8' }}>Bonus % = (actual − predicted) ÷ actual strokes</strong>
                                <br />
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                    e.g. field shot 220, baseline predicted 200 → 20 extra strokes ÷ 220 = <strong style={{ color: '#f8fafc' }}>~9% bonus</strong>
                                </span>
                            </li>
                            <li>That % is added to <strong style={{ color: '#f8fafc' }}>every user's hole-scoring fantasy points</strong> for players in that division</li>
                        </ul>
                        <p style={{ ...BODY_STYLE, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                            <strong style={{ color: '#f8fafc' }}>2026 season so far:</strong>
                        </p>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <StatPill label="Supreme Flight Open — MPO" value="~0%" />
                            <StatPill label="Big Easy Open — MPO" value="~9%" />
                        </div>
                        <p style={{ ...BODY_STYLE, marginTop: '0.75rem', fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            💡 Olympus (SFO) plays at or below the 2025 baseline — no bonus needed. Parc des Familles (BEO) played ~20 strokes harder than expected for the field — hence the ~9% bonus. Look for the green <strong style={{ color: '#4ade80' }}>⛰ Course Difficulty Bonus</strong> badge on player scorecards.
                        </p>
                    </div>

                </div>
            </div>
        </main>
    );
}
