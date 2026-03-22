import { auth } from '@clerk/nextjs/server';
import { SignInButton } from '@clerk/nextjs';
import TopScrollBar from '@/components/TopScrollBar';
import FeatureScrollBar from '@/components/FeatureScrollBar';
import HomeCards from '@/components/HomeCards';

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <main style={{ background: '#111827', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Scrolling info bars ── */}
      <TopScrollBar />
      <FeatureScrollBar />

      {/* ── Circular navigation grid ── */}
      <section style={{
        background: '#1e2433',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
      }}>
        <HomeCards />

        {/* Sign-in prompt for logged-out users */}
        {!userId && (
          <div style={{
            marginTop: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0 1.5rem',
          }}>
            <p style={{
              color: '#6b7280',
              fontSize: '0.85rem',
              textAlign: 'center',
              margin: 0,
              maxWidth: '260px',
            }}>
              Sign in to draft your roster and compete in the 2026 season
            </p>
            <SignInButton mode="modal">
              <button style={{
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 2rem',
                borderRadius: '50px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                boxShadow: '0 4px 16px rgba(59,130,246,0.4)',
                transition: 'opacity 0.15s',
              }}>
                Sign in to play →
              </button>
            </SignInButton>
          </div>
        )}
      </section>
    </main>
  );
}
