import { useState, useCallback, useRef } from 'react';
import { ClipboardPaste, Table2, X, Check } from 'lucide-react';

interface PasteZoneProps {
  onDataPasted: (text: string) => void;
  isProcessing: boolean;
  rowCount: number | null;
}

export function PasteZone({ onDataPasted, isProcessing, rowCount }: PasteZoneProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (text.trim()) {
        setHasContent(true);
        if (textareaRef.current) {
          textareaRef.current.value = text;
        }
        onDataPasted(text);
      }
    },
    [onDataPasted]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setHasContent(!!text.trim());
    },
    []
  );

  const handleSubmitTyped = useCallback(() => {
    if (textareaRef.current && textareaRef.current.value.trim()) {
      onDataPasted(textareaRef.current.value);
    }
  }, [onDataPasted]);

  const clearPaste = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
    setHasContent(false);
  }, []);

  return (
    <div className="w-full">
      <div
        className={`
          relative rounded-lg border-2 border-dashed transition-all duration-300
          ${isFocused
            ? 'border-blue-500/40 bg-blue-500/5'
            : 'border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
              Paste from Excel
            </span>
          </div>
          <div className="flex items-center gap-2">
            {rowCount !== null && (
              <span className="text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                <Check className="h-3 w-3" />
                {rowCount} rows detected
              </span>
            )}
            {hasContent && (
              <button
                onClick={clearPaste}
                className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-400 transition-colors"
                aria-label="Clear pasted data"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          onPaste={handlePaste}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Select rows in Excel → Copy (Ctrl+C) → Click here → Paste (Ctrl+V)&#10;&#10;Include the header row with column names like Buy_Date, Sell_Date, Purchase_Value, Sale_Value"
          spellCheck={false}
          className={`
            w-full min-h-[120px] resize-y bg-transparent px-4 py-3 text-xs text-zinc-300
            placeholder:text-zinc-600 font-mono leading-relaxed
            outline-none
          `}
          id="paste-zone-input"
        />

        {/* Process button for manually typed/edited data */}
        {hasContent && rowCount === null && (
          <div className="border-t border-zinc-800/50 px-4 py-2 flex justify-end">
            <button
              onClick={handleSubmitTyped}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 text-[11px] font-medium text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              <Table2 className="h-3 w-3" />
              Process Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
