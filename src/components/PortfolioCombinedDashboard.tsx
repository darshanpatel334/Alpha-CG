import type { Individual } from '@/lib/portfolioStorage';
import { getAggregatedHoldings } from '@/lib/portfolioStorage';
import {
  PieChart,
  TrendingUp,
  Users,
  Layers,
  BarChart3,
} from 'lucide-react';

interface PortfolioCombinedDashboardProps {
  individuals: Individual[];
}

export function PortfolioCombinedDashboard({ individuals }: PortfolioCombinedDashboardProps) {
  const aggregated = getAggregatedHoldings(individuals);
  const grandTotal = aggregated.reduce((sum, h) => sum + h.totalValue, 0);
  const totalStocks = aggregated.length;
  const totalIndividuals = individuals.filter((i) => i.holdings.length > 0).length;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  // Color palette for the visual bar chart
  const barColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500',
    'bg-rose-500', 'bg-teal-500',
  ];

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

  // Top 10 holdings for the visual bar chart
  const top10 = aggregated.slice(0, 10);
  const maxValue = top10[0]?.totalValue ?? 1;

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
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

      {/* Visual Top Holdings Bar Chart */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-400" />
          <h4 className="text-sm font-semibold text-zinc-200">Top Holdings by Value</h4>
        </div>
        <div className="space-y-3">
          {top10.map((stock, idx) => (
            <div key={stock.stockName} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-300 font-medium truncate max-w-[50%]">
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

      {/* Per-Individual Breakdown */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-zinc-400" />
          <h4 className="text-sm font-semibold text-zinc-200">Individual Contributions</h4>
        </div>
        <div className="space-y-2">
          {individuals
            .filter((i) => i.holdings.length > 0)
            .sort((a, b) => {
              const aTotal = a.holdings.reduce((s, h) => s + h.currentValue, 0);
              const bTotal = b.holdings.reduce((s, h) => s + h.currentValue, 0);
              return bTotal - aTotal;
            })
            .map((ind) => {
              const indTotal = ind.holdings.reduce((s, h) => s + h.currentValue, 0);
              const pct = grandTotal > 0 ? (indTotal / grandTotal) * 100 : 0;
              return (
                <div
                  key={ind.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 text-blue-400 font-bold text-xs shrink-0">
                    {ind.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-300 truncate">{ind.name}</p>
                    <p className="text-[10px] text-zinc-500">{ind.holdings.length} stocks</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-zinc-300 tabular-nums">{formatCurrency(indTotal)}</p>
                    <p className="text-[10px] text-zinc-500 tabular-nums">{pct.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Full Combined Holdings Table */}
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
              </tr>
            </thead>
            <tbody>
              {aggregated.map((stock, idx) => (
                <tr
                  key={stock.stockName}
                  className="border-b border-zinc-800/20 hover:bg-zinc-800/20 transition-colors"
                >
                  <td className="px-5 py-2.5 text-xs text-zinc-600 tabular-nums">{idx + 1}</td>
                  <td className="px-5 py-2.5">
                    <span className="text-xs text-zinc-300">{stock.stockName}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <span className="text-xs text-zinc-300 tabular-nums font-medium">{formatCurrency(stock.totalValue)}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
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
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-zinc-900/60">
                <td className="px-5 py-3" />
                <td className="px-5 py-3">
                  <span className="text-xs font-semibold text-zinc-300">Grand Total</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-xs font-bold text-emerald-400 tabular-nums">{formatCurrency(grandTotal)}</span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-xs font-semibold text-zinc-400">100.0%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
