import { useState, useCallback } from 'react';
import * as React from 'react';
import { processTransactions, distributeLumpSumCharges, type ProcessingResult, DEFAULT_HOLDING_THRESHOLD } from '@/lib/taxEngine';
import { parseTSV, autoMapColumns, applyColumnMapping } from '@/lib/clipboardParser';
import { PasteZone } from './PasteZone';
import { ColumnMapper } from './ColumnMapper';
import { HoldingPeriodConfig } from './HoldingPeriodConfig';
import { OverallSummaryCards } from './OverallSummaryCards';
import { RawGainsTable } from './RawGainsTable';
import { ChargesInput } from './ChargesInput';
import { ExportButton } from './ExportButton';
import { SaveReportModal } from './SaveReportModal';
import { SavedReportsMenu } from './SavedReportsMenu';
import { saveReport, type SavedReport } from '@/lib/storage';
import {
  BarChart3,
  AlertCircle,
  Info,
  Save,
  FolderOpen,
  Plus,
  Database,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';



interface PasteDataset {
  id: number;
  sourceName: string;
  rowCount: number;
  rows: Record<string, unknown>[];
}

let datasetIdCounter = 0;

export interface CapitalGainsDashboardProps {
  onResultChange?: (result: ProcessingResult | null) => void;
}

export function CapitalGainsDashboard({ onResultChange }: CapitalGainsDashboardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  React.useEffect(() => {
    if (onResultChange) {
      onResultChange(result);
    }
  }, [result, onResultChange]);

  const [holdingThreshold, setHoldingThreshold] = useState(DEFAULT_HOLDING_THRESHOLD);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[] | null>(null);

  // Column mapper state
  const [showMapper, setShowMapper] = useState(false);
  const [pendingRows, setPendingRows] = useState<Record<string, unknown>[] | null>(null);
  const [pendingHeaders, setPendingHeaders] = useState<string[]>([]);
  const [pendingAutoMapping, setPendingAutoMapping] = useState<Record<string, string | null>>({});
  const [pasteRowCount, setPasteRowCount] = useState<number | null>(null);

  // Multi-demat paste state
  const [pasteDatasets, setPasteDatasets] = useState<PasteDataset[]>([]);
  const [showPasteInput, setShowPasteInput] = useState(true);

  // Save/Load Modals state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

  // Lump-sum charges state (per dataset)
  const [lumpSumCharges, setLumpSumCharges] = useState<Record<number, number>>({});
  const [lumpSumApplied, setLumpSumApplied] = useState<Record<number, boolean>>({});

  // ─── Process combined rows from all datasets ───
  const processCombinedRows = useCallback(
    (datasets: PasteDataset[], customLumpSum = lumpSumCharges) => {
      const inputs = datasets.map(d => {
        const amount = customLumpSum[d.id] || 0;
        const rows = amount > 0 ? distributeLumpSumCharges(d.rows, amount) : d.rows;
        return { id: d.id, sourceName: d.sourceName, rows };
      });
      const combined = datasets.flatMap(d => d.rows);
      setRawRows(combined);
      const processingResult = processTransactions(inputs, holdingThreshold);
      setResult(processingResult);
      setShowMapper(false);
      setPasteRowCount(combined.length);
    },
    [holdingThreshold, lumpSumCharges]
  );


  const makeEmptyResult = (errors: string[]): ProcessingResult => ({
    transactions: [],
    overallSummary: {
      intraday: { purchaseValue: 0, saleValue: 0, sellExpenses: 0, gain: 0 },
      stcg: { purchaseValue: 0, saleValue: 0, sellExpenses: 0, gain: 0 },
      ltcg: { purchaseValue: 0, saleValue: 0, sellExpenses: 0, gain: 0 },
      total: { purchaseValue: 0, saleValue: 0, sellExpenses: 0, gain: 0 },
    },
    periodAggregates: [],
    setOffResults: [],
    remainingIntradayLoss: 0,
    remainingSTCGLoss: 0,
    remainingLTCGLoss: 0,
    totalTransactions: 0,
    fiscalYear: '',
    parseErrors: errors,
    totalChargesDeducted: 0,
    totalSTT: 0,
    datasets: [],
  });


  // ─── Paste handler (appends to datasets) ───
  const handleDataPasted = useCallback(
    (text: string) => {
      setIsProcessing(true);

      try {
        const { headers, rows, rawRowCount } = parseTSV(text);

        if (rows.length === 0) {
          setResult(makeEmptyResult(['No data rows detected. Ensure you paste the header row along with data rows.']));
          setPasteRowCount(null);
          return;
        }

        // Try auto-mapping
        const autoMapping = autoMapColumns(headers);
        const requiredMapped = autoMapping.buyDate && autoMapping.sellDate &&
          autoMapping.purchaseValue && autoMapping.saleValue;

        if (requiredMapped) {
          // Auto-detected — apply mapping and add to datasets
          const mappedRows = applyColumnMapping(rows, autoMapping);
          const newDataset: PasteDataset = {
            id: ++datasetIdCounter,
            sourceName: `Paste ${pasteDatasets.length + 1}`,
            rowCount: rawRowCount,
            rows: mappedRows,
          };
          const updatedDatasets = [...pasteDatasets, newDataset];
          setPasteDatasets(updatedDatasets);
          setShowPasteInput(false);
          processCombinedRows(updatedDatasets);
        } else {
          // Show column mapper
          setPendingRows(rows);
          setPendingHeaders(headers);
          setPendingAutoMapping(autoMapping);
          setShowMapper(true);
          setPasteRowCount(rawRowCount);
        }
      } catch (error) {
        setResult(makeEmptyResult([
          `Failed to parse pasted data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ]));
        setPasteRowCount(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [pasteDatasets, processCombinedRows]
  );

  // ─── Column mapper confirm ───
  const handleMappingConfirmed = useCallback(
    (mapping: Record<string, string | null>) => {
      if (pendingRows) {
        const mappedRows = applyColumnMapping(pendingRows, mapping);
        const newDataset: PasteDataset = {
          id: ++datasetIdCounter,
          sourceName: `Paste ${pasteDatasets.length + 1}`,
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
    setPasteRowCount(null);
  }, []);

  // ─── Threshold change re-processes existing data ───
  const handleThresholdChange = useCallback(
    (newThreshold: number) => {
      setHoldingThreshold(newThreshold);
      if (pasteDatasets.length > 0) {
        processCombinedRows(pasteDatasets);
      }
    },
    [pasteDatasets, processCombinedRows]
  );

  // ─── Remove a paste dataset ───
  const handleRemoveDataset = useCallback(
    (datasetId: number) => {
      const updatedDatasets = pasteDatasets.filter(d => d.id !== datasetId);
      setPasteDatasets(updatedDatasets);
      if (updatedDatasets.length === 0) {
        setResult(null);
        setRawRows(null);
        setPasteRowCount(null);
        setShowPasteInput(true);
        setLumpSumCharges({});
        setLumpSumApplied({});
      } else {
        processCombinedRows(updatedDatasets);
      }
    },
    [pasteDatasets, processCombinedRows]
  );

  // ─── Lump-sum charges handler ───
  const handleApplyLumpSum = useCallback(
    (datasetId: number, amount: number) => {
      const newCharges = { ...lumpSumCharges, [datasetId]: amount };
      const newApplied = { ...lumpSumApplied, [datasetId]: amount > 0 };
      setLumpSumCharges(newCharges);
      setLumpSumApplied(newApplied);
      processCombinedRows(pasteDatasets, newCharges);
    },
    [lumpSumCharges, lumpSumApplied, pasteDatasets, processCombinedRows]
  );

  const handleSaveReport = (name: string, year: string) => {
    if (!result) return;
    saveReport(
      name,
      year,
      result.overallSummary,
      result.periodAggregates,
      result.totalTransactions,
      result.fiscalYear
    );
  };

  const handleLoadReport = (report: SavedReport) => {
    setResult({
      transactions: [], // Not saved
      overallSummary: report.overallSummary,
      periodAggregates: report.periodAggregates,
      setOffResults: [], // Removed in previous iteration
      remainingIntradayLoss: 0,
      remainingSTCGLoss: 0,
      remainingLTCGLoss: 0,
      totalTransactions: report.totalTransactions,
      fiscalYear: report.fiscalYear,
      parseErrors: [],
      totalChargesDeducted: 0,
      totalSTT: 0,
      datasets: [],
    });
    setRawRows(null); // Clear input rows since loaded from saved state
    setIsProcessing(false);
    setShowMapper(false);
    setPasteRowCount(null);
    setLumpSumCharges({});
    setLumpSumApplied({});
    setPasteDatasets([]);
    setShowPasteInput(true);
  };

  const hasData = result && (result.transactions.length > 0 || !rawRows); // rawRows is null for loaded reports
  const hasErrors = result && result.parseErrors.length > 0;
  const fatalErrors =
    result?.parseErrors.filter((e) => !e.startsWith('Info:')) ?? [];
  const infoMessages =
    result?.parseErrors.filter((e) => e.startsWith('Info:')) ?? [];

  return (
    <>
      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* ─── Input Section ─── */}
        <section className="mb-8 space-y-4">
          {/* Input zones */}
          <div className="space-y-3">
              {/* Existing dataset chips */}
              {pasteDatasets.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {pasteDatasets.map((ds, idx) => (
                    <div
                      key={ds.id}
                      className="inline-flex items-center gap-2 rounded-md border border-zinc-700/60 bg-zinc-800/50 px-3 py-1.5 text-xs"
                    >
                      <Database className="h-3 w-3 text-blue-400" strokeWidth={1.5} />
                      <span className="text-zinc-300 font-medium">Paste {idx + 1}</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-400 tabular-nums">{ds.rowCount} rows</span>
                      <button
                        onClick={() => handleRemoveDataset(ds.id)}
                        className="ml-1 rounded p-0.5 text-zinc-600 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
                        aria-label={`Remove paste ${idx + 1}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {!showPasteInput && (
                    <button
                      onClick={() => setShowPasteInput(true)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:border-blue-500/40 hover:text-blue-400 hover:bg-blue-500/5 transition-all"
                    >
                      <Plus className="h-3 w-3" strokeWidth={2} />
                      Add Another Demat
                    </button>
                  )}
                </div>
              )}

              {/* Paste input zone */}
              {showPasteInput && (
                <PasteZone
                  onDataPasted={handleDataPasted}
                  isProcessing={isProcessing}
                  rowCount={pasteDatasets.length === 0 ? pasteRowCount : null}
                />
              )}
            </div>

          {/* Column Mapper */}
          {showMapper && (
            <ColumnMapper
              fields={[
                { key: 'buyDate', label: 'Buy Date', required: true },
                { key: 'sellDate', label: 'Sell Date', required: true },
                { key: 'purchaseValue', label: 'Purchase Value', required: true },
                { key: 'saleValue', label: 'Sale Value', required: true },
                { key: 'purchaseExpenses', label: 'Purchase Expenses', required: false },
                { key: 'transferExpenses', label: 'Transfer Expenses', required: false },
              ]}
              detectedHeaders={pendingHeaders}
              autoMapping={pendingAutoMapping}
              onConfirm={handleMappingConfirmed}
              onCancel={handleMappingCancelled}
            />
          )}

          <HoldingPeriodConfig
            threshold={holdingThreshold}
            onChange={handleThresholdChange}
          />
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
                <ul className="space-y-1 ml-6">
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

        {/* ─── Charges Input ─── */}
        {hasData && result.datasets && result.datasets.length > 0 && (
          <section className="mb-6">
            <ChargesInput
              datasets={result.datasets}
              lumpSumCharges={lumpSumCharges}
              lumpSumApplied={lumpSumApplied}
              onApplyLumpSum={handleApplyLumpSum}
            />
          </section>
        )}

        {/* ─── Results Dashboard ─── */}
        {hasData && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Overall Summary */}
            <div className="space-y-8">
              {result.datasets && result.datasets.length > 1 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-400" />
                    Combined Portfolio Summary
                  </h3>
                  <OverallSummaryCards summary={result.overallSummary} />
                </div>
              )}
              
              {result.datasets && result.datasets.map(ds => (
                <div key={ds.id}>
                  <h3 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4 text-zinc-400" />
                    {ds.sourceName}
                  </h3>
                  <OverallSummaryCards summary={ds.overallSummary} />
                </div>
              ))}
              
              {/* Fallback for loaded reports without dataset info */}
              {(!result.datasets || result.datasets.length === 0) && (
                <OverallSummaryCards summary={result.overallSummary} />
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Fiscal Year"
                value={result.fiscalYear}
                icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
                color="blue"
              />
              <StatCard
                label="Transactions Processed"
                value={String(result.totalTransactions)}
                icon={<BarChart3 className="h-4 w-4" strokeWidth={1.5} />}
                color="zinc"
              />
            </div>

            {/* Raw Gains Table */}
            <RawGainsTable periodAggregates={result!.periodAggregates} />

            {/* Actions & Timestamp */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-700 hover:text-zinc-100 shadow-sm"
                >
                  <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Save Results
                </button>
                <button
                  onClick={() => setIsLoadModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-xs font-medium text-zinc-400 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <FolderOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Load Report
                </button>
                <ExportButton
                  summary={result!.overallSummary}
                  periodAggregates={result!.periodAggregates}
                  fiscalYear={result!.fiscalYear}
                />
              </div>
              
              <p className="text-[10px] text-zinc-700">
                Processed at {new Date().toLocaleString('en-IN')} &middot; Holding threshold: {holdingThreshold} days
              </p>
            </div>
          </div>
        )}

        {/* ─── Empty State ─── */}
        {!hasData && !isProcessing && !hasErrors && !showMapper && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full border border-zinc-800 bg-zinc-900/50 p-4 mb-4">
              <BarChart3 className="h-8 w-8 text-zinc-700" strokeWidth={1} />
            </div>
            <p className="text-sm text-zinc-500">
              Paste your broker data to begin analysis
            </p>
            <p className="text-xs text-zinc-700 mt-1">
              Supports flexible column names — the system auto-detects common broker formats
            </p>
          </div>
        )}

        {/* Success indicator */}
        {hasData && fatalErrors.length === 0 && rawRows && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-emerald-500/70">
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>All {result!.totalTransactions} transactions processed successfully</span>
          </div>
        )}
      </main>

      {/* Modals */}
      <SaveReportModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveReport}
        defaultYear={result?.fiscalYear || ''}
      />
      <SavedReportsMenu
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onLoadReport={handleLoadReport}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 mt-12">
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <p className="text-[10px] text-zinc-700">
            Nivezo Tax · For informational purposes only · Not tax advice
          </p>
          <p className="text-[10px] text-zinc-800">
            All data processed locally in your browser
          </p>
        </div>
      </footer>
    </>
  );
}

// ─── Stat Card Sub-component ────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'zinc';
}

function StatCard({ label, value, icon, color }: StatCardProps) {
  const colorMap = {
    blue: {
      border: 'border-blue-500/15',
      bg: 'bg-blue-500/5',
      icon: 'text-blue-400',
      value: 'text-blue-400',
    },
    green: {
      border: 'border-emerald-500/15',
      bg: 'bg-emerald-500/5',
      icon: 'text-emerald-400',
      value: 'text-emerald-400',
    },
    red: {
      border: 'border-red-500/15',
      bg: 'bg-red-500/5',
      icon: 'text-red-400',
      value: 'text-red-400',
    },
    zinc: {
      border: 'border-zinc-800',
      bg: 'bg-zinc-900/30',
      icon: 'text-zinc-500',
      value: 'text-zinc-200',
    },
  };

  const c = colorMap[color];

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4 transition-colors`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={c.icon}>{icon}</span>
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${c.value}`}>{value}</p>
    </div>
  );
}
