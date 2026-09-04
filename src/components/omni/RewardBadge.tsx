'use client';

import { formatRewardLabel, type WebAiTaskId } from '@/lib/omniRewards';

type Props = {
  taskId: WebAiTaskId;
  multiplier?: number;
  variant?: 'solid' | 'soft';
  className?: string;
};

/** Badge visible de puntos que ganas al hacer la acción. */
export function RewardBadge({
  taskId,
  multiplier = 1,
  variant = 'solid',
  className = '',
}: Props) {
  const label = formatRewardLabel(taskId, multiplier);
  const multiHint = multiplier > 1 ? ` (×${multiplier})` : '';

  const base =
    variant === 'solid'
      ? 'bg-amber-300/95 text-amber-950 border-amber-200'
      : 'bg-amber-100 text-amber-900 border-amber-400/70';

  return (
    <span
      title={multiHint ? `Incluye multiplicador Protocolo Ajedrez${multiHint}` : 'Puntos Omni-Wallet'}
      className={`inline-flex items-center gap-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide shadow-sm ${base} ${className}`}
    >
      {label}
    </span>
  );
}
