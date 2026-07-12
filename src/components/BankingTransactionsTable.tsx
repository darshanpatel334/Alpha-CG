import { type BankTransaction } from '@/lib/bankingEngine';
import { formatINR } from '@/lib/taxEngine';


interface BankingTransactionsTableProps {
  transactions: BankTransaction[];
}

export function BankingTransactionsTable({ transactions }: BankingTransactionsTableProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'SALARY': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'DIVIDEND': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'INTEREST': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CASH_DEPOSIT': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'WITHDRAWAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'OTHER_CREDIT': return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden mt-6">
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-10 shadow-sm shadow-black/20">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-400 whitespace-nowrap">Date</th>
              <th className="px-4 py-3 font-medium text-zinc-400 w-1/2">Description</th>
              <th className="px-4 py-3 font-medium text-zinc-400 text-right whitespace-nowrap">Withdrawal</th>
              <th className="px-4 py-3 font-medium text-zinc-400 text-right whitespace-nowrap">Deposit</th>
              <th className="px-4 py-3 font-medium text-zinc-400 text-right whitespace-nowrap">Balance</th>
              <th className="px-4 py-3 font-medium text-zinc-400 text-center whitespace-nowrap">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {transactions.map((tx, idx) => (
              <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
                  {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(tx.date)}
                </td>
                <td className="px-4 py-3 text-zinc-400 max-w-sm truncate" title={tx.description}>
                  {tx.description}
                </td>
                <td className="px-4 py-3 text-red-400 text-right tabular-nums whitespace-nowrap">
                  {tx.withdrawal > 0 ? formatINR(tx.withdrawal, true) : '-'}
                </td>
                <td className="px-4 py-3 text-emerald-400 text-right tabular-nums whitespace-nowrap">
                  {tx.deposit > 0 ? formatINR(tx.deposit, true) : '-'}
                </td>
                <td className="px-4 py-3 text-zinc-300 text-right tabular-nums whitespace-nowrap">
                  {formatINR(tx.balance, true)}
                </td>
                <td className="px-4 py-3 text-center whitespace-nowrap">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCategoryColor(tx.category)}`}>
                    {tx.category.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
