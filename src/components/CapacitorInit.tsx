'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

/**
 * CapacitorInit — Bootstrap natif Android/iOS.
 *
 * Responsabilités :
 *  1. Ajoute `html.capacitor-native` (déclencheur CSS dans pwa-mobile.css).
 *  2. Détecte la hauteur du clavier via visualViewport → injecte `--keyboard-height`.
 *     Le CSS `pwa-mobile.css` utilise cette variable pour shrink `.chatgpt-container`
 *     depuis le bas, poussant l'input + les messages au-dessus du clavier.
 *
 * Stratégie clavier : adjustNothing (Android) / KeyboardResize.None (iOS).
 * - Le viewport NE change jamais quand le clavier s'ouvre.
 * - `visualViewport.height` détecte la hauteur du clavier sans le bridge Capacitor.
 * - `--keyboard-height` pousse le contenu via CSS pur (pas de JS layout).
 *
 * Toutes les règles CSS (header fixed, content padding-top, status bar overlay)
 * sont dans pwa-mobile.css sous `html.capacitor-native`. Pas de <style> injecté ici.
 */
function useCapacitorLayoutFix() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (!w.Capacitor?.isNativePlatform?.()) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const onViewportChange = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop ?? 0));
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    };

    vv.addEventListener('resize', onViewportChange);
    vv.addEventListener('scroll', onViewportChange);
    onViewportChange();

    return () => {
      vv.removeEventListener('resize', onViewportChange);
      vv.removeEventListener('scroll', onViewportChange);
      document.documentElement.style.removeProperty('--keyboard-height');
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
