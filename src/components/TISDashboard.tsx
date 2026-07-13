import { useState, useCallback, useRef } from 'react';
import { parseTISPdf, type TISResult, type TISEntry } from '@/lib/tisEngine';
import { type ProcessingResult } from '@/lib/taxEngine';
import { type BankingProcessingResult } from '@/lib/bankingEngine';
import {
  Upload,
  FileText,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface TISDashboardProps {
  cgResult: ProcessingResult | null;
  bsResult: BankingProcessingResult | null;
  onResultChange?: (result: TISResult | null) => void;
}

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);

/** Map TIS category to the equivalent value we can compute from our data */
function getOurValue(
  category: string,
  cgResult: ProcessingResult | null,
  bsResult: BankingProcessingResult | null
): number | null {
  const cat = category.toLowerCase();

  if (cat.includes('dividend') && bsResult) {
    return bsResult.summary.totalDividend;
  }
  if (cat.includes('interest from savings bank') && bsResult) {
    // interest category in banking engine aggregates all interest
    return bsResult.summary.totalInterest;
  }
  if (cat.includes('interest from deposit') && bsResult) {
    return bsResult.summary.totalInterest;
  }
  if (cat.includes('sale of securities') && cgResult) {
    return cgResult.overallSummary.total.saleValue;
  }
  if (cat.includes('purchase of securities') && cgResult) {
    return cgResult.overallSummary.total.purchaseValue;
  }
  if (cat.includes('salary') && bsResult) {
    return bsResult.summary.totalSalary;
  }
  if (cat.includes('cash deposit') && bsResult) {
    return bsResult.summary.totalCashDeposit;
  }
  if (cat.includes('cash withdrawal') && bsResult) {
    return bsResult.summary.totalWithdrawal;
  }

  return null; // no matching data
}

/** Determine mismatch severity */
function getMismatchSeverity(tis: number, ours: number | null): 'match' | 'mismatch' | 'unknown' {
  if (ours === null) return 'unknown';
  const diff = Math.abs(tis - ours);
  const pct = tis > 0 ? diff / tis : diff;
  if (pct < 0.01) return 'match'; // within 1%
  return 'mismatch';
}

