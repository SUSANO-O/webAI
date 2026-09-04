'use client';

import Link from 'next/link';
import { useOmniWallet } from '@/components/omni/OmniWalletProvider';

type Props = {
  compact?: boolean;
};

export function WalletChip({ compact = false }: Props) {
  const { wallet, loading, waiTokens, chess, error } = useOmniWallet();

  if (loading && !wallet) {
    return (
      <div className="text-xs text-white/80 px-3 py-2 rounded-lg border border-white/30 bg-white/15">
        Wallet…
      </div>
    );
  }

  if (error && !wallet) {
    return (
      <div
        className="text-xs text-red-100 px-3 py-2 rounded-lg border border-red-300/50 bg-red-500/20 max-w-[160px] truncate"
        title={error}
      >
        Omni offline
      </div>
    );
  }

  if (!wallet) return null;

  return (
    <Link
      href={process.env.NEXT_PUBLIC_OMNI_WEB_URL || 'http://localhost:5175'}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 text-amber-950 px-3 py-2 rounded-lg border border-amber-200/70 bg-white/95 hover:bg-white transition-colors shadow-sm"
      title="Abrir Omni-Wallet"
    >
      <span className="text-lg leading-none" aria-hidden>
        {chess?.icon || '♟️'}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold">
          {Math.floor(waiTokens)} WAI
          {!compact && chess ? ` · ${chess.level}` : ''}
        </span>
        {!compact && (
          <span className="text-[10px] text-amber-800/80">
            {chess?.multiplier && chess.multiplier > 1
              ? `Multi ×${chess.multiplier}`
              : 'Protocolo Ajedrez'}
          </span>
        )}
      </div>
    </Link>
  );
}
