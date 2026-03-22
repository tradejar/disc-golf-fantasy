import TopScrollBar from '@/components/TopScrollBar';
import FeatureScrollBar from '@/components/FeatureScrollBar';
import HomeCards from '@/components/HomeCards';
import PreviousTournament from '@/components/PreviousTournament';

export default async function HomePage() {
  return (
    <main className="page-main">
      {/* app-content is a fixed-width wrapper — zoomed 1.8x on desktop via globals.css */}
      <div className="app-content">
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
      </div>
    </main>
  );
}
