'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

const A360_SRC = 'https://advertising360.vercel.app/embed-vitrine.js';
const NAV_ATTR = 'data-a360-owner';

declare global {
  interface Window {
    Advertising360Vitrine?: { mountAll: () => void };
  }
}

function ensureScript() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`script[src="${A360_SRC}"]`)) {
    window.Advertising360Vitrine?.mountAll();
    return;
  }
  const s = document.createElement('script');
  s.src = A360_SRC;
  s.async = true;
  s.onload = () => window.Advertising360Vitrine?.mountAll();
  document.body.appendChild(s);
}

/** Quita todos los rails nav (evita duplicados en body). */
function clearAllNavSlots() {
  document.querySelectorAll('[data-a360-slot="nav"]').forEach((n) => n.remove());
}

function mountSlotElement(
  el: HTMLElement,
  slot: string,
  marca: string,
  solucion: string,
  placement?: 'splash' | 'hub'
) {
  el.setAttribute('data-a360-slot', slot);
  el.setAttribute('data-marca', marca);
  el.setAttribute('data-solucion', solucion);
  if (slot === 'nav' && placement) {
    el.setAttribute('data-placement', placement);
  } else {
    el.removeAttribute('data-placement');
  }
  el.removeAttribute('data-a360-mounted');
}

type ScriptProps = {
  onGoLanding?: () => void;
};

export function Advertising360Script({ onGoLanding }: ScriptProps) {
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'a360-promo-landing') return;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onGoLanding?.();
    };
    window.addEventListener('message', onMessage);
    ensureScript();
    return () => window.removeEventListener('message', onMessage);
  }, [onGoLanding]);

  return (
    <Script
      src={A360_SRC}
      strategy="afterInteractive"
      onLoad={() => window.Advertising360Vitrine?.mountAll()}
    />
  );
}

/**
 * Monta slots A360 de forma imperativa.
 * `nav` es singleton en document.body: siempre limpia huérfanos antes de crear uno.
 */
export function A360Slot({
  slot,
  marca,
  solucion,
  placement,
  className,
}: {
  slot: 'premium' | 'featured' | 'sectors' | 'nav';
  marca: string;
  solucion: string;
  placement?: 'splash' | 'hub';
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ownerId = useRef(`a360-${slot}-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    ensureScript();

    if (slot === 'nav') {
      clearAllNavSlots();
      const el = document.createElement('div');
      el.setAttribute(NAV_ATTR, ownerId.current);
      mountSlotElement(el, slot, marca, solucion, placement);
      document.body.appendChild(el);
      const t = window.setTimeout(() => window.Advertising360Vitrine?.mountAll(), 40);
      return () => {
        window.clearTimeout(t);
        // Solo quitar el que creamos nosotros (y cualquier huérfano extra)
        document
          .querySelectorAll(`[data-a360-slot="nav"][${NAV_ATTR}="${ownerId.current}"]`)
          .forEach((n) => n.remove());
        // Si quedó otro nav sin dueño o duplicado, limpiar extras dejando 0
        const leftovers = document.querySelectorAll('[data-a360-slot="nav"]');
        if (leftovers.length > 0) {
          // Al desmontar este slot no debe quedar ninguno de esta app en transición;
          // el siguiente mount recreará el singleton.
          leftovers.forEach((n) => n.remove());
        }
      };
    }

    const host = hostRef.current;
    if (!host) return;

    const el = document.createElement('div');
    mountSlotElement(el, slot, marca, solucion, placement);
    host.replaceChildren(el);
    const t = window.setTimeout(() => window.Advertising360Vitrine?.mountAll(), 40);

    return () => {
      window.clearTimeout(t);
      el.remove();
      if (host.isConnected) host.replaceChildren();
    };
  }, [slot, marca, solucion, placement]);

  if (slot === 'nav') return null;

  return <div ref={hostRef} className={className} />;
}
