import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import HomeCards from '@/components/HomeCards';


export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main style={{ background: '#0f172a', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* ─── Hero ─── */}
        <section style={{ padding: '4rem 0 3rem' }}>
          <h1 style={{
            color: 'white',
            fontSize: '3rem',
            fontWeight: 900,
            margin: '0 0 1rem',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
          }}>
            DGPT Fantasy 2026
          </h1>
          <p style={{
            color: '#64748b',
            fontSize: '1.15rem',
            margin: '0 0 2.5rem',
            lineHeight: 1.65,
            maxWidth: '480px',
          }}>
            Pick your roster of PDGA pros, earn fantasy points on every birdie and eagle, and compete across the full 2026 DGPT season.
          </p>

          {!userId && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <SignInButton mode="modal">
                <button style={{
                  background: '#3b82f6', color: 'white', border: 'none',
                  padding: '0.9rem 2.2rem', borderRadius: '8px', fontWeight: 700,
                  fontSize: '1rem', cursor: 'pointer', letterSpacing: '-0.01em',
                }}>
                  Sign in to play
                </button>
              </SignInButton>
              <Link href="/rules" style={{
                background: 'transparent', color: '#475569', border: '1px solid #334155',
                padding: '0.9rem 2rem', borderRadius: '8px', fontWeight: 600,
                fontSize: '1rem', textDecoration: 'none', letterSpacing: '-0.01em',
              }}>
                How scoring works
              </Link>
            </div>
          )}
        </section>

        {/* ─── Nav cards ─── */}
        <HomeCards />

        {/* ─── Announcements area (intentionally clear for future use) ─── */}

      </div>
    </main>
  );
}