export function TISDashboard({ cgResult, bsResult, onResultChange }: TISDashboardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TISResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File, pwd: string) => {
    setIsLoading(true);
    setErrors([]);
    setResult(null);

    try {
      const parsed = await parseTISPdf(file, pwd || undefined);

      if (parsed.parseErrors.some(e => e.toLowerCase().includes('password'))) {
        setNeedsPassword(true);
        setPendingFile(file);
        setErrors(parsed.parseErrors);
        setResult(null);
        if (onResultChange) onResultChange(null);
      } else {
        setResult(parsed);
        setNeedsPassword(false);
        if (parsed.parseErrors.length > 0) setErrors(parsed.parseErrors);
        if (onResultChange) onResultChange(parsed);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors([`Unexpected error: ${msg}`]);
    } finally {
      setIsLoading(false);
    }
  }, [onResultChange]);

  const handleFileAccepted = useCallback((file: File) => {
    setFileName(file.name);
    setNeedsPassword(false);
    setPassword('');
    processFile(file, '');
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      handleFileAccepted(file);
    } else {
      setErrors(['Please upload a valid PDF file.']);
    }
  }, [handleFileAccepted]);

  const handlePasswordSubmit = useCallback(() => {
    if (pendingFile) {
      processFile(pendingFile, password);
    }
  }, [pendingFile, password, processFile]);

  const clearAll = () => {
    setResult(null);
    setFileName(null);
    setPassword('');
    setErrors([]);
    setNeedsPassword(false);
    setPendingFile(null);
    if (onResultChange) onResultChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasData = !!result && result.entries.length > 0;
  const hasAnyComparison = (cgResult !== null || bsResult !== null) && hasData;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">

      {/* ─── Header ─── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-violet-400" />
            Tax Information Statement (TIS)
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Upload your TIS PDF from the Income Tax portal. We'll extract your income categories and cross-check them against your Capital Gains and Bank Statement data.
          </p>
        </div>
        {fileName && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* ─── Upload Zone ─── */}
      {!hasData && (
        <div className="mb-6">
          <div
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300
              ${isDragging
                ? 'border-violet-500/60 bg-violet-500/5'
                : 'border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/50'
              }
              ${isLoading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileAccepted(file);
              }}
            />
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className={`mb-4 rounded-full border p-4 transition-colors ${isDragging ? 'border-violet-500/40 bg-violet-500/10' : 'border-zinc-700/50 bg-zinc-800/50 group-hover:border-zinc-600'}`}>
                {isLoading
                  ? <div className="h-7 w-7 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  : <Upload className={`h-7 w-7 transition-colors ${isDragging ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} strokeWidth={1.5} />
                }
              </div>
              <p className="text-sm font-medium text-zinc-300">
                {isLoading ? 'Parsing TIS PDF…' : isDragging ? 'Drop TIS PDF here' : 'Drop your TIS PDF here'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                or <span className="text-zinc-400 underline underline-offset-2">browse files</span>
                {' · '}PDF only · Password-protected files supported
              </p>
              {fileName && !isLoading && (
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-1.5">
                  <FileText className="h-3.5 w-3.5 text-violet-400" />
                  {fileName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Password Prompt ─── */}
      {needsPassword && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-amber-300">Password Required</p>
          </div>
          <p className="text-xs text-zinc-400 mb-4">
            This PDF is password-protected. Enter the password to decrypt and parse it. 
            <br />For TIS PDFs, the password is typically your PAN in uppercase (e.g. <code className="text-zinc-300">ABCDE1234F</code>).
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Enter PDF password (e.g. your PAN)"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={handlePasswordSubmit}
              disabled={!password || isLoading}
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock className="h-4 w-4" />}
              Unlock
            </button>
          </div>
        </div>
      )}

      {/* ─── Errors ─── */}
      {errors.length > 0 && !needsPassword && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-sm font-semibold text-red-300">Parse Issues</p>
          </div>
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-400 mt-1">{e}</p>
          ))}
        </div>
      )}

      {/* ─── Main Results ─── */}
      {hasData && result && (
        <>
          {/* Success Banner + File */}
          <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-emerald-300 font-medium">
                TIS parsed — {result.entries.length} categories found
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-500">{fileName}</span>
              <button onClick={clearAll} className="ml-2 text-zinc-600 hover:text-red-400 transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* ─── TIS Data Table ─── */}
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">TIS Summary Table</h3>
                <p className="text-xs text-zinc-500 mt-0.5">As extracted from your Tax Information Statement</p>
              </div>
              {!hasAnyComparison && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Info className="h-3.5 w-3.5" />
                  Upload Capital Gains / Bank Statement to see comparison
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 w-12">SR.</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">INFORMATION CATEGORY</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500">PROCESSED BY SYSTEM</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500">ACCEPTED BY TAXPAYER</th>
                    {hasAnyComparison && (
                      <>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500">OUR COMPUTED VALUE</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500">STATUS</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.entries.map((entry: TISEntry) => {
                    const ourValue = hasAnyComparison ? getOurValue(entry.category, cgResult, bsResult) : null;
                    const severity = getMismatchSeverity(entry.acceptedByTaxpayer, ourValue);

                    return (
                      <tr
                        key={entry.srNo}
                        className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/20 ${
                          severity === 'mismatch' ? 'bg-red-500/3' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 text-zinc-500 text-xs">{entry.srNo}</td>
                        <td className="px-4 py-3.5 text-zinc-200 font-medium text-xs">{entry.category}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-zinc-300">
                          {formatINR(entry.processedBySystem)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-zinc-100 font-semibold">
                          {formatINR(entry.acceptedByTaxpayer)}
                        </td>
                        {hasAnyComparison && (
                          <>
                            <td className="px-4 py-3.5 text-right font-mono text-xs">
                              {ourValue !== null ? (
                                <span className={severity === 'match' ? 'text-emerald-400' : severity === 'mismatch' ? 'text-red-400' : 'text-zinc-400'}>
                                  {formatINR(ourValue)}
                                </span>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              {severity === 'match' && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="h-3 w-3" /> Match
                                </span>
                              )}
                              {severity === 'mismatch' && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="h-3 w-3" /> Mismatch
                                </span>
                              )}
                              {severity === 'unknown' && (
                                <span className="inline-flex items-center gap-1 text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
                                  No data
                                </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Mismatch Summary ─── */}
          {hasAnyComparison && (() => {
            const mismatches = result.entries.filter(entry => {
              const ourValue = getOurValue(entry.category, cgResult, bsResult);
              return getMismatchSeverity(entry.acceptedByTaxpayer, ourValue) === 'mismatch';
            });

            if (mismatches.length === 0) return (
              <div className="mb-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300">All matched categories are consistent ✓</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Your Capital Gains and Bank Statement data align with your TIS for all comparable categories.
                  </p>
                </div>
              </div>
            );

            return (
              <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h3 className="text-sm font-semibold text-red-300">
                    {mismatches.length} Mismatch{mismatches.length > 1 ? 'es' : ''} Detected
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mb-4">
                  The following TIS categories don't match the values computed from your uploaded data. Review these carefully before filing.
                </p>
                <div className="space-y-3">
                  {mismatches.map(entry => {
                    const ourValue = getOurValue(entry.category, cgResult, bsResult);
                    const diff = ourValue !== null ? entry.acceptedByTaxpayer - ourValue : null;
                    return (
                      <div key={entry.srNo} className="rounded-lg bg-zinc-900/50 border border-red-500/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-zinc-200">{entry.category}</p>
                            <div className="mt-2 flex flex-wrap gap-4 text-xs">
                              <div>
                                <span className="text-zinc-500">TIS Value: </span>
                                <span className="text-zinc-100 font-semibold">{formatINR(entry.acceptedByTaxpayer)}</span>
                              </div>
                              {ourValue !== null && (
                                <div>
                                  <span className="text-zinc-500">Our Computed: </span>
                                  <span className="text-red-400 font-semibold">{formatINR(ourValue)}</span>
                                </div>
                              )}
                              {diff !== null && (
                                <div>
                                  <span className="text-zinc-500">Difference: </span>
                                  <span className={`font-semibold ${diff > 0 ? 'text-amber-400' : 'text-blue-400'}`}>
                                    {diff > 0 ? '+' : ''}{formatINR(diff)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ─── Raw Text (debug/verbose) ─── */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 overflow-hidden">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-800/30 transition-colors"
            >
              <span className="text-xs font-medium text-zinc-500">Raw Extracted Text (for debugging)</span>
              {showRawText ? <ChevronUp className="h-3.5 w-3.5 text-zinc-600" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />}
            </button>
            {showRawText && (
              <pre className="px-5 pb-5 text-[10px] text-zinc-600 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                {result.rawText}
              </pre>
            )}
          </div>
        </>
      )}
    </main>
  );
}
