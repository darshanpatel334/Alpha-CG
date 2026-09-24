import { useState } from 'react';
import type { Individual, AggregatedHolding, AggregatedHoldingBreakdown } from '@/lib/portfolioStorage';
import { getAggregatedHoldings, removeHolding, updateHolding, addHoldings, createHolding } from '@/lib/portfolioStorage';
import {
  PieChart,
  TrendingUp,
  Users,
  Layers,
  BarChart3,
  Edit2,
  X,
  Pencil,
  Trash2,
  Check,
  Plus
} from 'lucide-react';

interface PortfolioCombinedDashboardProps {
  individuals: Individual[];
  onRefresh?: () => void;
}

export function PortfolioCombinedDashboard({ individuals, onRefresh }: PortfolioCombinedDashboardProps) {
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [addIndId, setAddIndId] = useState('');
  const [addName, setAddName] = useState('');
  const [addValue, setAddValue] = useState('');

  const aggregated = getAggregatedHoldings(individuals);
  const grandTotal = aggregated.reduce((sum, h) => sum + h.totalValue, 0);
  const totalStocks = aggregated.length;
  const totalIndividuals = individuals.filter((i) => i.holdings.length > 0).length;

  const selectedAggregated = selectedGroupKey ? aggregated.find(a => a.groupKey === selectedGroupKey) : null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  const barColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
    'bg-rose-500', 'bg-teal-500',
  ];

  const openModal = (agg: AggregatedHolding) => {
    setSelectedGroupKey(agg.groupKey);
    setEditingId(null);
    setShowAdd(false);
  };

  const closeModal = () => {
    setSelectedGroupKey(null);
    setEditingId(null);
    setShowAdd(false);
  };

  const handleStartEdit = (b: AggregatedHoldingBreakdown) => {
    setEditingId(b.holding.id);
    setEditName(b.holding.stockName);
    setEditValue(b.holding.currentValue.toString());
  };

  const handleSaveEdit = (b: AggregatedHoldingBreakdown) => {
    if (editingId && editName.trim() && !isNaN(Number(editValue))) {
      updateHolding(b.individualId, {
        id: editingId,
        stockName: editName.trim(),
        currentValue: Number(editValue),
      });
      setEditingId(null);
      if (onRefresh) onRefresh();
    }
  };

  const handleRemoveHolding = (b: AggregatedHoldingBreakdown) => {
    if (window.confirm(`Remove ${b.holding.stockName} from ${b.individualName}?`)) {
      removeHolding(b.individualId, b.holding.id);
      if (onRefresh) onRefresh();
    }
  };

  const handleStartAdd = (stockName: string) => {
    setShowAdd(true);
    setAddName(stockName);
    setAddValue('');
    setAddIndId(individuals[0]?.id || '');
  };

  const handleSaveAdd = () => {
    if (addIndId && addName.trim() && !isNaN(Number(addValue)) && Number(addValue) > 0) {
      const holding = createHolding(addName.trim(), Number(addValue));
      addHoldings(addIndId, [holding]);
      setShowAdd(false);
      setAddName('');
      setAddValue('');
      if (onRefresh) onRefresh();
    }
  };

  if (aggregated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700/50">
          <PieChart className="h-7 w-7 text-zinc-500" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-zinc-300">No Holdings Data</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Add individuals and their holdings to see the combined portfolio dashboard.
        </p>
      </div>
    );
  }

  const top10 = aggregated.slice(0, 10);
  const maxValue = top10[0]?.totalValue ?? 1;

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-zinc-400">Total Portfolio Value</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatCurrency(grandTotal)}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xs font-medium text-zinc-400">Unique Stocks</p>
          </div>
          <p className="text-2xl font-bold text-blue-400 tabular-nums">{totalStocks}</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xs font-medium text-zinc-400">Active Individuals</p>
          </div>
          <p className="text-2xl font-bold text-purple-400 tabular-nums">{totalIndividuals}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-400" />
          <h4 className="text-sm font-semibold text-zinc-200">Top Holdings by Value</h4>
        </div>
        <div className="space-y-3">
          {top10.map((stock, idx) => (
            <div key={stock.groupKey} className="group cursor-pointer" onClick={() => openModal(stock)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-300 font-medium truncate max-w-[50%] group-hover:text-blue-400 transition-colors">
                  {stock.stockName}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400 tabular-nums">{formatCurrency(stock.totalValue)}</span>
                  <span className="text-[10px] text-zinc-500 tabular-nums w-12 text-right">
                    {stock.percentOfTotal.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColors[idx % barColors.length]}`}
                  style={{ width: `${(stock.totalValue / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-zinc-400" />
            <h4 className="text-sm font-semibold text-zinc-200">Combined Holdings</h4>
            <span className="text-[10px] text-zinc-600 ml-auto">{aggregated.length} stocks across {totalIndividuals} individuals</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800/40">
                <th className="text-left px-5 py-2.5 font-medium">#</th>
                <th className="text-left px-5 py-2.5 font-medium">Stock Name</th>
                <th className="text-right px-5 py-2.5 font-medium">Total Value</th>
                <th className="text-right px-5 py-2.5 font-medium">% of Total</th>
                <th className="text-center px-5 py-2.5 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map((stock, idx) => (
                <tr
                  key={stock.groupKey}
                  className="border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors"
                >
                  <td className="px-5 py-3 text-xs text-zinc-600 tabular-nums">{idx + 1}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium text-zinc-300">{stock.stockName}</span>
                    <span className="ml-2 text-[10px] text-zinc-600">({stock.breakdown.length} entries)</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs text-zinc-300 tabular-nums font-semibold">{formatCurrency(stock.totalValue)}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-zinc-800/60 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-blue-500/60 rounded-full"
                          style={{ width: `${stock.percentOfTotal}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 tabular-nums w-12 text-right">
                        {stock.percentOfTotal.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => openModal(stock)}
                      className="inline-flex items-center gap-1.5 rounded bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 px-2.5 py-1 text-[10px] font-medium text-zinc-300 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-900/60">
                <td className="px-5 py-4" />
                <td className="px-5 py-4">
                  <span className="text-xs font-semibold text-zinc-300">Grand Total</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(grandTotal)}</span>
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="text-xs font-semibold text-zinc-400">100.0%</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {selectedAggregated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div>
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  Breakdown: {selectedAggregated.stockName}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Combined value: <span className="font-semibold text-emerald-400">{formatCurrency(selectedAggregated.totalValue)}</span>
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4">
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800/40 bg-zinc-900/40">
                      <th className="text-left px-4 py-2.5 font-medium">Individual</th>
                      <th className="text-left px-4 py-2.5 font-medium">Original Stock Name</th>
                      <th className="text-right px-4 py-2.5 font-medium">Value (₹)</th>
                      <th className="text-right px-4 py-2.5 font-medium w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAggregated.breakdown.map((b) => (
                      <tr key={b.holding.id} className="border-b border-zinc-800/20 hover:bg-zinc-800/20">
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-medium text-zinc-300">{b.individualName}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {editingId === b.holding.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500"
                            />
                          ) : (
                            <span className="text-xs text-zinc-400">{b.holding.stockName}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {editingId === b.holding.id ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500 text-right"
                            />
                          ) : (
                            <span className="text-xs text-zinc-300 tabular-nums">{formatCurrency(b.holding.currentValue)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingId === b.holding.id ? (
                              <>
                                <button onClick={() => handleSaveEdit(b)} className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-1 rounded text-zinc-500 hover:bg-zinc-800">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleStartEdit(b)} className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleRemoveHolding(b)} className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!showAdd ? (
                <button
                  onClick={() => handleStartAdd(selectedAggregated.stockName)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add entry to this group
                </button>
              ) : (
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-xs font-semibold text-zinc-300 mb-3">Add Holding</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Individual</label>
                      <select
                        value={addIndId}
                        onChange={(e) => setAddIndId(e.target.value)}
                        className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500"
                      >
                        {individuals.map(i => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Stock Name</label>
                      <input
                        type="text"
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        className="w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Value (₹)</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={addValue}
                          onChange={(e) => setAddValue(e.target.value)}
                          className="flex-1 rounded-md bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500"
                        />
                        <button onClick={handleSaveAdd} className="px-3 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowAdd(false)} className="px-3 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 border border-transparent">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
