import { useState, useCallback, useEffect } from 'react';
import {
  Briefcase,
  UserPlus,
  PieChart,
  Users,
  Search,
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

type PortfolioView = 'individuals' | 'combined';

export function PortfolioDashboard() {
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeView, setActiveView] = useState<PortfolioView>('individuals');
  const [searchQuery, setSearchQuery] = useState('');

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
    },
    [loadIndividuals]
  );

  const handleDeleteIndividual = useCallback(
    (id: string) => {
      const ind = individuals.find((i) => i.id === id);
      if (ind && window.confirm(`Delete ${ind.name} and all their holdings?`)) {
        deleteIndividual(id);
        loadIndividuals();
      }
    },
    [individuals, loadIndividuals]
  );

  const filteredIndividuals = individuals.filter((ind) =>
    ind.name.toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* Sub-navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
          <button
            onClick={() => setActiveView('individuals')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
              activeView === 'individuals'
                ? 'bg-zinc-800 text-zinc-200 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
            Individuals
          </button>
          <button
            onClick={() => setActiveView('combined')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-medium transition-all duration-200 ${
              activeView === 'combined'
                ? 'bg-zinc-800 text-zinc-200 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <PieChart className="h-3.5 w-3.5" strokeWidth={1.5} />
            Combined Dashboard
          </button>
        </div>

        {activeView === 'individuals' && individuals.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search individuals..."
              className="pl-9 pr-4 py-2 rounded-lg border border-zinc-800/50 bg-zinc-900/30 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-zinc-700 focus:bg-zinc-900/50 transition-all w-56"
            />
          </div>
        )}
      </div>

      {/* Individuals View */}
      {activeView === 'individuals' && (
        <>
          {individuals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700/50">
                <Users className="h-8 w-8 text-zinc-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-zinc-200">No Individuals Yet</h3>
              <p className="text-sm text-zinc-500 mt-2 max-w-md">
                Start by adding individuals to manage their portfolio holdings.
                You can import holdings from Excel, PDF, or paste directly.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-5 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Add Your First Individual
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIndividuals.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-zinc-500">No individuals match "{searchQuery}"</p>
                </div>
              ) : (
                filteredIndividuals.map((individual) => (
                  <PortfolioIndividualCard
                    key={individual.id}
                    individual={individual}
                    onDelete={handleDeleteIndividual}
                    onRefresh={loadIndividuals}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Combined Dashboard View */}
      {activeView === 'combined' && (
        <PortfolioCombinedDashboard individuals={individuals} />
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
