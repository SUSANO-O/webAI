'use client';

import { OmniWalletProvider } from '@/components/omni/OmniWalletProvider';

export function OmniProvider({ children }: { children: React.ReactNode }) {
  return <OmniWalletProvider>{children}</OmniWalletProvider>;
}
