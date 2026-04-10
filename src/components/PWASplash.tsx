'use client';

import { useEffect, useState } from 'react';
import { Feather } from 'lucide-react';

const SPLASH_DONE_KEY = 'scrivia_splash_done';
const FADE_DURATION = 350; // ms

/**
 * PWA / Capacitor — splash au premier chargement (mobile ou standalone).
 * Icône plume seule, même trait que la home (dégradé stroke), sans texte ni encadré.
 */
export default function PWASplash() {
  const [show, setShow] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const isSmallScreen = window.innerWidth < 768;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isSmallScreen && !isStandalone) return;

    if (sessionStorage.getItem(SPLASH_DONE_KEY)) return;

    setShow(true);

    const hide = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => setShow(false), FADE_DURATION);
      try { sessionStorage.setItem(SPLASH_DONE_KEY, '1'); } catch { /* noop */ }
    }, 800);

    return () => clearTimeout(hide);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        opacity,
        transition: `opacity ${FADE_DURATION}ms ease`,
        pointerEvents: opacity === 1 ? 'auto' : 'none',
      }}
    >
      <svg width={0} height={0} aria-hidden className="absolute">
        <defs>
          <linearGradient id="pwa-splash-feather-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" />
            <stop offset="1" stopColor="rgba(255,255,255,0.5)" />
          </linearGradient>
        </defs>
      </svg>
      <Feather
        className="h-[96px] w-[96px] shrink-0"
        stroke="url(#pwa-splash-feather-gradient)"
        strokeWidth={1.75}
        aria-hidden
      />
    </div>
  );
}
