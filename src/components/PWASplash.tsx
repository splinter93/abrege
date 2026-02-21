'use client';

import { useEffect, useState } from 'react';

const SPLASH_DONE_KEY = 'scrivia_splash_done';

/**
 * PWA Splash Screen - Client-only pour éviter hydration error.
 * Affiche le logo 800ms au premier chargement sur mobile/PWA.
 * Ne se réaffiche pas au retour dans l'app (sessionStorage) pour éviter
 * le flash de splash à chaque resume quand la page n'a pas rechargé.
 */
export default function PWASplash() {
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isSmallScreen = window.innerWidth < 768;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsMobile(isSmallScreen || isStandalone);
    };
    checkMobile();

    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SPLASH_DONE_KEY)) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(SPLASH_DONE_KEY, '1');
      } catch {
        // ignore
      }
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (!visible || !isMobile) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
        pointerEvents: visible ? 'auto' : 'none'
      }}
    >
      <img
        src="/logo-scrivia-white.png"
        alt="Scrivia"
        style={{
          width: '200px',
          height: '200px',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}

