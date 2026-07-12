import { useState, useCallback } from 'react';
import { parseTSV, autoMapColumns, applyColumnMapping } from '@/lib/clipboardParser';
import { processBankingTransactions, type BankingProcessingResult } from '@/lib/bankingEngine';
import { PasteZone } from './PasteZone';
import { ColumnMapper } from './ColumnMapper';
import { BankingSummaryCards } from './BankingSummaryCards';
import { BankingTransactionsTable } from './BankingTransactionsTable';
import { AlertCircle, Info } from 'lucide-react';

export function BankStatementDashboard() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BankingProcessingResult | null>(null);
  
  // Mapper State
  const [showMapper, setShowMapper] = useState(false);
  const [pendingRows, setPendingRows] = useState<Record<string, unknown>[] | null>(null);
  const [pendingHeaders, setPendingHeaders] = useState<string[]>([]);
  const [pendingAutoMapping, setPendingAutoMapping] = useState<Record<string, string | null>>({});

  const processRows = useCallback((rows: Record<string, unknown>[]) => {
    const processingResult = processBankingTransactions(rows);
    setResult(processingResult);
    setShowMapper(false);
  }, []);

  const handleDataPasted = useCallback(
    (text: string) => {
      setIsProcessing(true);
      try {
        const { headers, rows } = parseTSV(text);

        if (rows.length === 0) {
          setResult({
            transactions: [],
            summary: {
              totalSalary: 0,
              totalDividend: 0,
              totalInterest: 0,
              totalCashDeposit: 0,
              totalOtherCredit: 0,
              totalWithdrawal: 0,
              totalInvestment: 0,
              totalTransactions: 0,
            },
            parseErrors: ['No data rows detected. Ensure you paste the header row along with data rows.'],
          });
          return;
        }

        // Try auto-mapping
        const autoMapping = autoMapColumns(headers);
        // Minimum required mapping for banking
        const requiredMapped = autoMapping.date && autoMapping.description;

        if (requiredMapped) {
          const mappedRows = applyColumnMapping(rows, autoMapping);
          processRows(mappedRows);
        } else {
          setPendingRows(rows);
          setPendingHeaders(headers);
          setPendingAutoMapping(autoMapping);
          setShowMapper(true);
        }
      } catch (error) {
        setResult({
          transactions: [],
          summary: {
            totalSalary: 0,
            totalDividend: 0,
            totalInterest: 0,
            totalCashDeposit: 0,
            totalOtherCredit: 0,
            totalWithdrawal: 0,
            totalInvestment: 0,
            totalTransactions: 0,
          },
          parseErrors: [`Failed to parse pasted data: ${error instanceof Error ? error.message : 'Unknown error'}`],
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [processRows]
  );

  const handleMappingConfirmed = useCallback(
    (mapping: Record<string, string | null>) => {
      if (pendingRows) {
        const mappedRows = applyColumnMapping(pendingRows, mapping);
        processRows(mappedRows);
      }
    },
    [pendingRows, processRows]
  );

  const handleMappingCancelled = useCallback(() => {
    setShowMapper(false);
    setPendingRows(null);
    setPendingHeaders([]);
    setPendingAutoMapping({});
  }, []);

  const hasErrors = result && result.parseErrors.length > 0;
  const fatalErrors = result?.parseErrors.filter((e) => !e.startsWith('Info:')) ?? [];
  const infoMessages = result?.parseErrors.filter((e) => e.startsWith('Info:')) ?? [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* ─── Input Section ─── */}
      <section className="mb-8 space-y-4">
        {!result && (
          <PasteZone
            onDataPasted={handleDataPasted}
            isProcessing={isProcessing}
            rowCount={null}
          />
        )}

        {/* Column Mapper */}
        {showMapper && (
          <ColumnMapper
            detectedHeaders={pendingHeaders}
            autoMapping={pendingAutoMapping}
            onConfirm={handleMappingConfirmed}
            onCancel={handleMappingCancelled}
          />
        )}
      </section>

      {/* ─── Parse Errors / Info ─── */}
      {hasErrors && (
        <section className="mb-6 space-y-2">
          {fatalErrors.length > 0 && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                <span className="text-xs font-medium text-red-400">
                  {fatalErrors.length} error{fatalErrors.length > 1 ? 's' : ''} encountered
                </span>
              </div>
              <ul className="space-y-1 ml-6 h-32 overflow-y-auto pr-4">
                {fatalErrors.map((err, i) => (
                  <li key={i} className="text-xs text-zinc-400 list-disc">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {infoMessages.length > 0 && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" strokeWidth={1.5} />
                <div className="space-y-0.5">
                  {infoMessages.map((msg, i) => (
                    <p key={i} className="text-xs text-zinc-400">
                      {msg.replace('Info: ', '')}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ─── Results Dashboard ─── */}
      {result && result.transactions.length > 0 && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Bank Statement Summary</h2>
            <button
              onClick={() => setResult(null)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Start Over
            </button>
          </div>
          <BankingSummaryCards summary={result.summary} />
          <BankingTransactionsTable transactions={result.transactions} />
        </div>
      )}
    </main>
  );
}
