import TopScrollBar from '@/components/TopScrollBar';
import FeatureScrollBar from '@/components/FeatureScrollBar';
import HomeCards from '@/components/HomeCards';
import PreviousTournament from '@/components/PreviousTournament';

export default async function HomePage() {
  return (
    <main style={{ background: '#f3f4f6' }}>
      {/* ── Top info ticker (black) ── */}
      <TopScrollBar />

      {/* ── Feature description ticker (white) ── */}
      <FeatureScrollBar />

      {/* ── Circular navigation grid ── */}
      <section style={{
        background: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <HomeCards />
      </section>

      {/* ── Previous tournament results ── */}
      <PreviousTournament />
    </main>
  );
}
