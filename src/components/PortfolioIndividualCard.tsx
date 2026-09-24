import { useState } from 'react';
import {
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
  Briefcase,
  TrendingUp,
  Mail,
  Phone,
  Clock,
} from 'lucide-react';
import type { Individual, HoldingEntry } from '@/lib/portfolioStorage';
import { removeHolding, updateHolding, addHoldings, clearHoldings, createHolding } from '@/lib/portfolioStorage';
import { PortfolioUploadZone } from './PortfolioUploadZone';

interface PortfolioIndividualCardProps {
  individual: Individual;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function PortfolioIndividualCard({ individual, onDelete, onRefresh }: PortfolioIndividualCardProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualValue, setManualValue] = useState('');

  const totalValue = individual.holdings.reduce((sum, h) => sum + h.currentValue, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ts));

  const handleHoldingsParsed = (holdings: { stockName: string; currentValue: number }[]) => {
    const newHoldings: HoldingEntry[] = holdings.map((h) => createHolding(h.stockName, h.currentValue));
    addHoldings(individual.id, newHoldings);
    setShowUpload(false);
    onRefresh();
  };

  const handleRemoveHolding = (holdingId: string) => {
    removeHolding(individual.id, holdingId);
    onRefresh();
  };

  const handleStartEdit = (holding: HoldingEntry) => {
    setEditingId(holding.id);
    setEditName(holding.stockName);
    setEditValue(holding.currentValue.toString());
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim() && !isNaN(Number(editValue))) {
      updateHolding(individual.id, {
        id: editingId,
        stockName: editName.trim(),
        currentValue: Number(editValue),
      });
      setEditingId(null);
      onRefresh();
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleManualAdd = () => {
    if (manualName.trim() && !isNaN(Number(manualValue)) && Number(manualValue) > 0) {
      const holding = createHolding(manualName.trim(), Number(manualValue));
      addHoldings(individual.id, [holding]);
      setManualName('');
      setManualValue('');
      setShowManualAdd(false);
      onRefresh();
    }
  };

  const handleClearAll = () => {
    if (window.confirm(`Clear all ${individual.holdings.length} holdings for ${individual.name}?`)) {
      clearHoldings(individual.id);
      onRefresh();
    }
  };

  return (
    <div className="animate-in fade-in-0 duration-300">
      {/* Individual Overview Header */}
      <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 text-blue-400 font-bold text-xl">
            {individual.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-100">{individual.name}</h3>
            <div className="flex flex-wrap items-center gap-4 mt-1">
              {individual.email && (
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> {individual.email}
                </span>
              )}
              {individual.phone && (
                <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {individual.phone}
                </span>
              )}
              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Updated: {formatDate(individual.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:items-end gap-1">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Total Portfolio Value</p>
          <p className="text-2xl font-bold text-emerald-400 tabular-nums">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-zinc-500">{individual.holdings.length} stocks</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/20">
          <div className="flex gap-2">
            <button
              onClick={() => { setShowUpload(!showUpload); setShowManualAdd(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Import Holdings
            </button>
            <button
              onClick={() => { setShowManualAdd(!showManualAdd); setShowUpload(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Manually
            </button>
          </div>
          <div className="flex gap-2">
            {individual.holdings.length > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-colors"
              >
                Clear All Stocks
              </button>
            )}
            <button
              onClick={() => onDelete(individual.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Individual
            </button>
          </div>
        </div>

        {/* Upload Zone */}
        {showUpload && (
          <div className="px-5 py-6 border-b border-zinc-800/40 bg-zinc-900/20">
            <PortfolioUploadZone onHoldingsParsed={handleHoldingsParsed} isProcessing={false} />
          </div>
        )}

        {/* Manual Add Row */}
        {showManualAdd && (
          <div className="px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/20">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5 block">Stock Name</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Reliance Industries"
                  className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  autoFocus
                />
              </div>
              <div className="w-full sm:w-48">
                <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1.5 block">Current Value (₹)</label>
                <input
                  type="number"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="250000"
                  className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleManualAdd}
                  className="flex-1 sm:flex-none inline-flex justify-center items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowManualAdd(false)}
                  className="flex-1 sm:flex-none inline-flex justify-center items-center rounded-lg p-2.5 text-zinc-500 border border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Holdings Table */}
        {individual.holdings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800/40">
                  <th className="text-left px-5 py-3 font-medium">#</th>
                  <th className="text-left px-5 py-3 font-medium">Stock Name</th>
                  <th className="text-right px-5 py-3 font-medium">Current Value</th>
                  <th className="text-right px-5 py-3 font-medium">% of Total</th>
                  <th className="text-right px-5 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {individual.holdings
                  .sort((a, b) => b.currentValue - a.currentValue)
                  .map((holding, idx) => (
                    <tr
                      key={holding.id}
                      className="border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs text-zinc-600 tabular-nums">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        {editingId === holding.id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500/50 w-full"
                            autoFocus
                          />
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <Briefcase className="h-3.5 w-3.5 text-zinc-600" />
                            <span className="text-sm font-medium text-zinc-300">{holding.stockName}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {editingId === holding.id ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500/50 w-32 text-right inline-block"
                          />
                        ) : (
                          <span className="text-sm text-zinc-200 tabular-nums font-medium">
                            {formatCurrency(holding.currentValue)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="text-xs text-zinc-500 tabular-nums font-medium">
                          {totalValue > 0 ? ((holding.currentValue / totalValue) * 100).toFixed(1) + '%' : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editingId === holding.id ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="rounded p-1.5 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(holding)}
                                className="rounded p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleRemoveHolding(holding.id)}
                                className="rounded p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-900/40">
                  <td className="px-5 py-4" />
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-zinc-300">Total</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-bold text-emerald-400 tabular-nums">{formatCurrency(totalValue)}</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-xs font-semibold text-zinc-400">100%</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <TrendingUp className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-400 font-medium">No holdings yet</p>
            <p className="text-xs text-zinc-500 mt-1">Import from an Excel/PDF file, paste data, or add manually.</p>
          </div>
        )}
      </div>
    </div>
  );
}
