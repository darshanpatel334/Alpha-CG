import { AlertTriangle } from 'lucide-react';

export function STTWarningBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/80" strokeWidth={1.5} />
      <div>
        <p className="text-xs font-medium text-amber-400/90">STT Exclusion Notice</p>
        <p className="mt-0.5 text-xs text-zinc-400 leading-relaxed">
          Ensure Securities Transaction Tax (STT) is excluded from your expense columns.
          STT is not deductible for Capital Gains under Section 48 of the Income Tax Act.
        </p>
      </div>
    </div>
  );
}
