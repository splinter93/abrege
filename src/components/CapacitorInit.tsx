'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

const STYLE_ID = 'capacitor-layout-fix';

/**
 * Injecte les styles de layout Capacitor directement dans le DOM.
 * useLayoutEffect = synchrone avant le premier paint — garanti avant tout rendu.
 * window.Capacitor est injecté par Android avant tout JS → pas d'import async nécessaire.
 */
function useCapacitorLayoutFix() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (!w.Capacitor?.isNativePlatform?.()) return;

    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    // Styles injectés directement — gagne sur toute règle CSS (dernière dans <head>)
    // Pas de media query, pas de classe conditionnelle, pas de display-mode.
    style.textContent = `
      .chatgpt-container {
        padding-top: 0 !important;
      }
      .chatgpt-header {
        position: fixed !important;
        top: env(safe-area-inset-top, 0px) !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        z-index: 1000 !important;
        background: #000000 !important;
        box-sizing: border-box !important;
      }
      .chatgpt-content {
        padding-top: calc(56px + env(safe-area-inset-top, 0px)) !important;
      }
      body::before {
        content: '' !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: env(safe-area-inset-top, 24px) !important;
        min-height: env(safe-area-inset-top, 24px) !important;
        background: #000000 !important;
        z-index: 99999 !important;
        pointer-events: none !important;
        display: block !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);
}

export default function CapacitorInit() {
  useCapacitorDeepLink();
  useCapacitorLayoutFix();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        document.documentElement.classList.add('capacitor-native');

        try {
          const { Keyboard } = await import('@capacitor/keyboard');
          await Keyboard.hide();
        } catch {
          // Plugin non disponible — pas bloquant
        }
      } catch {
        // Capacitor non disponible (browser) — normal
      }
    })();

    return () => {
      document.documentElement.classList.remove('capacitor-native');
    };
  }, []);

  return null;
}
