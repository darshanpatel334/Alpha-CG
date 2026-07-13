import { type ProcessingResult } from '@/lib/taxEngine';
import { type BankingProcessingResult } from '@/lib/bankingEngine';
import { type TISResult } from '@/lib/tisEngine';
import { 
  Briefcase, 
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Activity, 
  ArrowRightLeft,
  Banknote,
  Receipt,
  FileSearch,
} from 'lucide-react';

interface AllDetailsDashboardProps {
  cgResult: ProcessingResult | null;
  bsResult: BankingProcessingResult | null;
  tisResult?: TISResult | null;
}

export function AllDetailsDashboard({ cgResult, bsResult, tisResult }: AllDetailsDashboardProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  // Capital Gains Data
  const totalRealizedGain = cgResult?.overallSummary.total.gain || 0;
  const totalSaleValue = cgResult?.overallSummary.total.saleValue || 0;
  const totalSTT = cgResult?.totalSTT || 0;
  const totalCharges = cgResult?.totalChargesDeducted || 0;

  // Banking Data
  const totalInflows = (bsResult?.summary.totalSalary || 0) + 
                       (bsResult?.summary.totalDividend || 0) + 
                       (bsResult?.summary.totalInterest || 0) + 
                       (bsResult?.summary.totalCashDeposit || 0) + 
                       (bsResult?.summary.totalOtherCredit || 0);
  
  const totalOutflows = (bsResult?.summary.totalWithdrawal || 0) + 
                        (bsResult?.summary.totalInvestment || 0);

  const totalInvestmentOutflow = bsResult?.summary.totalInvestment || 0;
  const totalSalary = bsResult?.summary.totalSalary || 0;

  // Render a placeholder if no data is available at all
  if (!cgResult && !bsResult && !tisResult) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20 flex flex-col items-center justify-center text-center animate-in fade-in-0 duration-500">
        <div className="h-16 w-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700/50">
          <Activity className="h-8 w-8 text-zinc-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold text-zinc-200">No Data Available</h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-md">
          Please process some Capital Gains, Bank Statement, or TIS data in the other tabs to see your comprehensive financial overview here.
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Comprehensive Overview</h2>
        <p className="text-sm text-zinc-400 mt-1">Your aggregated financial footprint combining trading and banking activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Banking Overview Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Landmark className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Landmark className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">Banking Cashflow</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Total Inflows</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalInflows)}</p>
              <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> Salary: {formatCurrency(totalSalary)}
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Total Outflows</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totalOutflows)}</p>
              <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Investments: {formatCurrency(totalInvestmentOutflow)}
              </div>
            </div>
          </div>
        </div>

        {/* Capital Gains Overview Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <PieChart className="w-24 h-24 text-blue-400" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <PieChart className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">Trading Performance</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Net Realized Gain</p>
              <p className={`text-2xl font-bold ${totalRealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(totalRealizedGain)}
              </p>
              <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-red-400" /> Charges: {formatCurrency(totalCharges)}
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Total Sales Value</p>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(totalSaleValue)}</p>
              <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                <Receipt className="w-3 h-3" /> STT Paid: {formatCurrency(totalSTT)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TIS Summary Card (only when TIS data available) */}
      {tisResult && tisResult.entries.length > 0 && (
        <div className="mb-8 rounded-2xl border border-violet-800/30 bg-violet-900/10 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <FileSearch className="w-24 h-24 text-violet-400" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <FileSearch className="w-5 h-5 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-200">TIS Summary</h3>
            <span className="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
              {tisResult.entries.length} categories
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-2">
            {tisResult.entries.slice(0, 8).map(entry => (
              <div key={entry.srNo} className="bg-zinc-900/60 rounded-lg p-3 border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 mb-1 leading-tight">{entry.category}</p>
                <p className="text-sm font-semibold text-zinc-200 font-mono">{formatCurrency(entry.acceptedByTaxpayer)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Domain Insights */}
      <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-purple-400" />
        Cross-Domain Insights
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5 hover:bg-zinc-800/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-md bg-purple-500/10">
              <ArrowRightLeft className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Investment Efficiency</p>
          </div>
          <p className="text-xs text-zinc-500 mb-3">Net Gain vs Bank Investments</p>
          <p className="text-xl font-semibold text-zinc-100">
            {totalInvestmentOutflow > 0 
              ? ((Math.max(0, totalRealizedGain) / totalInvestmentOutflow) * 100).toFixed(1) + '%' 
              : 'N/A'}
          </p>
        </div>
        
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5 hover:bg-zinc-800/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-md bg-orange-500/10">
              <Banknote className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Trading Turnover to Salary Ratio</p>
          </div>
          <p className="text-xs text-zinc-500 mb-3">Sales Value vs Salary Inflow</p>
          <p className="text-xl font-semibold text-zinc-100">
            {totalSalary > 0 
              ? ((totalSaleValue / totalSalary) * 100).toFixed(1) + '%' 
              : 'N/A'}
          </p>
        </div>
        
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5 hover:bg-zinc-800/40 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-zinc-300">Retention Rate</p>
          </div>
          <p className="text-xs text-zinc-500 mb-3">Inflows remaining after Outflows</p>
          <p className="text-xl font-semibold text-zinc-100">
            {totalInflows > 0 
              ? (((totalInflows - totalOutflows) / totalInflows) * 100).toFixed(1) + '%' 
              : 'N/A'}
          </p>
        </div>
      </div>
    </main>
  );
}

