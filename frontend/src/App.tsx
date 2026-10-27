import { useState } from 'react';
import { Header } from '@/components/Header';
import { SectionNav } from '@/components/SectionNav';
import { Footer } from '@/components/Footer';
import { KeyFindings } from '@/components/KeyFindings';
import { WhatMoved } from '@/components/WhatMoved';
import { PolicyTimeline } from '@/components/PolicyTimeline';
import { Methodology } from '@/components/Methodology';
import { ProvinceMap } from '@/components/charts/ProvinceMap';
import { UnemploymentChart } from '@/components/charts/UnemploymentChart';
import { CompareChart } from '@/components/charts/CompareChart';
import { ProvincialGapChart } from '@/components/charts/ProvincialGapChart';
import { DemographicsChart } from '@/components/charts/DemographicsChart';
import { CitiesChart } from '@/components/charts/CitiesChart';
import { TightnessChart } from '@/components/charts/TightnessChart';
import { InflationChart, WagesChart } from '@/components/charts/PricesCharts';
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
          <KeyFindings />
          <WhatMoved />

          {/* Where */}
          <ProvinceMap onSelect={showProvince} />
          <UnemploymentChart selected={trendSelection} onSelectedChange={setTrendSelection} />
          <ProvincialGapChart />
          <CompareChart />

          {/* Who, and in which cities */}
          <DemographicsChart />
          <CitiesChart />

          {/* How tight the market is, and whether pay keeps up */}
          <TightnessChart />
          <InflationChart />
          <WagesChart />

          {/* Industries, monetary policy and official events */}
          <IndustryChart />
          <MacroChart />
          <PolicyTimeline />
          <Methodology />
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default App;
