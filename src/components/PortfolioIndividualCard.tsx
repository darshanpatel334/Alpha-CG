import { useState } from 'react';
import {
  User,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Check,
  X,
  Briefcase,
  TrendingUp,
  Mail,
  Phone,
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
  const [expanded, setExpanded] = useState(false);
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden transition-all duration-200 hover:border-zinc-700/80">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 text-blue-400 font-bold text-sm">
            {individual.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">{individual.name}</h4>
            <div className="flex items-center gap-3 mt-0.5">
              {individual.email && (
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Mail className="w-2.5 h-2.5" /> {individual.email}
                </span>
              )}
              {individual.phone && (
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5" /> {individual.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-500">{individual.holdings.length} stocks</p>
            <p className="text-sm font-semibold text-emerald-400 tabular-nums">{formatCurrency(totalValue)}</p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-zinc-800/60 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Action Bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/40 bg-zinc-900/20">
            <div className="flex gap-2">
              <button
                onClick={() => { setShowUpload(!showUpload); setShowManualAdd(false); }}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <Plus className="h-3 w-3" /> Import Holdings
              </button>
              <button
                onClick={() => { setShowManualAdd(!showManualAdd); setShowUpload(false); }}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add Manually
              </button>
            </div>
            <div className="flex gap-2">
              {individual.holdings.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => onDelete(individual.id)}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>

          {/* Upload Zone (collapsible) */}
          {showUpload && (
            <div className="px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/20">
              <PortfolioUploadZone onHoldingsParsed={handleHoldingsParsed} isProcessing={false} />
            </div>
          )}

          {/* Manual Add Row */}
          {showManualAdd && (
            <div className="px-5 py-3 border-b border-zinc-800/40 bg-zinc-900/20">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500 mb-1 block">Stock Name</label>
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Reliance Industries"
                    className="w-full rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/50"
                    autoFocus
                  />
                </div>
                <div className="w-40">
                  <label className="text-[10px] text-zinc-500 mb-1 block">Current Value (₹)</label>
                  <input
                    type="number"
                    value={manualValue}
                    onChange={(e) => setManualValue(e.target.value)}
                    placeholder="250000"
                    className="w-full rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/50"
                  />
                </div>
                <button
                  onClick={handleManualAdd}
                  className="rounded-md bg-emerald-500/10 border border-emerald-500/20 p-1.5 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowManualAdd(false)}
                  className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Holdings Table */}
          {individual.holdings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800/40">
                    <th className="text-left px-5 py-2.5 font-medium">#</th>
                    <th className="text-left px-5 py-2.5 font-medium">Stock Name</th>
                    <th className="text-right px-5 py-2.5 font-medium">Current Value</th>
                    <th className="text-right px-5 py-2.5 font-medium">% of Total</th>
                    <th className="text-right px-5 py-2.5 font-medium w-20">Actions</th>
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
                        <td className="px-5 py-2.5 text-xs text-zinc-600 tabular-nums">{idx + 1}</td>
                        <td className="px-5 py-2.5">
                          {editingId === holding.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500/50 w-full"
                              autoFocus
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-3 w-3 text-zinc-600" />
                              <span className="text-xs text-zinc-300">{holding.stockName}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {editingId === holding.id ? (
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="rounded border border-zinc-700/50 bg-zinc-800/50 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-blue-500/50 w-28 text-right"
                            />
                          ) : (
                            <span className="text-xs text-zinc-300 tabular-nums font-medium">
                              {formatCurrency(holding.currentValue)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <span className="text-xs text-zinc-500 tabular-nums">
                            {totalValue > 0 ? ((holding.currentValue / totalValue) * 100).toFixed(1) + '%' : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {editingId === holding.id ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="rounded p-1 text-zinc-500 hover:bg-zinc-800 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(holding)}
                                  className="rounded p-1 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleRemoveHolding(holding.id)}
                                  className="rounded p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
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
                    <td className="px-5 py-3" />
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold text-zinc-300">Total</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-bold text-emerald-400 tabular-nums">{formatCurrency(totalValue)}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-semibold text-zinc-400">100%</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <TrendingUp className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">No holdings yet. Import from file or add manually.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
