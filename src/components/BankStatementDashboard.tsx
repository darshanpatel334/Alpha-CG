import { useState, useCallback } from 'react';
import { parseTSV, autoMapColumns, applyColumnMapping } from '@/lib/clipboardParser';
import { processBankingTransactions, recalculateBankingSummary, type BankingProcessingResult } from '@/lib/bankingEngine';
import { PasteZone } from './PasteZone';
import { ColumnMapper } from './ColumnMapper';
import { BankingSummaryCards } from './BankingSummaryCards';
import { BankingTransactionsTable } from './BankingTransactionsTable';
import { AlertCircle, Info, Database } from 'lucide-react';

let datasetIdCounter = 0;

export interface PasteDataset {
  id: number;
  sourceName: string;
  rowCount: number;
  rows: Record<string, unknown>[];
}

export function BankStatementDashboard() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BankingProcessingResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  // Multi-dataset state
  const [pasteDatasets, setPasteDatasets] = useState<PasteDataset[]>([]);
  const [showPasteInput, setShowPasteInput] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | number>('ALL');
  
  // Mapper State
  const [showMapper, setShowMapper] = useState(false);
  const [pendingRows, setPendingRows] = useState<Record<string, unknown>[] | null>(null);
  const [pendingHeaders, setPendingHeaders] = useState<string[]>([]);
  const [pendingAutoMapping, setPendingAutoMapping] = useState<Record<string, string | null>>({});

  const processCombinedRows = useCallback((datasets: PasteDataset[]) => {
    const inputs = datasets.map(d => ({
      id: d.id,
      sourceName: d.sourceName,
      rows: d.rows,
    }));
    const processingResult = processBankingTransactions(inputs);
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
        const requiredMapped = autoMapping.date && autoMapping.description && autoMapping.withdrawal && autoMapping.deposit;

        if (requiredMapped) {
          const mappedRows = applyColumnMapping(rows, autoMapping);
          const newDataset: PasteDataset = {
            id: ++datasetIdCounter,
            sourceName: `Statement ${pasteDatasets.length + 1}`,
            rowCount: rows.length,
            rows: mappedRows,
          };
          const updatedDatasets = [...pasteDatasets, newDataset];
          setPasteDatasets(updatedDatasets);
          setShowPasteInput(false);
          processCombinedRows(updatedDatasets);
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
    [pasteDatasets, processCombinedRows]
  );

  const handleMappingConfirmed = useCallback(
    (mapping: Record<string, string | null>) => {
      if (pendingRows) {
        const mappedRows = applyColumnMapping(pendingRows, mapping);
        const newDataset: PasteDataset = {
          id: ++datasetIdCounter,
          sourceName: `Statement ${pasteDatasets.length + 1}`,
          rowCount: mappedRows.length,
          rows: mappedRows,
        };
        const updatedDatasets = [...pasteDatasets, newDataset];
        setPasteDatasets(updatedDatasets);
        setShowPasteInput(false);
        processCombinedRows(updatedDatasets);
      }
    },
    [pendingRows, pasteDatasets, processCombinedRows]
  );

  const handleMappingCancelled = useCallback(() => {
    setShowMapper(false);
    setPendingRows(null);
    setPendingHeaders([]);
    setPendingAutoMapping({});
  }, []);

  const handleCategoryChange = useCallback((txId: string, newCategory: string) => {
    setResult(prev => {
      if (!prev) return prev;
      const updatedTransactions = prev.transactions.map(tx => 
        tx.id === txId ? { ...tx, category: newCategory as any } : tx
      );
      const updatedSummary = recalculateBankingSummary(updatedTransactions);
      return {
        ...prev,
        transactions: updatedTransactions,
        summary: updatedSummary
      };
    });
  }, []);

  const hasErrors = result && result.parseErrors.length > 0;
  const fatalErrors = result?.parseErrors.filter((e) => !e.startsWith('Info:')) ?? [];
  const infoMessages = result?.parseErrors.filter((e) => e.startsWith('Info:')) ?? [];

  const tabFilteredTransactions = result?.transactions.filter(tx => 
    activeTab === 'ALL' || tx.datasetId === activeTab
  ) ?? [];

  const filteredTransactions = tabFilteredTransactions.filter(tx => 
    !activeCategory || tx.category === activeCategory
  );

  const displaySummary = result ? (activeTab === 'ALL' ? result.summary : recalculateBankingSummary(tabFilteredTransactions)) : null;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {/* ─── Input Section ─── */}
      <section className="mb-8 space-y-4">
        {showPasteInput && (
          <PasteZone
            onDataPasted={handleDataPasted}
            isProcessing={isProcessing}
            rowCount={null}
          />
        )}

        {/* Column Mapper */}
        {showMapper && (
          <ColumnMapper
            fields={[
              { key: 'date', label: 'Date', required: true },
              { key: 'description', label: 'Description/Narration', required: true },
              { key: 'withdrawal', label: 'Withdrawal (Debit)', required: true },
              { key: 'deposit', label: 'Deposit (Credit)', required: true },
              { key: 'balance', label: 'Balance', required: false },
            ]}
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
          {result && result.transactions.length === 0 && !showPasteInput && (
            <div className="mt-4">
              <button 
                onClick={() => {
                  setResult(null);
                  setActiveCategory(null);
                  setPasteDatasets([]);
                  setActiveTab('ALL');
                  setShowPasteInput(true);
                }}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-md text-sm transition-colors border border-zinc-700"
              >
                Reset & Try Again
              </button>
            </div>
          )}
        </section>
      )}

      {/* ─── Results Dashboard ─── */}
      {result && result.transactions.length > 0 && (
        <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-zinc-100">Bank Statement Summary</h2>
            <div className="flex items-center gap-3">
              {!showPasteInput && (
                <button
                  onClick={() => setShowPasteInput(true)}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-400/10 hover:bg-emerald-400/20 px-3 py-1.5 rounded-md"
                >
                  + Add Statement
                </button>
              )}
              <button
                onClick={() => {
                  setResult(null);
                  setActiveCategory(null);
                  setPasteDatasets([]);
                  setActiveTab('ALL');
                  setShowPasteInput(true);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* ─── Tabs ─── */}
          {pasteDatasets.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2">
              <button
                onClick={() => { setActiveTab('ALL'); setActiveCategory(null); }}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === 'ALL'
                    ? 'bg-zinc-800 text-zinc-100 border-b-2 border-emerald-500'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                Consolidated
              </button>
              {pasteDatasets.map((ds) => (
                <button
                  key={ds.id}
                  onClick={() => { setActiveTab(ds.id); setActiveCategory(null); }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === ds.id
                      ? 'bg-zinc-800 text-zinc-100 border-b-2 border-blue-500'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {ds.sourceName}
                </button>
              ))}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              {activeTab === 'ALL' ? 'Combined Portfolio Summary' : `${pasteDatasets.find(d => d.id === activeTab)?.sourceName} Summary`}
            </h3>
            {displaySummary && (
              <BankingSummaryCards 
                summary={displaySummary} 
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
              />
            )}
          </div>

          <BankingTransactionsTable 
            transactions={filteredTransactions} 
            onCategoryChange={handleCategoryChange}
          />
        </div>
      )}
    </main>
  );
}
