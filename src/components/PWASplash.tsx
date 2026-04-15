'use client';

import { useEffect, useState } from 'react';
import FeatherSplashMark from '@/components/FeatherSplashMark';

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
 * - Capacitor natif & PWA : s'affiche dès le HTML serveur (show: true par défaut)
 *   pour couvrir "Chargement..." et le flash de scrollbar dès la frame 1.
 * - Desktop : se cache immédiatement au montage si ce n'est pas un mobile/PWA.
 */
export default function PWASplash() {
  // ✅ FIX : Toujours true au départ (SSR) pour masquer "Chargement..." 
  // dès la première frame HTML. Se cachera côté client si non nécessaire.
  const [show, setShow] = useState(true);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const capacitor = isCapacitorNative();

    if (capacitor) {
      // Masquer le splash screen natif Capacitor dès que l'app React est montée
      // Cela révèle instantanément ce splash web (identique visuellement),
      // qui va pouvoir gérer son propre fondu en douceur (fade-out).
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        SplashScreen.hide().catch(() => {});
      }).catch(() => {});

      // Capacitor : on garde le splash le temps que le bridge native/web 
      // et l'authentification s'initialisent.
      const hide = setTimeout(() => {
        setOpacity(0);
        setTimeout(() => setShow(false), FADE_DURATION);
      }, 1500);
      return () => clearTimeout(hide);
    }

    // PWA web / Browser mobile
    const isSmallScreen = window.innerWidth < 768;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Si desktop normal, on cache immédiatement (0 délai)
    if (!isSmallScreen && !isStandalone) {
      setShow(false);
      return;
    }

    // PWA web : comportement first-time (sessionStorage)
    if (sessionStorage.getItem(SPLASH_DONE_KEY)) {
      setShow(false);
      return;
    }

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
      <FeatherSplashMark fullBleed={false} />
    </div>
  );
}
