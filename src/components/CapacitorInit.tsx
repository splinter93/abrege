'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

const STYLE_ID = 'capacitor-layout-fix';

/**
 * Injecte les styles de layout Capacitor directement dans le DOM.
 * useLayoutEffect = synchrone avant le premier paint.
 * window.Capacitor est injecté par Android avant tout JS → synchrone, pas d'import async.
 *
 * Stratégie clavier (adjustNothing) :
 * - Le viewport ne change jamais quand le clavier s'ouvre → header fixe ne bouge pas.
 * - window.visualViewport détecte la hauteur du clavier sans dépendance au bridge.
 * - --keyboard-height compensate the layout to push content above the keyboard.
 */
function useCapacitorLayoutFix() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (!w.Capacitor?.isNativePlatform?.()) return;

    // Injecter les styles de base (header fixe, status bar, padding)
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        /* Reset padding-top container : évite le double safe-area */
        .chatgpt-container {
          padding-top: 0 !important;
        }
        /* Header fixe : ne bouge jamais, collé sous la status bar */
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
        /* Décale le contenu sous le header fixe */
        .chatgpt-content {
          padding-top: calc(56px + env(safe-area-inset-top, 0px)) !important;
        }
        /* Status bar : overlay noir opaque, toujours visible */
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
        /* Compensation clavier (adjustNothing) : VisualViewport resize met à jour
           --keyboard-height via JS, le container se réduit d'autant en bas */
        .chatgpt-container {
          padding-bottom: var(--keyboard-height, 0px) !important;
        }
      `;
      document.head.appendChild(style);
    }

    // VisualViewport API : détecte la hauteur du clavier sans le bridge Capacitor.
    // adjustNothing = viewport constant, visualViewport.height réduit quand clavier ouvert.
    const vv = window.visualViewport;
    let cleanup = () => {};

    if (vv) {
      const onViewportChange = () => {
        const keyboardHeight = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop ?? 0));
        document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      };

      vv.addEventListener('resize', onViewportChange);
      vv.addEventListener('scroll', onViewportChange);
      onViewportChange();

      cleanup = () => {
        vv.removeEventListener('resize', onViewportChange);
        vv.removeEventListener('scroll', onViewportChange);
        document.documentElement.style.removeProperty('--keyboard-height');
      };
    }

    return () => {
      cleanup();
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
