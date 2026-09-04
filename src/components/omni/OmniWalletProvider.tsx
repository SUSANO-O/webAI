'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  clearOmniToken,
  earnWebReward,
  ensureOmniSession,
  fetchOmniWallet,
  type OmniWallet,
  type WebAiTaskId,
} from '@/lib/omniWallet';

type OmniContextValue = {
  wallet: OmniWallet | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<OmniWallet | null>;
  mint: (taskId: WebAiTaskId) => Promise<{
    ok: boolean;
    result?: {
      minted: number;
      symbol: string;
      multiplier: number;
      leveledUp: boolean;
      newLevel: string;
      toastMessage?: string;
    };
    error?: string;
  }>;
  waiTokens: number;
  glbTokens: number;
  chess: OmniWallet['chess'] | null;
};

const OmniContext = createContext<OmniContextValue | undefined>(undefined);

export function OmniWalletProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user?.email);
  const [wallet, setWallet] = useState<OmniWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.email) {
      setWallet(null);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      await ensureOmniSession(user.email, user.name || user.email);
      const w = await fetchOmniWallet();
      setWallet(w);
      return w;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error Omni-Wallet');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.email, user?.name]);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      clearOmniToken();
      setWallet(null);
      return;
    }
    void refresh();
  }, [isAuthenticated, user?.email, refresh]);

  const mint = useCallback(
    async (taskId: WebAiTaskId) => {
      if (!isAuthenticated || !user?.email) {
        return { ok: false, error: 'Inicia sesión para ganar tokens' };
      }
      try {
        await ensureOmniSession(user.email, user.name || user.email);
        const res = await earnWebReward(taskId);
        if (res.wallet) setWallet(res.wallet);
        return res;
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error al mintear' };
      }
    },
    [isAuthenticated, user?.email, user?.name]
  );

  const value = useMemo(
    () => ({
      wallet,
      loading,
      error,
      refresh,
      mint,
      waiTokens: wallet?.tokensByVertical?.webai ?? 0,
      glbTokens: wallet?.tokensGlobal ?? 0,
      chess: wallet?.chess ?? null,
    }),
    [wallet, loading, error, refresh, mint]
  );

  return <OmniContext.Provider value={value}>{children}</OmniContext.Provider>;
}

export function useOmniWallet() {
  const ctx = useContext(OmniContext);
  if (!ctx) {
    throw new Error('useOmniWallet debe usarse dentro de OmniWalletProvider');
  }
  return ctx;
}
