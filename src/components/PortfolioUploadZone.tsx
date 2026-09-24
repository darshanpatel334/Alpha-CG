import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  ImageIcon,
  ClipboardPaste,
  X,
  Table2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  extractRawFromFile,
  extractRawFromPaste,
  type RawPortfolioData,
  type PortfolioHolding,
} from '@/lib/portfolioParser';
import { PortfolioColumnReview } from './PortfolioColumnReview';

interface PortfolioUploadZoneProps {
  onHoldingsParsed: (holdings: PortfolioHolding[]) => void;
  isProcessing: boolean;
}

export function PortfolioUploadZone({ onHoldingsParsed, isProcessing }: PortfolioUploadZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Review state: raw data waiting for user confirmation
  const [reviewData, setReviewData] = useState<RawPortfolioData | null>(null);
  const [reviewSource, setReviewSource] = useState('');

  // Paste state
  const [pasteMode, setPasteMode] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── File handling ──────────────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setProcessing(true);
    setReviewData(null);

    try {
      const raw = await extractRawFromFile(file);
      if (raw.headers.length === 0 || raw.rows.length === 0) {
        setError('No data could be extracted from this file. Please check the format.');
        setProcessing(false);
        return;
      }
      setReviewData(raw);
      setReviewSource(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setProcessing(false);
    }
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null);
      if (rejectedFiles && (rejectedFiles as Array<unknown>).length > 0) {
        setError('Invalid file type. Please upload Excel, PDF, or image files.');
        return;
      }
      if (acceptedFiles.length === 0) return;
      handleFile(acceptedFiles[0]);
    },
    [handleFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
    disabled: isProcessing || processing || reviewData !== null,
  });

  // ── Paste handling ─────────────────────────────────────────────────────

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (text.trim()) {
        setHasContent(true);
        if (textareaRef.current) {
          textareaRef.current.value = text;
        }
        setError(null);
        const raw = extractRawFromPaste(text);
        if (raw.headers.length === 0 || raw.rows.length === 0) {
          setError('Could not parse data from pasted content. Ensure it has a header row and data rows.');
          return;
        }
        setReviewData(raw);
        setReviewSource('Pasted Data');
      }
    },
    []
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHasContent(!!e.target.value.trim());
  }, []);

  const handleSubmitPaste = useCallback(() => {
    if (textareaRef.current && textareaRef.current.value.trim()) {
      setError(null);
      const raw = extractRawFromPaste(textareaRef.current.value);
      if (raw.headers.length === 0 || raw.rows.length === 0) {
        setError('Could not parse data. Ensure it has a header row and data rows.');
        return;
      }
      setReviewData(raw);
      setReviewSource('Pasted Data');
    }
  }, []);

  const clearAll = useCallback(() => {
    setReviewData(null);
    setReviewSource('');
    setError(null);
    setHasContent(false);
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
  }, []);

  // ── Review confirm/cancel ──────────────────────────────────────────────

  const handleReviewConfirm = useCallback(
    (holdings: PortfolioHolding[]) => {
      onHoldingsParsed(holdings);
      setReviewData(null);
      setReviewSource('');
      setHasContent(false);
      if (textareaRef.current) {
        textareaRef.current.value = '';
      }
    },
    [onHoldingsParsed]
  );

  const handleReviewCancel = useCallback(() => {
    setReviewData(null);
    setReviewSource('');
  }, []);

  // ── If in review mode, show the review component ───────────────────────

  if (reviewData) {
    return (
      <div className="space-y-4">
        <PortfolioColumnReview
          rawData={reviewData}
          sourceName={reviewSource}
          onConfirm={handleReviewConfirm}
          onCancel={handleReviewCancel}
        />
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Normal upload / paste mode ─────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Toggle buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setPasteMode(false)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            !pasteMode
              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-400 border border-transparent'
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload File
        </button>
        <button
          onClick={() => setPasteMode(true)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
            pasteMode
              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-400 border border-transparent'
          }`}
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Paste Data
        </button>
      </div>

      {/* Upload Zone */}
      {!pasteMode && (
        <div
          {...getRootProps()}
          className={`
            relative group cursor-pointer rounded-lg border-2 border-dashed
            transition-all duration-300 ease-out
            ${isDragActive
              ? 'border-blue-500/60 bg-blue-500/5'
              : 'border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600 hover:bg-zinc-900/50'
            }
            ${processing ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            {processing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
                <p className="text-sm text-zinc-300">Processing file...</p>
              </div>
            ) : (
              <>
                <div className="mb-4 rounded-full border border-zinc-700/50 bg-zinc-800/50 p-3">
                  <Upload
                    className={`h-6 w-6 transition-colors ${
                      isDragActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}
                    strokeWidth={1.5}
                  />
                </div>
                <p className="text-sm font-medium text-zinc-300">
                  {isDragActive ? 'Drop your file here' : 'Drop portfolio statement here'}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  or <span className="text-zinc-400 underline underline-offset-2">browse files</span>
                </p>
                <div className="mt-3 flex gap-3 text-[10px] text-zinc-600">
                  <span className="flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" /> Excel</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> PDF</span>
                  <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> JPG/PNG</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Paste Zone */}
      {pasteMode && (
        <div
          className={`
            relative rounded-lg border-2 border-dashed transition-all duration-300
            ${isFocused ? 'border-blue-500/40 bg-blue-500/5' : 'border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600'}
          `}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
              <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Paste Holdings
              </span>
            </div>
            {hasContent && (
              <button
                onClick={clearAll}
                className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <textarea
            ref={textareaRef}
            onPaste={handlePaste}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={`Paste your holdings data here (from Excel, broker portal, etc.)

Example format:
Stock Name\tCurrent Value
Reliance Industries\t250000
TCS\t180000
HDFC Bank\t150000`}
            spellCheck={false}
            className="w-full min-h-[140px] resize-y bg-transparent px-4 py-3 text-xs text-zinc-300 placeholder:text-zinc-600 font-mono leading-relaxed outline-none"
          />

          {hasContent && (
            <div className="border-t border-zinc-800/50 px-4 py-2 flex justify-end">
              <button
                onClick={handleSubmitPaste}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                <Table2 className="h-3 w-3" />
                Review Data
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
