'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import AppEntryGate from '@/components/splash/AppEntryGate';

const IntroAnimation = dynamic(() => import('./IntroAnimation'), { ssr: false });

const INTRO_SEEN_KEY = 'intro-seen';
const AUTH_PATHS = ['/login', '/auth/callback'];

export default function IntroWrapper({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPath = pathname && AUTH_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    try {
      const hasSeenIntro = localStorage.getItem(INTRO_SEEN_KEY) === 'true';

      if (isAuthPath && !hasSeenIntro) {
        router.replace('/app');
        setShowIntro(true);
        return;
      }

      if (isAuthPath) {
        setShowIntro(false);
        return;
      }

      setShowIntro(!hasSeenIntro);
    } catch {
      setShowIntro(true);
    }
  }, [isClient, isAuthPath, router]);

  const handleIntroComplete = () => {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, 'true');
      sessionStorage.setItem('introShown', 'true');
    } catch {
      // ignore
    }
    setShowIntro(false);
  };

  if (!isClient || showIntro === null) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          background:
            'linear-gradient(135deg, #FFF9C4 0%, #FFEB3B 25%, #FFFFFF 50%, #B2EBF2 75%, #26A69A 100%)',
        }}
        aria-hidden="true"
      />
    );
  }

  if (showIntro) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  if (isAuthPath) {
    return <>{children}</>;
  }

  return <AppEntryGate>{children}</AppEntryGate>;
}
