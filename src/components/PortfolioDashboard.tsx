import { useState, useCallback, useEffect } from 'react';
import {
  Briefcase,
  UserPlus,
  PieChart,
} from 'lucide-react';
import {
  getIndividuals,
  saveIndividual,
  deleteIndividual,
  createIndividual,
  type Individual,
} from '@/lib/portfolioStorage';
import { PortfolioAddIndividualModal } from './PortfolioAddIndividualModal';
import { PortfolioIndividualCard } from './PortfolioIndividualCard';
import { PortfolioCombinedDashboard } from './PortfolioCombinedDashboard';

type PortfolioTab = 'combined' | string; // 'combined' or individual id

export function PortfolioDashboard() {
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<PortfolioTab>('combined');

  // Load individuals from localStorage
  const loadIndividuals = useCallback(() => {
    setIndividuals(getIndividuals());
  }, []);

  useEffect(() => {
    loadIndividuals();
  }, [loadIndividuals]);

  const handleAddIndividual = useCallback(
    (name: string, email?: string, phone?: string) => {
      const individual = createIndividual(name, email, phone);
      saveIndividual(individual);
      loadIndividuals();
      setActiveTab(individual.id); // Switch to newly created tab
    },
    [loadIndividuals]
  );

  const handleDeleteIndividual = useCallback(
    (id: string) => {
      const ind = individuals.find((i) => i.id === id);
      if (ind && window.confirm(`Delete ${ind.name} and all their holdings?`)) {
        deleteIndividual(id);
        loadIndividuals();
        if (activeTab === id) {
          setActiveTab('combined');
        }
      }
    },
    [individuals, loadIndividuals, activeTab]
  );

  const totalHoldings = individuals.reduce((sum, ind) => sum + ind.holdings.length, 0);
  const totalPortfolioValue = individuals.reduce(
    (sum, ind) => sum + ind.holdings.reduce((s, h) => s + h.currentValue, 0),
    0
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  const activeIndividual = individuals.find(i => i.id === activeTab);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Briefcase className="w-5 h-5 text-indigo-400" />
            </div>
            Portfolios
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Manage client portfolios and view combined holdings analysis.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors self-start"
        >
          <UserPlus className="h-4 w-4" />
          Add Individual
        </button>
      </div>

      {/* Quick Stats */}
      {individuals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Individuals</p>
            <p className="text-lg font-bold text-zinc-200 tabular-nums">{individuals.length}</p>
          </div>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Stocks</p>
            <p className="text-lg font-bold text-zinc-200 tabular-nums">{totalHoldings}</p>
          </div>
          <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3 col-span-2">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Combined Portfolio Value</p>
            <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(totalPortfolioValue)}</p>
          </div>
        </div>
      )}

      {/* Dynamic Tabs Navigation */}
      <div className="mb-6 flex overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50 min-w-max">
          <button
            onClick={() => setActiveTab('combined')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
              activeTab === 'combined'
                ? 'bg-zinc-800 text-zinc-200 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <PieChart className="h-3.5 w-3.5" strokeWidth={1.5} />
            Combined Dashboard
          </button>
          
          {individuals.map((ind) => (
            <button
              key={ind.id}
              onClick={() => setActiveTab(ind.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
                activeTab === ind.id
                  ? 'bg-zinc-800 text-zinc-200 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <div className="flex h-4 w-4 items-center justify-center rounded bg-blue-500/20 text-[9px] font-bold text-blue-400">
                {ind.name.charAt(0).toUpperCase()}
              </div>
              {ind.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'combined' ? (
        <PortfolioCombinedDashboard individuals={individuals} />
      ) : activeIndividual ? (
        <PortfolioIndividualCard
          individual={activeIndividual}
          onDelete={handleDeleteIndividual}
          onRefresh={loadIndividuals}
        />
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-zinc-500">Individual not found.</p>
        </div>
      )}

      {/* Add Individual Modal */}
      <PortfolioAddIndividualModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddIndividual}
      />
    </main>
  );
}
