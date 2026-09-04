const OMNI_TOKEN_KEY = 'omni_token';
const OMNI_API =
  process.env.NEXT_PUBLIC_OMNI_API_URL || 'http://127.0.0.1:4010';

export type OmniWallet = {
  fiatBalance: number;
  tokensByVertical: Record<string, number>;
  tokensGlobal: number;
  txCount: number;
  chess: {
    level: string;
    icon: string;
    multiplier: number;
    progress: number;
    nextLevel: string | null;
    nextMinTx: number | null;
  };
  logs?: Array<{ id: string; time: string; message: string; type: string }>;
};

export type WebAiTaskId =
  | 'wai-generate'
  | 'wai-save'
  | 'wai-download'
  | 'wai-refine'
  | 'wai-publish'
  | 'wai-kyc';

export type OmniEarnResult = {
  ok: boolean;
  result?: {
    minted: number;
    symbol: string;
    multiplier: number;
    leveledUp: boolean;
    newLevel: string;
    toastMessage?: string;
  };
  wallet?: OmniWallet;
  error?: string;
};

function getOmniToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(OMNI_TOKEN_KEY);
}

function setOmniToken(token: string) {
  localStorage.setItem(OMNI_TOKEN_KEY, token);
}

export function clearOmniToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OMNI_TOKEN_KEY);
}

async function omniFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getOmniToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${OMNI_API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Omni HTTP ${res.status}`) as Error & {
      status?: number;
      payload?: unknown;
    };
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/** Asegura sesión Omni-Wallet vía bridge server-side de WEB 360 */
export async function ensureOmniSession(email: string, name?: string) {
  const res = await fetch('/api/omni/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(data.error || 'No se pudo conectar Omni-Wallet');
  }
  setOmniToken(data.token);
  return data as { token: string; wallet: OmniWallet; user: { email: string; name: string } };
}

export async function fetchOmniWallet(): Promise<OmniWallet> {
  return omniFetch('/api/wallet');
}

export async function earnWebReward(taskId: WebAiTaskId): Promise<OmniEarnResult> {
  return omniFetch('/api/earn', {
    method: 'POST',
    body: JSON.stringify({ verticalId: 'webai', taskId }),
  });
}
