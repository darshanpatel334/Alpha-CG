import type { OverallSummary } from '@/lib/taxEngine';
import { formatINR } from '@/lib/taxEngine';

interface OverallSummaryCardsProps {
  summary: OverallSummary;
}

export function OverallSummaryCards({ summary }: OverallSummaryCardsProps) {
  const rows = [
    {
      label: 'Intraday (0 days)',
      data: summary.intraday,
      isTotal: false,
    },
    {
      label: 'Short Term (STCG)',
      data: summary.stcg,
      isTotal: false,
    },
    {
      label: 'Long Term (LTCG)',
      data: summary.ltcg,
      isTotal: false,
    },
    {
      label: 'Overall Total',
      data: summary.total,
      isTotal: true,
    },
  ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-200">Overall Portfolio Summary</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Aggregated transaction values and net realized gains bifurcated by holding period
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-800/10">
              <th className="px-5 py-3 text-left font-medium text-zinc-500 uppercase tracking-wider text-[10px]">
                Category
              </th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500 uppercase tracking-wider text-[10px]">
                Total Sale Value
              </th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500 uppercase tracking-wider text-[10px]">
                Total Purchase
              </th>
              <th className="px-5 py-3 text-right font-medium text-zinc-500 uppercase tracking-wider text-[10px]">
                Total Sell Expenses
              </th>
              <th className="px-5 py-3 text-right font-medium text-blue-400 uppercase tracking-wider text-[10px] border-l border-zinc-800/40">
                Net Realized Gain
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.label}
                className={`
                  border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/20
                  ${idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'}
                  ${row.isTotal ? 'border-t-2 border-t-zinc-700/80 bg-zinc-800/10 hover:bg-zinc-800/20' : ''}
                `}
              >
                <td className={`px-5 py-3 whitespace-nowrap ${row.isTotal ? 'text-zinc-200 font-bold' : 'text-zinc-300 font-medium'}`}>
                  {row.label}
                </td>
                <td className={`px-5 py-3 text-right tabular-nums ${row.isTotal ? 'text-zinc-200 font-bold' : 'text-zinc-400'}`}>
                  {formatINR(row.data.saleValue)}
                </td>
                <td className={`px-5 py-3 text-right tabular-nums ${row.isTotal ? 'text-zinc-200 font-bold' : 'text-zinc-400'}`}>
                  {formatINR(row.data.purchaseValue)}
                </td>
                <td className={`px-5 py-3 text-right tabular-nums ${row.isTotal ? 'text-zinc-200 font-bold' : 'text-zinc-400'}`}>
                  {formatINR(row.data.sellExpenses)}
                </td>
                <td className={`px-5 py-3 text-right tabular-nums border-l border-zinc-800/40 ${gainColor(row.data.gain, row.isTotal)}`}>
                  {formatINR(row.data.gain)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function gainColor(val: number, isTotal: boolean): string {
  if (val > 0) return isTotal ? 'text-emerald-400 font-bold' : 'text-emerald-400 font-medium';
  if (val < 0) return isTotal ? 'text-red-400 font-bold' : 'text-red-400 font-medium';
  return isTotal ? 'text-zinc-400 font-bold' : 'text-zinc-500';
}
