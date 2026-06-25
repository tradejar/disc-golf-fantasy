import Link from 'next/link';

export default function NotFound() {
    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🥏</div>
                <h1 style={{ color: '#f8fafc', fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Page not found</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>
                    That page doesn&apos;t exist or has moved.
                </p>
                <Link href="/" style={{ background: '#3b82f6', color: '#fff', borderRadius: 10, padding: '12px 28px', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}>
                    Back home
                </Link>
            </div>
        </main>
    );
}
