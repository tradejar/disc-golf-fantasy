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
                            <li>
                                <strong style={{ color: '#f8fafc' }}>Registered players only.</strong> The player pool is filtered to confirmed PDGA entrants for that event. This makes your life easier — but registration is not a guarantee of participation. Players can withdraw after registering. Points are only awarded for players who actually compete.
                            </li>
                            <li>
                                <strong style={{ color: '#f8fafc' }}>Auto-Draft.</strong> Miss the deadline and an entry is automatically generated for you:
                                <ul style={{ ...UL_STYLE, paddingTop: '0.4rem' }}>
                                    <li><strong style={{ color: '#94a3b8' }}>Free users</strong> — auto-drafted with a <strong style={{ color: '#f8fafc' }}>$850 budget</strong> ($100 less than manual drafters). <span style={{ color: '#38bdf8', fontSize: '0.85em' }}>Upgrade to Premium for the full cap.</span></li>
                                    <li><strong style={{ color: '#38bdf8' }}>Premium users</strong> — auto-drafted with the full <strong style={{ color: '#f8fafc' }}>$950 budget</strong> plus any carry-over budget banked from your previous tournament.</li>
                                </ul>
                            </li>
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
                            built from the full 2025 DGPT season.
                        </p>
                        <p style={{ ...BODY_STYLE, marginBottom: '1rem' }}>
                            <strong style={{ color: '#f8fafc' }}>How it works:</strong>
                        </p>
                        <ol style={{ ...UL_STYLE, marginBottom: '1rem', listStyleType: 'decimal', paddingLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.6rem' }}>
                                <strong style={{ color: '#f8fafc' }}>Fetch PDGA round ratings.</strong>{' '}
                                Once the final round is complete, we pull each player's round-by-round PDGA rating from the live scoring API.
                            </li>
                            <li style={{ marginBottom: '0.6rem' }}>
                                <strong style={{ color: '#f8fafc' }}>Take the top-20 finishers</strong> (by total strokes) and average their round ratings across all completed rounds.
                            </li>
                            <li style={{ marginBottom: '0.6rem' }}>
                                <strong style={{ color: '#f8fafc' }}>Compare to our 2025 baseline ceiling.</strong>{' '}
                                The ceiling is the easiest event from the 2025 DGPT season: <em>1050 for MPO</em> (Discmania Challenge) and <em>977 for FPO</em> (Music City Open). These represent a course where no difficulty bonus is warranted.
                            </li>
                            <li style={{ marginBottom: '0.6rem' }}>
                                <strong style={{ color: '#f8fafc' }}>Calculate: bonus% = ceiling − top-20 avg round rating.</strong>{' '}
                                If a course plays harder than the ceiling, the difference is the bonus. If easier or equal, no bonus is applied.
                            </li>
                            <li>
                                <strong style={{ color: '#f8fafc' }}>Apply to your points.</strong>{' '}
                                That bonus % is added to every user's scoring fantasy points for players in that division, making performances on harder courses fairly comparable to easier ones.
                            </li>
                        </ol>
                        <p style={{ ...BODY_STYLE, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                            <strong style={{ color: '#f8fafc' }}>2026 season so far:</strong>
                        </p>
                        <div style={{ marginBottom: '0.5rem' }}>
                            <StatPill label="Supreme Flight Open — MPO" value="3%" />
                            <StatPill label="Supreme Flight Open — FPO" value="0%" />
                            <StatPill label="Big Easy Open — MPO" value="17%" />
                            <StatPill label="Big Easy Open — FPO" value="10%" />
                        </div>
                        <p style={{ ...BODY_STYLE, marginTop: '0.75rem', fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            💡 Based on top-20 avg PDGA round ratings vs the 2025 season ceiling (MPO: 1050 Discmania, FPO: 977 Music City). Olympus (SFO) played close to ceiling — 3% MPO bonus, 0% FPO. Parc des Familles (BEO) was meaningfully harder — 17% MPO, 10% FPO. Look for the green <strong style={{ color: '#4ade80' }}>⛰ Course Difficulty Bonus</strong> badge on player scorecards.
                        </p>
                    </div>

                </div>
            </div>
        </main>
    );
}
