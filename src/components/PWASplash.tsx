'use client';

import { useEffect, useState } from 'react';
import { FiFeather } from 'react-icons/fi';

const SPLASH_DONE_KEY = 'scrivia_splash_done';
const FADE_DURATION = 350; // ms

/**
 * PWA Splash Screen - Client-only pour éviter hydration error.
 * Affiche la plume + "Scrivia" 800ms au premier chargement sur mobile/PWA.
 * Fade-out réel avant démontage (l'ancien `return null` coupait l'animation).
 */
export default function PWASplash() {
  // `show` = monté dans le DOM ; `opacity` = valeur CSS
  const [show, setShow] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const isSmallScreen = window.innerWidth < 768;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (!isSmallScreen && !isStandalone) return;

    if (sessionStorage.getItem(SPLASH_DONE_KEY)) return;

    setShow(true);

    const hide = setTimeout(() => {
      // Lance le fade-out CSS
      setOpacity(0);
      // Démonte après la fin de l'animation
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        zIndex: 99999,
        opacity,
        transition: `opacity ${FADE_DURATION}ms ease`,
        pointerEvents: opacity === 1 ? 'auto' : 'none',
      }}
    >
      {/* Plume avec dégradé identique au logo header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 72,
          height: 72,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="splash-feather-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e2e2" />
              <stop offset="100%" stopColor="#8a8a8a" />
            </linearGradient>
          </defs>
        </svg>
        <FiFeather
          size={36}
          style={{ stroke: 'url(#splash-feather-grad)' }}
        />
      </div>

      {/* Nom de l'app */}
      <span
        style={{
          fontFamily: "'Manrope', -apple-system, sans-serif",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          background: 'linear-gradient(135deg, #e2e2e2 0%, #8a8a8a 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Scrivia
      </span>
    </div>
  );
}

