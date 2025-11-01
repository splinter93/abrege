'use client';

import { useEffect, useState } from 'react';

/**
 * PWA Splash Screen - Client-only pour éviter hydration error
 * Affiche logo-scrivia-white.png pendant 800ms au chargement
 * UNIQUEMENT sur mobile/PWA (pas sur desktop)
 */
export default function PWASplash() {
  const [visible, setVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Détecter si mobile (< 768px) ou PWA standalone
    const checkMobile = () => {
      const isSmallScreen = window.innerWidth < 768;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsMobile(isSmallScreen || isStandalone);
    };
    
    checkMobile();

    // Fade out après 800ms
    const timer = setTimeout(() => {
      setVisible(false);
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

