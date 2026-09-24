import { useState, useMemo } from 'react';
import {
  Eye,
  Check,
  X,
  ChevronDown,
  AlertTriangle,
  Table2,
} from 'lucide-react';
import {
  type RawPortfolioData,
  finaliseHoldings,
  parseNumericValue,
} from '@/lib/portfolioParser';

interface PortfolioColumnReviewProps {
  rawData: RawPortfolioData;
  sourceName: string;  // file name or "Pasted Data"
  onConfirm: (holdings: { stockName: string; currentValue: number }[]) => void;
  onCancel: () => void;
}

export function PortfolioColumnReview({
  rawData,
  sourceName,
  onConfirm,
  onCancel,
}: PortfolioColumnReviewProps) {
  const [nameCol, setNameCol] = useState(rawData.detectedNameCol);
  const [valueCol, setValueCol] = useState(rawData.detectedValueCol);

  // Preview rows (show up to 8)
  const previewRows = rawData.rows.slice(0, 8);
  const totalRows = rawData.rows.length;

  // Compute how many valid holdings we'd get with the current selection
  const validCount = useMemo(() => {
    if (nameCol === -1 || valueCol === -1) return 0;
    return finaliseHoldings(rawData.rows, nameCol, valueCol).length;
  }, [rawData.rows, nameCol, valueCol]);

  const handleConfirm = () => {
    if (nameCol === -1 || valueCol === -1) return;
    const holdings = finaliseHoldings(rawData.rows, nameCol, valueCol);
    onConfirm(holdings);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  const bothSelected = nameCol !== -1 && valueCol !== -1;
  const autoDetected = rawData.detectedNameCol !== -1 && rawData.detectedValueCol !== -1;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Review Detected Columns</h4>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {sourceName} · {totalRows} rows found
              {autoDetected && (
                <span className="ml-2 text-emerald-500">✓ Columns auto-detected</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Column Selection */}
      <div className="px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/30">
        <p className="text-xs text-zinc-400 mb-3">
          Select which columns contain the <strong className="text-zinc-300">Stock Name</strong> and <strong className="text-zinc-300">Current Value</strong>:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Stock Name Column Selector */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">
              Stock Name Column
            </label>
            <div className="relative">
              <select
                value={nameCol}
                onChange={(e) => setNameCol(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 pr-8 text-xs text-zinc-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value={-1} className="bg-zinc-800 text-zinc-400">— Select column —</option>
                {rawData.headers.map((header, idx) => (
                  <option key={idx} value={idx} className="bg-zinc-800">
                    {header || `Column ${idx + 1}`}
                    {idx === rawData.detectedNameCol ? ' (auto-detected)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>
            {nameCol !== -1 && (
              <p className="mt-1 text-[10px] text-zinc-500">
                Selected: <span className="text-zinc-300 font-medium">{rawData.headers[nameCol] || `Column ${nameCol + 1}`}</span>
              </p>
            )}
          </div>

          {/* Value Column Selector */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium block mb-1.5">
              Value Column
            </label>
            <div className="relative">
              <select
                value={valueCol}
                onChange={(e) => setValueCol(Number(e.target.value))}
                className="w-full appearance-none rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-3 py-2.5 pr-8 text-xs text-zinc-200 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer"
              >
                <option value={-1} className="bg-zinc-800 text-zinc-400">— Select column —</option>
                {rawData.headers.map((header, idx) => (
                  <option key={idx} value={idx} className="bg-zinc-800">
                    {header || `Column ${idx + 1}`}
                    {idx === rawData.detectedValueCol ? ' (auto-detected)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
            </div>
            {valueCol !== -1 && (
              <p className="mt-1 text-[10px] text-zinc-500">
                Selected: <span className="text-zinc-300 font-medium">{rawData.headers[valueCol] || `Column ${valueCol + 1}`}</span>
              </p>
            )}
          </div>
        </div>

        {!bothSelected && (
          <div className="mt-3 flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <p className="text-[11px]">Please select both columns before confirming.</p>
          </div>
        )}

        {bothSelected && nameCol === valueCol && (
          <div className="mt-3 flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <p className="text-[11px]">Stock Name and Value columns cannot be the same.</p>
          </div>
        )}
      </div>

      {/* Preview Table */}
      <div className="px-5 py-3 border-b border-zinc-800/40">
        <div className="flex items-center gap-2 mb-3">
          <Table2 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            Data Preview
            {totalRows > 8 && <span className="ml-1 normal-case">(showing 8 of {totalRows} rows)</span>}
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-zinc-800/40">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/40">
                {rawData.headers.map((header, idx) => (
                  <th
                    key={idx}
                    className={`text-left px-3 py-2 text-[10px] uppercase tracking-wider font-medium whitespace-nowrap ${
                      idx === nameCol
                        ? 'text-blue-400 bg-blue-500/5'
                        : idx === valueCol
                        ? 'text-emerald-400 bg-emerald-500/5'
                        : 'text-zinc-500'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {header || `Col ${idx + 1}`}
                      {idx === nameCol && <span className="text-[8px] bg-blue-500/20 px-1 py-0.5 rounded">STOCK</span>}
                      {idx === valueCol && <span className="text-[8px] bg-emerald-500/20 px-1 py-0.5 rounded">VALUE</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, rIdx) => {
                const nameVal = nameCol !== -1 ? (row[nameCol] ?? '').trim() : '';
                const valRaw = valueCol !== -1 ? row[valueCol] : '';
                const valNum = parseNumericValue(valRaw);
                const isValidRow = nameVal !== '' && !isNaN(valNum) && valNum !== 0;

                return (
                  <tr
                    key={rIdx}
                    className={`border-b border-zinc-800/20 transition-colors ${
                      bothSelected && !isValidRow ? 'opacity-40' : 'hover:bg-zinc-800/20'
                    }`}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`px-3 py-2 text-xs whitespace-nowrap max-w-[200px] truncate ${
                          cIdx === nameCol
                            ? 'text-blue-300 bg-blue-500/5 font-medium'
                            : cIdx === valueCol
                            ? 'text-emerald-300 bg-emerald-500/5 font-medium tabular-nums'
                            : 'text-zinc-400'
                        }`}
                      >
                        {cIdx === valueCol && !isNaN(parseNumericValue(cell)) && parseNumericValue(cell) !== 0
                          ? formatCurrency(parseNumericValue(cell))
                          : cell || '—'
                        }
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer with confirm / cancel */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="text-xs text-zinc-500">
          {bothSelected && nameCol !== valueCol && (
            <span className="text-emerald-400 font-medium">{validCount} valid holdings</span>
          )}
          {bothSelected && nameCol !== valueCol && validCount === 0 && (
            <span className="text-amber-400 ml-2">No valid data found with this selection</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700/50 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!bothSelected || nameCol === valueCol || validCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/10"
          >
            <Check className="h-3 w-3" />
            Confirm & Import ({validCount})
          </button>
        </div>
      </div>
    </div>
  );
}
