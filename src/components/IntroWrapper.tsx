'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import AppEntryGate from '@/components/splash/AppEntryGate';

const IntroAnimation = dynamic(() => import('./IntroAnimation'), { ssr: false });

const AUTH_PATHS = ['/login', '/auth/callback'];

export default function IntroWrapper({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isAuthPath = pathname && AUTH_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    setMounted(true);
    if (isAuthPath) return;
    const alreadySeen = sessionStorage.getItem('introShown');
    if (!alreadySeen) {
      setShowIntro(true);
    }
  }, [isAuthPath]);

  if (!mounted) return <>{children}</>;

  if (isAuthPath) {
    return <>{children}</>;
  }

  if (showIntro) {
    return <IntroAnimation onComplete={() => setShowIntro(false)} />;
  }

  return <AppEntryGate>{children}</AppEntryGate>;
}
