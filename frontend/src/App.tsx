import { useState } from 'react';
import { Header } from '@/components/Header';
import { UnemploymentChart } from '@/components/charts/UnemploymentChart';
import { CompareChart } from '@/components/charts/CompareChart';
import { ProvincialGapChart } from '@/components/charts/ProvincialGapChart';
import { IndustryChart } from '@/components/charts/IndustryChart';
import { MacroChart } from '@/components/charts/MacroChart';

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
          <MacroChart />
        </main>

        <footer className="border-t border-[#1e2d45] px-6 py-4 text-center font-mono text-xs text-[#8892a4]">
          Data sources: Statistics Canada · Labour Force Survey · Bank of Canada Valet API
        </footer>
      </div>
    </div>
  );
}

export default App;
