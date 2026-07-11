import type { SetOffResult } from '@/lib/taxEngine';
import { formatINR } from '@/lib/taxEngine';

interface SetOffTableProps {
  setOffResults: SetOffResult[];
}

export function SetOffTable({ setOffResults }: SetOffTableProps) {
  const totalIntradayBefore = setOffResults.reduce((s, r) => s + r.intradayBeforeSetOff, 0);
  const totalSTCGBefore = setOffResults.reduce((s, r) => s + r.stcgBeforeSetOff, 0);
  const totalLTCGBefore = setOffResults.reduce((s, r) => s + r.ltcgBeforeSetOff, 0);
  const totalIntradayAfter = setOffResults.reduce((s, r) => s + r.intradayAfterSetOff, 0);
  const totalSTCGAfter = setOffResults.reduce((s, r) => s + r.stcgAfterSetOff, 0);
  const totalLTCGAfter = setOffResults.reduce((s, r) => s + r.ltcgAfterSetOff, 0);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-3">
        <h3 className="text-sm font-semibold text-zinc-200">
          Final Advance Tax Bifurcation
          <span className="font-normal text-zinc-500 ml-1">(After Set-off)</span>
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Chronological loss roll-forward applied across periods
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800/60">
              <th
                rowSpan={2}
                className="px-5 py-2.5 text-left font-medium text-zinc-500 uppercase tracking-wider text-[10px] border-r border-zinc-800/40 align-bottom"
              >
                Period
              </th>
              <th
                colSpan={3}
                className="px-2 py-1.5 text-center font-medium text-zinc-500 uppercase tracking-wider text-[10px] border-b border-zinc-800/40 border-r border-zinc-800/40"
              >
                Intraday
              </th>
              <th
                colSpan={3}
                className="px-2 py-1.5 text-center font-medium text-zinc-500 uppercase tracking-wider text-[10px] border-b border-zinc-800/40 border-r border-zinc-800/40"
              >
                Short Term Capital Gains
              </th>
              <th
                colSpan={3}
                className="px-2 py-1.5 text-center font-medium text-zinc-500 uppercase tracking-wider text-[10px] border-b border-zinc-800/40"
              >
                Long Term Capital Gains
              </th>
            </tr>
            <tr className="border-b border-zinc-800/60">
              <th className="px-3 py-2 text-right font-medium text-zinc-600 text-[10px]">Before</th>
              <th className="px-3 py-2 text-right font-medium text-amber-600/70 text-[10px]">Set-off</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-600 text-[10px] border-r border-zinc-800/40">After</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-600 text-[10px]">Before</th>
              <th className="px-3 py-2 text-right font-medium text-amber-600/70 text-[10px]">Set-off</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-600 text-[10px] border-r border-zinc-800/40">After</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-600 text-[10px]">Before</th>
              <th className="px-3 py-2 text-right font-medium text-amber-600/70 text-[10px]">Set-off</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-600 text-[10px]">After</th>
            </tr>
          </thead>
          <tbody>
            {setOffResults.map((row, idx) => {
              const hasSTCGSetoff = row.stcgLossAbsorbed > 0;
              const hasLTCGSetoff = row.ltcgLossAbsorbed > 0;

              return (
                <tr
                  key={row.periodIndex}
                  className={`border-b border-zinc-800/30 transition-colors hover:bg-zinc-800/20 ${
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-zinc-900/20'
                  }`}
                >
                  <td className="px-5 py-2.5 text-zinc-300 font-medium whitespace-nowrap border-r border-zinc-800/40">
                    {row.periodLabel}
                  </td>

                  {/* Intraday columns */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${gainColor(row.intradayBeforeSetOff)}`}>
                    {formatINR(row.intradayBeforeSetOff)}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${row.intradayLossAbsorbed > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {row.intradayLossAbsorbed > 0 ? `−${formatINR(row.intradayLossAbsorbed).replace(/^-?₹/, '₹')}` : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-semibold border-r border-zinc-800/40 ${gainColor(row.intradayAfterSetOff)}`}>
                    {formatINR(row.intradayAfterSetOff)}
                  </td>

                  {/* STCG columns */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${gainColor(row.stcgBeforeSetOff)}`}>
                    {formatINR(row.stcgBeforeSetOff)}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${hasSTCGSetoff ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {hasSTCGSetoff ? `−${formatINR(row.stcgLossAbsorbed).replace(/^-?₹/, '₹')}` : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-semibold border-r border-zinc-800/40 ${gainColor(row.stcgAfterSetOff)}`}>
                    {formatINR(row.stcgAfterSetOff)}
                  </td>

                  {/* LTCG columns */}
                  <td className={`px-3 py-2.5 text-right tabular-nums ${gainColor(row.ltcgBeforeSetOff)}`}>
                    {formatINR(row.ltcgBeforeSetOff)}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${hasLTCGSetoff ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {hasLTCGSetoff ? `−${formatINR(row.ltcgLossAbsorbed).replace(/^-?₹/, '₹')}` : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${gainColor(row.ltcgAfterSetOff)}`}>
                    {formatINR(row.ltcgAfterSetOff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-700 bg-zinc-800/30">
              <td className="px-5 py-3 text-zinc-300 font-semibold border-r border-zinc-800/40">
                Total
              </td>
              <td className={`px-3 py-3 text-right tabular-nums font-bold ${gainColor(totalIntradayBefore)}`}>
                {formatINR(totalIntradayBefore)}
              </td>
              <td className="px-3 py-3 text-right text-zinc-600">—</td>
              <td className={`px-3 py-3 text-right tabular-nums font-bold border-r border-zinc-800/40 ${gainColor(totalIntradayAfter)}`}>
                {formatINR(totalIntradayAfter)}
              </td>
              <td className={`px-3 py-3 text-right tabular-nums font-bold ${gainColor(totalSTCGBefore)}`}>
                {formatINR(totalSTCGBefore)}
              </td>
              <td className="px-3 py-3 text-right text-zinc-600">—</td>
              <td className={`px-3 py-3 text-right tabular-nums font-bold border-r border-zinc-800/40 ${gainColor(totalSTCGAfter)}`}>
                {formatINR(totalSTCGAfter)}
              </td>
              <td className={`px-3 py-3 text-right tabular-nums font-bold ${gainColor(totalLTCGBefore)}`}>
                {formatINR(totalLTCGBefore)}
              </td>
              <td className="px-3 py-3 text-right text-zinc-600">—</td>
              <td className={`px-3 py-3 text-right tabular-nums font-bold ${gainColor(totalLTCGAfter)}`}>
                {formatINR(totalLTCGAfter)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function gainColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-zinc-500';
}
