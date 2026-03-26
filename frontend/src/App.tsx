import { useState } from 'react';
import { Header } from '@/components/Header';
import { UnemploymentChart } from '@/components/charts/UnemploymentChart';
import { CompareChart } from '@/components/charts/CompareChart';
import { ProvincialGapChart } from '@/components/charts/ProvincialGapChart';
import { IndustryChart } from '@/components/charts/IndustryChart';

function App() {
  const [highlightProvince, setHighlightProvince] = useState<string | undefined>(
    undefined
  );

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="mx-auto max-w-6xl">
        <Header onFilterProvince={setHighlightProvince} />

        <main className="space-y-6 p-6">
          <UnemploymentChart highlightProvince={highlightProvince} />
          <CompareChart />
          <ProvincialGapChart />
          <IndustryChart />
        </main>

        <footer className="border-t border-[#1e2d45] px-6 py-4 text-center font-mono text-xs text-[#8892a4]">
          Data source: Statistics Canada · Labour Force Survey
        </footer>
      </div>
    </div>
  );
}

export default App;
