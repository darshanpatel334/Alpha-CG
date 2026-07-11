import { useState, useCallback, useMemo } from 'react';
import { ArrowRight, Check, AlertCircle, Link2 } from 'lucide-react';

interface ColumnMapperProps {
  detectedHeaders: string[];
  autoMapping: Record<string, string | null>;
  onConfirm: (mapping: Record<string, string | null>) => void;
  onCancel: () => void;
}

const REQUIRED_FIELDS = [
  { key: 'buyDate', label: 'Buy Date', required: true },
  { key: 'sellDate', label: 'Sell Date', required: true },
  { key: 'purchaseValue', label: 'Purchase Value', required: true },
  { key: 'saleValue', label: 'Sale Value', required: true },
  { key: 'purchaseExpenses', label: 'Purchase Expenses', required: false },
  { key: 'transferExpenses', label: 'Transfer Expenses', required: false },
] as const;

export function ColumnMapper({
  detectedHeaders,
  autoMapping,
  onConfirm,
  onCancel,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string | null>>({
    ...autoMapping,
  });

  const handleChange = useCallback(
    (fieldKey: string, value: string) => {
      setMapping((prev) => ({
        ...prev,
        [fieldKey]: value === '' ? null : value,
      }));
    },
    []
  );

  const requiredFieldsMapped = useMemo(() => {
    return REQUIRED_FIELDS.filter((f) => f.required).every(
      (f) => mapping[f.key] != null
    );
  }, [mapping]);

  const autoMappedCount = useMemo(() => {
    return Object.values(autoMapping).filter((v) => v != null).length;
  }, [autoMapping]);

  const handleConfirm = useCallback(() => {
    if (requiredFieldsMapped) {
      onConfirm(mapping);
    }
  }, [mapping, requiredFieldsMapped, onConfirm]);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="border-b border-zinc-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-blue-400" strokeWidth={1.5} />
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Map Columns</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {autoMappedCount > 0
                ? `${autoMappedCount} of ${REQUIRED_FIELDS.length} fields auto-detected`
                : 'Select which column matches each field'}
            </p>
          </div>
        </div>

        {autoMappedCount === REQUIRED_FIELDS.length && (
          <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded flex items-center gap-1">
            <Check className="h-3 w-3" />
            All fields matched
          </span>
        )}
      </div>

      {/* Mapping grid */}
      <div className="px-5 py-4 space-y-3">
        {REQUIRED_FIELDS.map((field) => {
          const isMatched = mapping[field.key] != null;
          const wasAutoMatched = autoMapping[field.key] != null;

          return (
            <div
              key={field.key}
              className="flex items-center gap-3"
            >
              {/* Field label */}
              <div className="w-44 shrink-0 flex items-center gap-2">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    isMatched ? 'bg-emerald-500' : field.required ? 'bg-red-500' : 'bg-zinc-600'
                  }`}
                />
                <span className="text-xs text-zinc-300">
                  {field.label}
                  {field.required && (
                    <span className="text-red-400/70 ml-0.5">*</span>
                  )}
                </span>
                {wasAutoMatched && (
                  <span className="text-[9px] text-emerald-600 uppercase tracking-wider">
                    auto
                  </span>
                )}
              </div>

              {/* Arrow */}
              <ArrowRight className="h-3 w-3 text-zinc-700 shrink-0" />

              {/* Dropdown */}
              <select
                value={mapping[field.key] ?? ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className={`
                  flex-1 rounded-md border bg-zinc-900 px-3 py-1.5 text-xs outline-none
                  transition-colors cursor-pointer
                  ${isMatched
                    ? 'border-emerald-500/30 text-zinc-200'
                    : 'border-zinc-700 text-zinc-500'
                  }
                  hover:border-zinc-600 focus:border-blue-500/50
                `}
              >
                <option value="">
                  {field.required ? '— Select column —' : '— None (default ₹0) —'}
                </option>
                {detectedHeaders.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {/* Warning if required fields missing */}
      {!requiredFieldsMapped && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" strokeWidth={1.5} />
          <p className="text-[11px] text-zinc-400">
            Map all required fields (<span className="text-red-400">*</span>) to continue.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-zinc-800 px-5 py-3 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-zinc-800 bg-zinc-900/50 px-4 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!requiredFieldsMapped}
          className={`
            rounded-md px-4 py-1.5 text-xs font-medium transition-all
            ${requiredFieldsMapped
              ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25'
              : 'bg-zinc-800 border border-zinc-700 text-zinc-600 cursor-not-allowed'
            }
          `}
        >
          Confirm & Process
        </button>
      </div>
    </div>
  );
}
