'use client';

import { useCallback, useState } from 'react';
import InformativeSplash from './InformativeSplash';
import { A360Slot, Advertising360Script } from '@/components/a360/Advertising360Script';

const MARCA = 'startapp360';
const SOLUCION = 'web360';

export default function AppEntryGate({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false);

  const goLanding = useCallback(() => {
    setEntered(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <>
      <Advertising360Script onGoLanding={goLanding} />
      <A360Slot
        slot="nav"
        marca={MARCA}
        solucion={SOLUCION}
        placement={entered ? 'hub' : 'splash'}
      />

      {!entered ? (
        <InformativeSplash onEnter={() => setEntered(true)} />
      ) : (
        <>
          <div className="mx-auto w-full max-w-7xl px-3 pt-2 sm:px-4">
            <A360Slot slot="premium" marca={MARCA} solucion={SOLUCION} />
          </div>
          {children}
          <div className="mx-auto w-full max-w-7xl space-y-4 px-3 py-6 sm:px-4">
            <A360Slot slot="featured" marca={MARCA} solucion={SOLUCION} />
            <A360Slot slot="sectors" marca={MARCA} solucion={SOLUCION} />
          </div>
        </>
      )}
    </>
  );
}
