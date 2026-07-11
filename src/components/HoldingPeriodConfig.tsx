import { Settings2 } from 'lucide-react';
import { DEFAULT_HOLDING_THRESHOLD } from '@/lib/taxEngine';

interface HoldingPeriodConfigProps {
  threshold: number;
  onChange: (value: number) => void;
}

const PRESETS = [
  { label: 'Listed Equity / Equity MF', days: 365, description: '> 12 months' },
  { label: 'Unlisted Shares', days: 730, description: '> 24 months' },
  { label: 'Debt MF / Gold / Property', days: 1095, description: '> 36 months' },
] as const;

export function HoldingPeriodConfig({ threshold, onChange }: HoldingPeriodConfigProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings2 className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          LTCG Holding Threshold
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            onClick={() => onChange(preset.days)}
            className={`
              rounded-md border px-3 py-2 text-left transition-all duration-200
              ${threshold === preset.days
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                : 'border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
              }
            `}
          >
            <p className="text-xs font-medium">{preset.label}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{preset.description}</p>
          </button>
        ))}

        {/* Custom input */}
        <div
          className={`
            flex items-center gap-2 rounded-md border px-3 py-2 transition-all duration-200
            ${!PRESETS.some(p => p.days === threshold)
              ? 'border-blue-500/40 bg-blue-500/10'
              : 'border-zinc-800 bg-zinc-900/30'
            }
          `}
        >
          <label className="text-xs text-zinc-500 whitespace-nowrap" htmlFor="custom-threshold">
            Custom:
          </label>
          <input
            id="custom-threshold"
            type="number"
            min={1}
            max={9999}
            value={!PRESETS.some(p => p.days === threshold) ? threshold : ''}
            placeholder={String(DEFAULT_HOLDING_THRESHOLD)}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (v > 0 && v <= 9999) onChange(v);
            }}
            className="w-16 bg-transparent text-xs text-zinc-300 outline-none border-b border-zinc-700 focus:border-blue-500 transition-colors tabular-nums text-center"
          />
          <span className="text-[10px] text-zinc-600">days</span>
        </div>
      </div>
    </div>
  );
}
