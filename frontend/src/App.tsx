import { useState } from 'react';
import { Header } from '@/components/Header';
import { SectionNav } from '@/components/SectionNav';
import { Footer } from '@/components/Footer';
import { UnemploymentChart } from '@/components/charts/UnemploymentChart';
import { CompareChart } from '@/components/charts/CompareChart';
import { ProvincialGapChart } from '@/components/charts/ProvincialGapChart';
import { IndustryChart } from '@/components/charts/IndustryChart';
import { MacroChart } from '@/components/charts/MacroChart';

function App() {
  const [trendSelection, setTrendSelection] = useState(['Canada']);

  const showProvince = (province: string) => {
    setTrendSelection([province]);
    document.getElementById('trend')?.scrollIntoView();
  };

  return (
    <div id="top">
      <SectionNav />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Header onFilterProvince={showProvince} />

        <main className="space-y-6">
          <UnemploymentChart selected={trendSelection} onSelectedChange={setTrendSelection} />
          <CompareChart />
          <ProvincialGapChart />
          <IndustryChart />
          <MacroChart />
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default App;
