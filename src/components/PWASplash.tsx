'use client';

import { useEffect, useState } from 'react';
import { Feather } from 'lucide-react';

const SPLASH_DONE_KEY = 'scrivia_splash_done';
const FADE_DURATION = 350; // ms

/**
 * Détecte Capacitor de façon synchrone : le bridge injecte window.Capacitor
 * avant le chargement de la page, donc disponible dès le premier render.
 */
function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as { Capacitor?: unknown }).Capacitor !== 'undefined';
}

/**
 * PWA / Capacitor — splash au chargement.
 *
 * - Capacitor natif : s'affiche dès le premier render (show initialisé à true),
 *   couvre "Chargement..." et le flash de scrollbar. Toujours affiché (pas de
 *   sessionStorage). Durée 1500ms pour couvrir auth + redirect + render.
 * - PWA / web mobile : comportement inchangé (sessionStorage, 800ms, first-time).
 */
export default function PWASplash() {
  const [show, setShow] = useState(() => isCapacitorNative());
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const capacitor = isCapacitorNative();

    if (capacitor) {
      // Toujours afficher sur Capacitor, durée plus longue pour couvrir
      // auth + redirect + render initial.
      const hide = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => setShow(false), FADE_DURATION);
      }, 1500);
      return () => clearTimeout(hide);
    }

    // Web / PWA standalone : comportement first-time uniquement
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
