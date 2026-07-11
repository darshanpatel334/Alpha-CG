import type { PeriodAggregate } from '@/lib/taxEngine';
import { formatINR } from '@/lib/taxEngine';

interface RawGainsTableProps {
  periodAggregates: PeriodAggregate[];
}

export function RawGainsTable({ periodAggregates }: RawGainsTableProps) {
  const totalIntraday = periodAggregates.reduce((s, p) => s + p.intradayRaw, 0);
  const totalSTCG = periodAggregates.reduce((s, p) => s + p.stcgRaw, 0);
  const totalLTCG = periodAggregates.reduce((s, p) => s + p.ltcgRaw, 0);
  const totalAll = totalIntraday + totalSTCG + totalLTCG;
  const totalTxns = periodAggregates.reduce((s, p) => s + p.transactionCount, 0);

  // Compute cumulative gains
  const cumulativeValues: number[] = [];
  let runningTotal = 0;
  for (const p of periodAggregates) {
    runningTotal += p.totalRaw;
    cumulativeValues.push(runningTotal);
  }

  // Transposed rows
  const rows = [
    {
      label: 'Intraday',
      values: periodAggregates.map(p => p.intradayRaw),
      total: totalIntraday,
      isCurrency: true
    },
    {
      label: 'Short Term (STCG)',
      values: periodAggregates.map(p => p.stcgRaw),
      total: totalSTCG,
      isCurrency: true
    },
    {
      label: 'Long Term (LTCG)',
      values: periodAggregates.map(p => p.ltcgRaw),
      total: totalLTCG,
      isCurrency: true
    },
    {
      label: 'Total Gains',
      values: periodAggregates.map(p => p.totalRaw),
      total: totalAll,
      isCurrency: true,
      isBold: true
    },
    {
      label: 'Cumulative Gain/Loss',
      values: cumulativeValues,
      total: totalAll,
      isCurrency: true,
      isBold: true
    },
    {
      label: 'Transactions',
      values: periodAggregates.map(p => p.transactionCount),
      total: totalTxns,
      isCurrency: false,
      isMuted: true
    }
  ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Raw Gains Per Period (ITR Format)</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Aggregated capital gains before loss set-off
          </p>
        </div>
        <span className="text-[10px] font-medium text-zinc-600 bg-zinc-800/80 px-2 py-1 rounded">
          {totalTxns} transactions
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th className="px-5 py-3 text-left font-medium text-zinc-500 uppercase tracking-wider text-[10px] border-r border-zinc-800/40 bg-zinc-800/20">
                Gain Type
              </th>
              {periodAggregates.map(p => (
                <th key={p.periodIndex} className="px-5 py-3 text-right font-medium text-zinc-500 uppercase tracking-wider text-[10px]">
                  {p.periodLabel}
                </th>
              ))}
              <th className="px-5 py-3 text-right font-medium text-zinc-400 uppercase tracking-wider text-[10px] border-l border-zinc-800/40 bg-zinc-800/20">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.label}
                className={`border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/20 ${
                  idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'
                }`}
              >
                <td className="px-5 py-3 text-zinc-300 font-medium whitespace-nowrap border-r border-zinc-800/40 bg-zinc-800/10">
                  {row.label}
                </td>
                
                {row.values.map((val, i) => (
                  <td 
                    key={i} 
                    className={`px-5 py-3 text-right tabular-nums ${
                      row.isCurrency ? gainColor(val, row.isBold) : 'text-zinc-500'
                    }`}
                  >
                    {row.isCurrency 
                      ? (val !== 0 ? formatINR(val) : '—')
                      : (val !== 0 ? val : '—')}
                  </td>
                ))}

                <td className={`px-5 py-3 text-right tabular-nums border-l border-zinc-800/40 bg-zinc-800/10 ${
                  row.isCurrency ? gainColor(row.total, true) : 'text-zinc-400 font-medium'
                }`}>
                  {row.isCurrency 
                    ? formatINR(row.total)
                    : row.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function gainColor(val: number, isBold: boolean = false): string {
  if (val > 0) return isBold ? 'text-emerald-400 font-bold' : 'text-emerald-400 font-medium';
  if (val < 0) return isBold ? 'text-red-400 font-bold' : 'text-red-400 font-medium';
  return isBold ? 'text-zinc-500 font-semibold' : 'text-zinc-500';
}
