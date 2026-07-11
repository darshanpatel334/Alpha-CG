import { TrendingDown } from 'lucide-react';
import { formatINR } from '@/lib/taxEngine';

interface LossCarryForwardCardProps {
  remainingIntradayLoss: number;
  remainingSTCGLoss: number;
  remainingLTCGLoss: number;
}

export function LossCarryForwardCard({
  remainingIntradayLoss,
  remainingSTCGLoss,
  remainingLTCGLoss,
}: LossCarryForwardCardProps) {
  const totalLoss = remainingIntradayLoss + remainingSTCGLoss + remainingLTCGLoss;
  const hasLoss = totalLoss > 0;

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border p-6 transition-colors
        ${hasLoss
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-emerald-500/20 bg-emerald-500/5'
        }
      `}
    >
      {/* Subtle gradient accent */}
      <div
        className={`absolute inset-0 opacity-[0.03] ${
          hasLoss
            ? 'bg-gradient-to-br from-red-500 to-transparent'
            : 'bg-gradient-to-br from-emerald-500 to-transparent'
        }`}
      />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown
            className={`h-4 w-4 ${hasLoss ? 'text-red-400' : 'text-emerald-400'}`}
            strokeWidth={1.5}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Losses to Carry Forward
          </span>
        </div>

        {hasLoss ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-500">Intraday Loss</span>
              <span className="text-lg font-semibold text-red-400 tabular-nums">
                {formatINR(remainingIntradayLoss)}
              </span>
            </div>
            <div className="h-px bg-zinc-800" />
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-500">STCG Loss</span>
              <span className="text-lg font-semibold text-red-400 tabular-nums">
                {formatINR(remainingSTCGLoss)}
              </span>
            </div>
            <div className="h-px bg-zinc-800" />
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-500">LTCG Loss</span>
              <span className="text-lg font-semibold text-red-400 tabular-nums">
                {formatINR(remainingLTCGLoss)}
              </span>
            </div>
            <div className="h-px bg-zinc-800" />
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-zinc-400">Total</span>
              <span className="text-2xl font-bold text-red-400 tabular-nums">
                {formatINR(totalLoss)}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">₹0.00</p>
            <p className="mt-1 text-xs text-zinc-500">All losses fully absorbed</p>
          </div>
        )}
      </div>
    </div>
  );
}
