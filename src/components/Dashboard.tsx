import { useState } from 'react';
import { CapitalGainsDashboard } from './CapitalGainsDashboard';
import { BankStatementDashboard } from './BankStatementDashboard';
import { TISDashboard } from './TISDashboard';
import { AllDetailsDashboard } from './AllDetailsDashboard';
import { BarChart3, Landmark, Activity, FileSearch } from 'lucide-react';
import { type ProcessingResult } from '@/lib/taxEngine';
import { type BankingProcessingResult } from '@/lib/bankingEngine';
import { type TISResult } from '@/lib/tisEngine';

type Tab = 'capitalGains' | 'bankStatement' | 'tis' | 'allDetails';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('capitalGains');
  const [cgResult, setCgResult] = useState<ProcessingResult | null>(null);
  const [bsResult, setBsResult] = useState<BankingProcessingResult | null>(null);
  const [tisResult, setTisResult] = useState<TISResult | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; accent?: string }[] = [
    { id: 'capitalGains', label: 'Capital Gains', icon: <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { id: 'bankStatement', label: 'Bank Statement', icon: <Landmark className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    { id: 'tis', label: 'TIS', icon: <FileSearch className="h-3.5 w-3.5" strokeWidth={1.5} />, accent: 'violet' },
    { id: 'allDetails', label: 'ALL Details', icon: <Activity className="h-3.5 w-3.5" strokeWidth={1.5} /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Global Header ─── */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 border border-blue-500/20">
              <BarChart3 className="h-4 w-4 text-blue-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 tracking-tight">
                Nivezo Tax
              </h1>
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                Financial Analysis Engine
              </p>
            </div>
          </div>

          {/* Global Tabs */}
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50 gap-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? tab.accent === 'violet'
                      ? 'bg-violet-600/20 text-violet-300 shadow-sm border border-violet-500/20'
                      : 'bg-zinc-800 text-zinc-200 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                {tab.icon}
                {tab.label}
                {/* Indicator dot if TIS tab has data */}
                {tab.id === 'tis' && tisResult && tisResult.entries.length > 0 && (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 
        All dashboards are rendered but hidden when inactive.
        This preserves their internal state (data persists across tab switches).
      */}
      <div className={activeTab === 'capitalGains' ? 'block' : 'hidden'}>
        <CapitalGainsDashboard onResultChange={setCgResult} />
      </div>

      <div className={activeTab === 'bankStatement' ? 'block' : 'hidden'}>
        <BankStatementDashboard onResultChange={setBsResult} />
      </div>

      <div className={activeTab === 'tis' ? 'block' : 'hidden'}>
        <TISDashboard
          cgResult={cgResult}
          bsResult={bsResult}
          onResultChange={setTisResult}
        />
      </div>

      <div className={activeTab === 'allDetails' ? 'block' : 'hidden'}>
        <AllDetailsDashboard cgResult={cgResult} bsResult={bsResult} tisResult={tisResult} />
      </div>
    </div>
  );
}

