import { type BankingSummary } from '@/lib/bankingEngine';
import { formatINR } from '@/lib/taxEngine';
import { Landmark, ArrowDownCircle, ArrowUpCircle, Banknote, Briefcase, Percent } from 'lucide-react';

interface BankingSummaryCardsProps {
  summary: BankingSummary;
}

export function BankingSummaryCards({ summary }: BankingSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Salary Card */}
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Salary Received</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-emerald-400">
          {formatINR(summary.totalSalary)}
        </p>
      </div>

      {/* Dividends */}
      <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Banknote className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-500">Dividends</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-blue-400">
          {formatINR(summary.totalDividend)}
        </p>
      </div>

      {/* Interest */}
      <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Percent className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500">Saving Interest</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-amber-400">
          {formatINR(summary.totalInterest)}
        </p>
      </div>

      {/* Cash Deposits */}
      <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Cash Deposits</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-indigo-400">
          {formatINR(summary.totalCashDeposit)}
        </p>
      </div>

      {/* Other Credits */}
      <div className="rounded-xl border border-zinc-500/15 bg-zinc-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownCircle className="h-4 w-4 text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Other Credits</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-zinc-300">
          {formatINR(summary.totalOtherCredit)}
        </p>
      </div>

      {/* Withdrawals / Debits */}
      <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpCircle className="h-4 w-4 text-red-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500">Other Withdrawals</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-red-400">
          {formatINR(summary.totalWithdrawal)}
        </p>
      </div>

      {/* Investments */}
      <div className="rounded-xl border border-fuchsia-500/15 bg-fuchsia-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-4 w-4 text-fuchsia-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fuchsia-500">Investments (MF/Stocks)</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-fuchsia-400">
          {formatINR(summary.totalInvestment)}
        </p>
      </div>
    </div>
  );
}
