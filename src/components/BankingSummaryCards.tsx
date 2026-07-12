import { type BankingSummary } from '@/lib/bankingEngine';
import { formatINR } from '@/lib/taxEngine';
import { Landmark, ArrowDownCircle, ArrowUpCircle, Banknote, Briefcase, Percent } from 'lucide-react';

interface BankingSummaryCardsProps {
  summary: BankingSummary;
  activeCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

export function BankingSummaryCards({ summary, activeCategory, onSelectCategory }: BankingSummaryCardsProps) {
  const getCardClasses = (category: string, baseColor: string) => {
    const isActive = activeCategory === category;
    const isFaded = activeCategory !== null && !isActive;
    
    let classes = `rounded-xl border p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02] `;
    
    if (isActive) {
      classes += `border-${baseColor}-500/50 bg-${baseColor}-500/15 shadow-[0_0_15px_rgba(0,0,0,0.2)] shadow-${baseColor}-500/10 ring-1 ring-${baseColor}-500/20`;
    } else if (isFaded) {
      classes += `border-${baseColor}-500/10 bg-${baseColor}-500/5 opacity-50 hover:opacity-80`;
    } else {
      classes += `border-${baseColor}-500/15 bg-${baseColor}-500/5`;
    }
    return classes;
  };

  const handleCardClick = (category: string) => {
    onSelectCategory(activeCategory === category ? null : category);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Salary Card */}
      <div 
        className={getCardClasses('SALARY', 'emerald')}
        onClick={() => handleCardClick('SALARY')}
      >
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Salary Received</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-emerald-400">
          {formatINR(summary.totalSalary)}
        </p>
      </div>

      {/* Dividends */}
      <div 
        className={getCardClasses('DIVIDEND', 'blue')}
        onClick={() => handleCardClick('DIVIDEND')}
      >
        <div className="flex items-center gap-2 mb-3">
          <Banknote className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-500">Dividends</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-blue-400">
          {formatINR(summary.totalDividend)}
        </p>
      </div>

      {/* Interest */}
      <div 
        className={getCardClasses('INTEREST', 'amber')}
        onClick={() => handleCardClick('INTEREST')}
      >
        <div className="flex items-center gap-2 mb-3">
          <Percent className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-500">Saving Interest</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-amber-400">
          {formatINR(summary.totalInterest)}
        </p>
      </div>

      {/* Cash Deposits */}
      <div 
        className={getCardClasses('CASH_DEPOSIT', 'indigo')}
        onClick={() => handleCardClick('CASH_DEPOSIT')}
      >
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Cash Deposits</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-indigo-400">
          {formatINR(summary.totalCashDeposit)}
        </p>
      </div>

      {/* Other Credits */}
      <div 
        className={getCardClasses('OTHER_CREDIT', 'zinc')}
        onClick={() => handleCardClick('OTHER_CREDIT')}
      >
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownCircle className="h-4 w-4 text-zinc-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Other Credits</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-zinc-300">
          {formatINR(summary.totalOtherCredit)}
        </p>
      </div>

      {/* Withdrawals / Debits */}
      <div 
        className={getCardClasses('WITHDRAWAL', 'red')}
        onClick={() => handleCardClick('WITHDRAWAL')}
      >
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpCircle className="h-4 w-4 text-red-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500">Other Withdrawals</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-red-400">
          {formatINR(summary.totalWithdrawal)}
        </p>
      </div>

      {/* Investments */}
      <div 
        className={getCardClasses('INVESTMENT', 'fuchsia')}
        onClick={() => handleCardClick('INVESTMENT')}
      >
        <div className="flex items-center gap-2 mb-3">
          <Landmark className="h-4 w-4 text-fuchsia-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fuchsia-500">Investments (MF/Stocks)</h3>
        </div>
        <p className="text-2xl font-bold tabular-nums text-fuchsia-400">
          {formatINR(summary.totalInvestment)}
        </p>
      </div>
      </div>
      {activeCategory && (
        <div className="flex justify-end">
          <button 
            onClick={() => onSelectCategory(null)}
            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
          >
            Show All Transactions
          </button>
        </div>
      )}
    </div>
  );
}
