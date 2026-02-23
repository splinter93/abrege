'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

/**
 * CapacitorInit — Bootstrap natif Android/iOS.
 *
 * Responsabilités :
 *  1. Ajoute `html.capacitor-native` (déclencheur CSS dans pwa-mobile.css).
 *  2. Détecte l'ouverture/fermeture du clavier → injecte `--keyboard-height`.
 *     Le CSS `pwa-mobile.css` utilise cette variable + une transition CSS pour
 *     animer le container vers le haut en sync avec le clavier natif.
 *
 * Stratégie clavier : adjustNothing (Android) / KeyboardResize.None (iOS).
 * - Le viewport NE change jamais quand le clavier s'ouvre.
 * - Sur natif : @capacitor/keyboard `keyboardWillShow` fire au DÉBUT de l'animation
 *   avec la hauteur finale → transition CSS de 280ms synchronisée avec le clavier.
 * - Sur web/PWA : visualViewport fallback (frame-by-frame, pas de transition CSS).
 *
 * Toutes les règles CSS sont dans pwa-mobile.css sous `html.capacitor-native`.
 */
function useCapacitorLayoutFix() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
    if (!w.Capacitor?.isNativePlatform?.()) return;

    const setKeyboardHeight = (h: number) => {
      document.documentElement.style.setProperty('--keyboard-height', `${h}px`);
    };

    let cleanupFn = () => {};

    (async () => {
      // Tentative : plugin @capacitor/keyboard — fire au START de l'animation native.
      // keyboardWillShow donne la hauteur finale → CSS transition prend le relais.
      try {
        const { Keyboard } = await import('@capacitor/keyboard');
        const showHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeight(info.keyboardHeight ?? 0);
        });
        const hideHandle = await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        });
        cleanupFn = () => {
          showHandle.remove();
          hideHandle.remove();
          setKeyboardHeight(0);
        };
        return; // Plugin OK — pas besoin du fallback visualViewport
      } catch {
        // Plugin non disponible (plugin non installé ou bridge absent)
      }

      // Fallback : visualViewport — frame-by-frame, la CSS transition n'est PAS utilisée
      // (le container suit le clavier en temps réel sans délai supplémentaire).
      const vv = window.visualViewport;
      if (!vv) return;

      const onViewportChange = () => {
        const h = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop ?? 0));
        setKeyboardHeight(h);
      };

      vv.addEventListener('resize', onViewportChange);
      vv.addEventListener('scroll', onViewportChange);
      onViewportChange();

      cleanupFn = () => {
        vv.removeEventListener('resize', onViewportChange);
        vv.removeEventListener('scroll', onViewportChange);
        setKeyboardHeight(0);
      };
    })();

    return () => cleanupFn();
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
