// Generic loading skeleton shown via route-level loading.tsx files while
// server components fetch. Dark-themed to match the app; no layout shift.
export default function RouteSkeleton() {
    const bar = (w: string, h = 16) => (
        <div className="sk" style={{ width: w, height: h, borderRadius: 8 }} />
    );
    return (
        <main style={{ background: '#0f172a', minHeight: '100vh', padding: '1.5rem 1rem' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {bar('45%', 26)}
                {bar('30%', 14)}
                <div style={{ height: 8 }} />
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="sk" style={{ width: 48, height: 40, borderRadius: 8 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {bar('60%', 14)}
                            {bar('35%', 12)}
                        </div>
                        <div className="sk" style={{ width: 64, height: 28, borderRadius: 8 }} />
                    </div>
                ))}
            </div>
        </main>
    );
}
