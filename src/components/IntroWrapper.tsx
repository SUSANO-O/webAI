'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Carga dinámica: evita SSR de THREE.js
const IntroAnimation = dynamic(() => import('./IntroAnimation'), { ssr: false });

export default function IntroWrapper({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // sessionStorage se borra al cerrar el tab/browser → intro aparece en cada login
    const alreadySeen = sessionStorage.getItem('introShown');
    if (!alreadySeen) {
      setShowIntro(true);
    }
  }, []);

  if (!mounted) return <>{children}</>;

  if (showIntro) {
    return <IntroAnimation onComplete={() => setShowIntro(false)} />;
  }

  return <>{children}</>;
}
