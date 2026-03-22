import TopScrollBar from '@/components/TopScrollBar';
import FeatureScrollBar from '@/components/FeatureScrollBar';
import HomeCards from '@/components/HomeCards';
import PreviousTournament from '@/components/PreviousTournament';

export default async function HomePage() {
  return (
    <main style={{ background: '#f3f4f6' }}>
      {/* ── Top info ticker — sticky below NavBar ── */}
      <TopScrollBar />

      {/* ── Feature description ticker — sticky below info ticker ── */}
      <FeatureScrollBar />

      {/* ── Circular navigation grid ── */}
      <section style={{
        background: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '8px',
        paddingBottom: '8px',
      }}>
        <HomeCards />
      </section>

      {/* ── Previous tournament results ── */}
      <PreviousTournament />
    </main>
  );
}
