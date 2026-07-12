import { useState, useCallback } from 'react';
import { Receipt, CheckCircle2, Info, IndianRupee } from 'lucide-react';
import { formatINR } from '@/lib/taxEngine';

interface ChargesInputProps {
  /** Whether per-transaction charges were auto-detected */
  chargesDetected: boolean;
  /** Total non-STT charges already deducted */
  totalChargesDeducted: number;
  /** Total STT detected (for display) */
  totalSTT: number;
  /** Total number of transactions */
  totalTransactions: number;
  /** Called when user applies lump-sum charges */
  onApplyLumpSum: (amount: number) => void;
  /** Whether lump-sum charges have already been applied */
  lumpSumApplied: boolean;
  /** The lump-sum amount that was applied */
  appliedAmount: number;
}

export function ChargesInput({
  chargesDetected,
  totalChargesDeducted,
  totalSTT,
  totalTransactions,
  onApplyLumpSum,
  lumpSumApplied,
  appliedAmount,
}: ChargesInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApply = useCallback(() => {
    const cleaned = inputValue.replace(/[₹,\s]/g, '').trim();
    if (!cleaned) {
      setError('Enter a valid amount');
      return;
    }
    const amount = Number(cleaned);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a positive number');
      return;
    }
    setError(null);
    onApplyLumpSum(amount);
  }, [inputValue, onApplyLumpSum]);

  const handleClear = useCallback(() => {
    setInputValue('');
    setError(null);
    onApplyLumpSum(0); // Re-process without charges
  }, [onApplyLumpSum]);

  // ─── Zerodha-style: per-transaction charges detected ───
  if (chargesDetected) {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
        <div className="px-5 py-3.5 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-emerald-400">
              Per-transaction charges detected & applied
            </p>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Brokerage, exchange charges, SEBI, GST, stamp duty, and other non-STT charges have been
              automatically deducted from your capital gains.
            </p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Charges Deducted</span>
                <span className="text-xs font-semibold text-emerald-400 tabular-nums">
                  {formatINR(totalChargesDeducted, true)}
                </span>
              </div>
              {totalSTT > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">STT (excluded)</span>
                  <span className="text-xs font-medium text-zinc-500 tabular-nums">
                    {formatINR(totalSTT, true)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Transactions</span>
                <span className="text-xs font-medium text-zinc-400 tabular-nums">
                  {totalTransactions}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Groww-style: lump-sum already applied ───
  if (lumpSumApplied && appliedAmount > 0) {
    return (
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 overflow-hidden">
        <div className="px-5 py-3.5 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-400">
              Lump-sum charges applied & distributed
            </p>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {formatINR(appliedAmount, true)} distributed proportionally across {totalTransactions} transactions
              based on trade value. Capital gains have been adjusted accordingly.
            </p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Total Deducted</span>
                <span className="text-xs font-semibold text-blue-400 tabular-nums">
                  {formatINR(appliedAmount, true)}
                </span>
              </div>
              <button
                onClick={handleClear}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
              >
                Remove charges
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Groww-style: show lump-sum input ───
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
      <div className="px-5 py-3.5 flex items-start gap-3">
        <Receipt className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-200">
            No per-transaction charges detected
          </p>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Brokers like Groww show charges as a lump-sum total. Enter the total charges
            (excluding STT) from your broker's charges breakdown to deduct them from capital gains.
            They will be distributed proportionally across all {totalTransactions} transactions.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApply();
                }}
                placeholder="e.g. 9873.01"
                className={`
                  w-full rounded-md border bg-zinc-900 pl-8 pr-3 py-2 text-xs text-zinc-200
                  placeholder:text-zinc-600 outline-none transition-colors tabular-nums
                  ${error ? 'border-red-500/50 focus:border-red-500/70' : 'border-zinc-700 focus:border-blue-500/50'}
                `}
                id="lump-sum-charges-input"
              />
            </div>
            <button
              onClick={handleApply}
              className="rounded-md bg-blue-500/15 border border-blue-500/30 px-4 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/25 transition-all whitespace-nowrap"
            >
              Apply Charges
            </button>
          </div>

          {error && (
            <p className="mt-1.5 text-[11px] text-red-400">{error}</p>
          )}

          <div className="mt-2.5 flex items-start gap-1.5">
            <Info className="h-3 w-3 text-zinc-600 mt-0.5 shrink-0" strokeWidth={1.5} />
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              Exclude STT from this amount — it's not deductible under Section 48.
              Include: Brokerage, Exchange charges, SEBI, GST, Stamp Duty, DP charges, IPFT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
