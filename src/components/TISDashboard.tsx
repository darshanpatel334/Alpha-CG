import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  parseTISPDF,
  crossReferenceTIS,
  type TISParsedResult,
  type TISMismatch,
} from '@/lib/tisParser';
import { type ProcessingResult } from '@/lib/taxEngine';
import { type BankingProcessingResult } from '@/lib/bankingEngine';
import {
  FileText,
  Upload,
  Lock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface TISDashboardProps {
  cgResult: ProcessingResult | null;
  bsResult: BankingProcessingResult | null;
}

export function TISDashboard({ cgResult, bsResult }: TISDashboardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TISParsedResult | null>(null);
  const [mismatches, setMismatches] = useState<TISMismatch[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showRawText, setShowRawText] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  const processFile = useCallback(async (pdfFile: File, pwd?: string) => {
    setIsProcessing(true);
    setErrors([]);
    try {
      const parsed = await parseTISPDF(pdfFile, pwd);

      if (parsed.parseErrors.some((e) => e.includes('password'))) {
        setNeedsPassword(true);
        setErrors(parsed.parseErrors);
        setIsProcessing(false);
        return;
      }

      setResult(parsed);
      setErrors(parsed.parseErrors);
      setNeedsPassword(false);

      // Cross-reference if we have data from other tabs
      if (parsed.lineItems.length > 0) {
        const cgSaleValue = cgResult?.overallSummary.total.saleValue || 0;
        const cgPurchaseValue = cgResult?.overallSummary.total.purchaseValue || 0;

        // For banking, we need to separate interest from savings vs deposits
        // Banking engine lumps all interest together, so we use total interest as savings bank estimate
        const bankInterestTotal = bsResult?.summary.totalInterest || 0;
        const bankDividend = bsResult?.summary.totalDividend || 0;

        const xref = crossReferenceTIS(
          parsed.lineItems,
          cgSaleValue,
          cgPurchaseValue,
          bankInterestTotal, // interest from savings bank
          0, // interest from deposit (not separately tracked in banking engine)
          bankDividend,
        );
        setMismatches(xref);
      }
    } catch (err) {
      setErrors([`Unexpected error: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsProcessing(false);
    }
  }, [cgResult, bsResult]);

  // Re-run cross-reference reactively whenever CG/BS results change
  useEffect(() => {
    if (!result || result.lineItems.length === 0) return;
    const cgSaleValue = cgResult?.overallSummary.total.saleValue || 0;
    const cgPurchaseValue = cgResult?.overallSummary.total.purchaseValue || 0;
    const bankInterestTotal = bsResult?.summary.totalInterest || 0;
    const bankDividend = bsResult?.summary.totalDividend || 0;

    const xref = crossReferenceTIS(
      result.lineItems,
      cgSaleValue,
      cgPurchaseValue,
      bankInterestTotal,
      0,
      bankDividend,
    );
    setMismatches(xref);
  }, [cgResult, bsResult, result]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setResult(null);
      setMismatches([]);
      setShowRawText(false);
      processFile(f);
    }
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  });

  const handlePasswordSubmit = () => {
    if (file && password) {
      processFile(file, password);
    }
  };

  const statusIcon = (status: TISMismatch['status']) => {
    switch (status) {
      case 'match':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'mismatch':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'tis_only':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'app_only':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    }
  };

  const statusLabel = (status: TISMismatch['status']) => {
    switch (status) {
      case 'match': return 'Match';
      case 'mismatch': return 'Mismatch';
      case 'tis_only': return 'TIS Only';
      case 'app_only': return 'App Only';
    }
  };

  const statusColor = (status: TISMismatch['status']) => {
    switch (status) {
      case 'match': return 'text-emerald-400 bg-emerald-500/10';
      case 'mismatch': return 'text-red-400 bg-red-500/10';
      case 'tis_only': return 'text-yellow-400 bg-yellow-500/10';
      case 'app_only': return 'text-orange-400 bg-orange-500/10';
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <ShieldCheck className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
              TIS Verification
            </h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Upload your Tax Information Statement (TIS/AIS) PDF to verify against your data.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {!result && (
        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? 'border-violet-400 bg-violet-500/10'
                : 'border-zinc-700 hover:border-zinc-600 bg-zinc-900/30 hover:bg-zinc-900/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <div className={`p-4 rounded-2xl transition-colors ${isDragActive ? 'bg-violet-500/20' : 'bg-zinc-800/50'}`}>
                <Upload className={`w-8 h-8 ${isDragActive ? 'text-violet-400' : 'text-zinc-500'}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">
                  {isDragActive ? 'Drop your TIS PDF here…' : 'Drag & drop your TIS PDF here'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">or click to browse · Supports password-protected PDFs</p>
              </div>
            </div>
          </div>

          {/* Password prompt */}
          {needsPassword && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6 animate-in fade-in-0 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-4 h-4 text-violet-400" />
                <p className="text-sm font-medium text-violet-300">Password Required</p>
              </div>
              <p className="text-xs text-zinc-400 mb-4">This PDF is password-protected. Enter the password to continue.</p>
              <div className="flex gap-3">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Enter PDF password…"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50"
                />
                <button
                  onClick={handlePasswordSubmit}
                  disabled={!password}
                  className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 px-5 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  Unlock
                </button>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-4">
              <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-zinc-400">Parsing TIS PDF…</p>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && !needsPassword && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm font-medium text-red-300">Parsing Errors</p>
              </div>
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-zinc-400 mt-1">• {e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* File info bar */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/40 px-5 py-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-violet-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">{file?.name}</p>
                <p className="text-xs text-zinc-500">{result.lineItems.length} categories parsed</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                {showRawText ? 'Hide' : 'Show'} Raw Text
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setMismatches([]);
                  setErrors([]);
                  setPassword('');
                  setNeedsPassword(false);
                  setShowRawText(false);
                }}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Upload New
              </button>
            </div>
          </div>

          {/* Raw text viewer */}
          {showRawText && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 max-h-64 overflow-y-auto">
              <pre className="text-xs text-zinc-500 whitespace-pre-wrap font-mono">{result.rawText}</pre>
            </div>
          )}

          {/* Errors */}
          {result.parseErrors.length > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <p className="text-sm font-medium text-yellow-300">Parsing Warnings</p>
              </div>
              {result.parseErrors.map((e, i) => (
                <p key={i} className="text-xs text-zinc-400 mt-1">• {e}</p>
              ))}
            </div>
          )}

          {/* TIS Line Items Table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">TIS Summary</h3>
                <p className="text-xs text-zinc-500 mt-0.5">Information categories from your Tax Information Statement</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Info className="w-3.5 h-3.5" />
                As reported by Income Tax Dept.
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800/60">
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Sr.</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Information Category</th>
                    <th className="px-5 py-3 text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Processed by System</th>
                    <th className="px-5 py-3 text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Accepted by Taxpayer</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lineItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-5 py-3 text-sm text-zinc-500">{item.srNo}</td>
                      <td className="px-5 py-3 text-sm text-zinc-200">{item.category}</td>
                      <td className="px-5 py-3 text-sm text-zinc-300 text-right font-mono">
                        {formatCurrency(item.processedBySystem)}
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-300 text-right font-mono">
                        {formatCurrency(item.acceptedByTaxpayer)}
                      </td>
                    </tr>
                  ))}
                  {result.lineItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-zinc-500">
                        No line items could be parsed from the PDF
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cross-Reference / Mismatch Section */}
          {mismatches.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="border-b border-zinc-800 px-5 py-3">
                <h3 className="text-sm font-semibold text-zinc-200">Cross-Reference Verification</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Comparing TIS values against your Capital Gains and Bank Statement data
                </p>
              </div>

              {/* Summary pills */}
              <div className="px-5 py-3 border-b border-zinc-800/60 flex flex-wrap gap-3">
                {(() => {
                  const matchCount = mismatches.filter((m) => m.status === 'match').length;
                  const mismatchCount = mismatches.filter((m) => m.status === 'mismatch').length;
                  const tisOnly = mismatches.filter((m) => m.status === 'tis_only').length;
                  return (
                    <>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> {matchCount} Matched
                      </span>
                      {mismatchCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-red-500/10 text-red-400">
                          <XCircle className="w-3 h-3" /> {mismatchCount} Mismatched
                        </span>
                      )}
                      {tisOnly > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-yellow-500/10 text-yellow-400">
                          <AlertTriangle className="w-3 h-3" /> {tisOnly} TIS Only
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Category</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider">TIS Value</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Your Data</th>
                      <th className="px-5 py-3 text-right text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Difference</th>
                      <th className="px-5 py-3 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Source</th>
                      <th className="px-5 py-3 text-center text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mismatches.map((m, idx) => (
                      <tr key={idx} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-5 py-3 text-sm text-zinc-200">{m.category}</td>
                        <td className="px-5 py-3 text-sm text-zinc-300 text-right font-mono">{formatCurrency(m.tisValue)}</td>
                        <td className="px-5 py-3 text-sm text-zinc-300 text-right font-mono">
                          {m.status === 'tis_only' ? (
                            <span className="text-zinc-600">—</span>
                          ) : (
                            formatCurrency(m.appValue)
                          )}
                        </td>
                        <td className={`px-5 py-3 text-sm text-right font-mono ${m.difference > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {m.difference > 0 ? formatCurrency(m.difference) : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-xs text-zinc-500 capitalize">{m.source.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(m.status)}`}>
                            {statusIcon(m.status)}
                            {statusLabel(m.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No cross-ref data hint */}
          {mismatches.length === 0 && result.lineItems.length > 0 && (!cgResult && !bsResult) && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/20 p-5 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-zinc-300">Cross-reference data not available</p>
                <p className="text-xs text-zinc-500 mt-1">
                  To see how your TIS matches up, process some data in the <strong>Capital Gains</strong> or <strong>Bank Statement</strong> tabs first, then come back here.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
