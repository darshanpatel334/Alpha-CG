import { Download } from 'lucide-react';
import { exportToCSV, type CSVRow } from '@/lib/csvExport';
import type { OverallSummary, PeriodAggregate } from '@/lib/taxEngine';

interface ExportButtonProps {
  summary: OverallSummary;
  periodAggregates: PeriodAggregate[];
  fiscalYear: string;
}

export function ExportButton({
  summary,
  periodAggregates,
  fiscalYear,
}: ExportButtonProps) {
  const handleExport = () => {
    const rows: CSVRow[] = [];

    // --- SECTION 1: Overall Portfolio Summary ---
    rows.push({
      'Col1': 'OVERALL PORTFOLIO SUMMARY',
      'Col2': '',
      'Col3': '',
      'Col4': '',
      'Col5': '',
      'Col6': '',
      'Col7': '',
    });
    rows.push({
      'Col1': 'Category',
      'Col2': 'Total Sale Value',
      'Col3': 'Total Purchase',
      'Col4': 'Total Sell Expenses',
      'Col5': 'Net Realized Gain',
      'Col6': '',
      'Col7': '',
    });

    const summaryData = [
      { label: 'Intraday (0 days)', data: summary.intraday },
      { label: 'Short Term (STCG)', data: summary.stcg },
      { label: 'Long Term (LTCG)', data: summary.ltcg },
      { label: 'Overall Total', data: summary.total },
    ];

    for (const item of summaryData) {
      rows.push({
        'Col1': item.label,
        'Col2': Math.round(item.data.saleValue),
        'Col3': Math.round(item.data.purchaseValue),
        'Col4': Math.round(item.data.sellExpenses),
        'Col5': Math.round(item.data.gain),
        'Col6': '',
        'Col7': '',
      });
    }

    // Empty row separator
    rows.push({
      'Col1': '', 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '', 'Col7': ''
    });
    rows.push({
      'Col1': '', 'Col2': '', 'Col3': '', 'Col4': '', 'Col5': '', 'Col6': '', 'Col7': ''
    });

    // --- SECTION 2: Raw Gains Per Period (ITR Format) ---
    rows.push({
      'Col1': 'RAW GAINS PER PERIOD (ITR FORMAT)',
      'Col2': '',
      'Col3': '',
      'Col4': '',
      'Col5': '',
      'Col6': '',
      'Col7': '',
    });

    const periodHeaders: CSVRow = { 'Col1': 'Gain Type' };
    periodAggregates.forEach((p, i) => {
      periodHeaders[`Col${i + 2}`] = p.periodLabel;
    });
    periodHeaders[`Col${periodAggregates.length + 2}`] = 'Total';
    
    // Fill remaining columns with empty strings if any
    for (let i = periodAggregates.length + 3; i <= 7; i++) {
      periodHeaders[`Col${i}`] = '';
    }
    
    rows.push(periodHeaders);

    const totalIntraday = periodAggregates.reduce((s, p) => s + p.intradayRaw, 0);
    const totalSTCG = periodAggregates.reduce((s, p) => s + p.stcgRaw, 0);
    const totalLTCG = periodAggregates.reduce((s, p) => s + p.ltcgRaw, 0);
    const totalAll = totalIntraday + totalSTCG + totalLTCG;
    const totalTxns = periodAggregates.reduce((s, p) => s + p.transactionCount, 0);

    const cumulativeValues: number[] = [];
    let runningTotal = 0;
    for (const p of periodAggregates) {
      runningTotal += p.totalRaw;
      cumulativeValues.push(runningTotal);
    }

    const itrRows = [
      { label: 'Intraday', values: periodAggregates.map(p => p.intradayRaw), total: totalIntraday },
      { label: 'Short Term (STCG)', values: periodAggregates.map(p => p.stcgRaw), total: totalSTCG },
      { label: 'Long Term (LTCG)', values: periodAggregates.map(p => p.ltcgRaw), total: totalLTCG },
      { label: 'Total Gains', values: periodAggregates.map(p => p.totalRaw), total: totalAll },
      { label: 'Cumulative Gain/Loss', values: cumulativeValues, total: totalAll },
      { label: 'Transactions', values: periodAggregates.map(p => p.transactionCount), total: totalTxns },
    ];

    for (const item of itrRows) {
      const row: CSVRow = { 'Col1': item.label };
      item.values.forEach((val, i) => {
        row[`Col${i + 2}`] = Math.round(val);
      });
      row[`Col${periodAggregates.length + 2}`] = Math.round(item.total);
      
      // Fill remaining
      for (let i = periodAggregates.length + 3; i <= 7; i++) {
        row[`Col${i}`] = '';
      }
      rows.push(row);
    }

    const columns = ['Col1', 'Col2', 'Col3', 'Col4', 'Col5', 'Col6', 'Col7'];
    const filename = `Capital_Gains_Summary_${fiscalYear.replace(/[\s–]/g, '_')}.csv`;
    
    exportToCSV(rows, columns, filename);
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-300 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.98]"
    >
      <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
      Export Summary to CSV
    </button>
  );
}
