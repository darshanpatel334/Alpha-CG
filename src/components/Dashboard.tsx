import { useState } from 'react';
import { CapitalGainsDashboard } from './CapitalGainsDashboard';
import { BankStatementDashboard } from './BankStatementDashboard';
import { BarChart3, Landmark } from 'lucide-react';

type Tab = 'capitalGains' | 'bankStatement';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('capitalGains');

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
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
            <button
              onClick={() => setActiveTab('capitalGains')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
                activeTab === 'capitalGains'
                  ? 'bg-zinc-800 text-zinc-200 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Capital Gains
            </button>
            <button
              onClick={() => setActiveTab('bankStatement')}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
                activeTab === 'bankStatement'
                  ? 'bg-zinc-800 text-zinc-200 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <Landmark className="h-3.5 w-3.5" strokeWidth={1.5} />
              Bank Statement
            </button>
          </div>
        </div>
      </header>

      {/* Render Active Dashboard */}
      {activeTab === 'capitalGains' ? <CapitalGainsDashboard /> : <BankStatementDashboard />}
    </div>
  );
}
