import Link from 'next/link';

export const metadata = {
    title: 'Privacy Policy & Terms | DGPT Fantasy 2026',
    description: 'Privacy Policy and Terms of Service for DGPT Fantasy 2026.',
};

export default function PrivacyPage() {
    const contactEmail = 'misupeinternet@gmail.com';
    const effectiveDate = 'March 1, 2026';

    const sectionStyle = { marginBottom: '2.5rem' };
    const h2Style = { color: '#f8fafc', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.4rem' };
    const pStyle = { color: '#94a3b8', lineHeight: 1.7, marginBottom: '0.75rem' };
    const ulStyle = { color: '#94a3b8', lineHeight: 1.7, paddingLeft: '1.5rem', marginBottom: '0.75rem' };

    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                <Link href="/" style={{ color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block', marginBottom: '1.5rem' }}>
                    ← Home
                </Link>

                <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.4rem', letterSpacing: '-0.03em' }}>
                    Privacy Policy & Terms of Service
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '2.5rem' }}>
                    Effective date: {effectiveDate}
                </p>

                {/* ── Privacy Policy ── */}
                <section style={sectionStyle}>
                    <h2 style={h2Style}>1. Information We Collect</h2>
                    <p style={pStyle}>
                        When you sign in to DGPT Fantasy 2026, we collect your name and email address via{' '}
                        <strong style={{ color: '#e2e8f0' }}>Clerk</strong>, our authentication provider.
                        We store only the data necessary to run the game: your drafts,
                        team selections, and tournament points.
                    </p>
                    <p style={pStyle}>We do <strong style={{ color: '#e2e8f0' }}>not</strong> collect:</p>
                    <ul style={ulStyle}>
                        <li>Payment information</li>
                        <li>Location data</li>
                        <li>Device identifiers</li>
                        <li>Browsing history outside this app</li>
                    </ul>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>2. How We Use Your Information</h2>
                    <p style={pStyle}>Your information is used solely to:</p>
                    <ul style={ulStyle}>
                        <li>Identify your account and display your name on leaderboards</li>
                        <li>Save and retrieve your tournament entries</li>
                        <li>Compute and rank fantasy scores</li>
                    </ul>
                    <p style={pStyle}>
                        We do <strong style={{ color: '#e2e8f0' }}>not</strong> sell, rent, or share your
                        personal information with third parties for marketing purposes.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>3. Third-Party Services</h2>
                    <ul style={ulStyle}>
                        <li><strong style={{ color: '#e2e8f0' }}>Clerk</strong> — handles authentication. See <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>clerk.com/privacy</a>.</li>
                        <li><strong style={{ color: '#e2e8f0' }}>Supabase</strong> — stores your entries and scores. See <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>supabase.com/privacy</a>.</li>
                        <li><strong style={{ color: '#e2e8f0' }}>PDGA</strong> — we fetch publicly available scoring data from pdga.com for game calculations.</li>
                    </ul>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>4. Data Retention & Deletion</h2>
                    <p style={pStyle}>
                        Your account and game data are retained for the duration of the 2026 DGPT season.
                        To request deletion of your data, email us at{' '}
                        <a href={`mailto:${contactEmail}`} style={{ color: '#3b82f6' }}>{contactEmail}</a>.
                        We will process deletion requests within 30 days.
                    </p>
                </section>

                <hr style={{ border: 'none', borderTop: '1px solid #1e293b', margin: '2.5rem 0' }} />

                {/* ── Terms of Service ── */}
                <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Terms of Service</h2>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>5. Nature of the Game</h2>
                    <p style={pStyle}>
                        DGPT Fantasy 2026 is a <strong style={{ color: '#e2e8f0' }}>free-to-play fantasy game</strong> with{' '}
                        <strong style={{ color: '#e2e8f0' }}>no monetary prizes or entry fees</strong>.
                        There is no gambling or wagering of any kind. Participation is purely for entertainment.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>6. Eligibility</h2>
                    <p style={pStyle}>
                        This game is open to anyone with a valid Google, email, or social account supported
                        by Clerk. By signing in, you confirm you are at least 13 years old and have read
                        these terms.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>7. Drafting Rules</h2>
                    <p style={pStyle}>The following rules apply to all draft submissions:</p>
                    <ul style={ulStyle}>
                        <li>
                            <strong style={{ color: '#e2e8f0' }}>Next event only.</strong>{' '}
                            You may only submit a draft for the next upcoming tournament on the schedule.
                            Accessing a draft page for any past or future event will automatically redirect
                            you to the current open event.
                        </li>
                        <li>
                            <strong style={{ color: '#e2e8f0' }}>Registered players only.</strong>{' '}
                            You may only select players who are officially registered for that specific
                            tournament on the PDGA website. The draft list is automatically filtered to
                            confirmed entrants.
                        </li>
                        <li>
                            <strong style={{ color: '#e2e8f0' }}>Budget cap: $950.</strong>{' '}
                            Each entry must stay within the $950 salary cap across all 6 roster slots
                            (4 MPO + 2 FPO).
                        </li>
                    </ul>
                    <p style={pStyle}>
                        Fantasy scores are calculated automatically from official PDGA live scoring data.
                        We make no guarantees of 100% accuracy due to potential data delays or errors.
                        Scoring decisions are final. Administrators may adjust or void entries only in
                        the case of clear technical errors.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>8. Auto-Draft</h2>
                    <p style={pStyle}>
                        If you fail to submit an entry before a tournament&apos;s draft deadline, an entry
                        may be automatically generated on your behalf (&quot;Auto-Draft&quot;). Auto-drafted
                        entries are subject to a <strong style={{ color: '#e2e8f0' }}>reduced budget cap
                            of $850</strong> — a $100 fairness penalty compared to the standard $950 available
                        to participants who draft manually. Auto-drafted rosters are also restricted to
                        officially registered players, identical to the manual draft rules.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>9. Acceptable Use</h2>
                    <p style={pStyle}>You agree not to:</p>
                    <ul style={ulStyle}>
                        <li>Create multiple accounts to gain an unfair advantage</li>
                        <li>Attempt to manipulate, exploit, or reverse-engineer the scoring system</li>
                        <li>Use bots or automated tools to interact with the game</li>
                    </ul>
                    <p style={pStyle}>
                        Accounts found in violation may be suspended or removed at administrator discretion.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>10. Disclaimer</h2>
                    <p style={pStyle}>
                        DGPT Fantasy 2026 is an independent fan project and is not affiliated with,
                        endorsed by, or sponsored by the Disc Golf Pro Tour, the PDGA, or any disc golf
                        manufacturer or brand. Player names and ratings are used for informational
                        purposes under fair use.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>11. Changes to These Terms</h2>
                    <p style={pStyle}>
                        We may update this policy from time to time. Continued use of the app after
                        changes constitutes acceptance of the updated terms.
                    </p>
                </section>

                <section style={sectionStyle}>
                    <h2 style={h2Style}>12. Contact</h2>
                    <p style={pStyle}>
                        For questions, data requests, or any concerns, contact us at:{' '}
                        <a href={`mailto:${contactEmail}`} style={{ color: '#3b82f6' }}>{contactEmail}</a>
                    </p>
                </section>
            </div>
        </main>
    );
}
