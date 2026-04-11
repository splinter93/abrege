'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

/**
 * CapacitorInit — Bootstrap natif Android/iOS.
 *
 * Responsabilités :
 *  1. Ajoute `html.capacitor-native` + `platform-ios`/`platform-android`.
 *  2. Gère le clavier spécifiquement par plateforme :
 *     - Android (adjustNothing) : visualViewport.resize → injecte `--keyboard-height`
 *       frame par frame pendant l'animation du clavier. L'input suit le clavier
 *       pixel par pixel, sans transition CSS. Fallback sur keyboardDidShow/keyboardDidHide
 *       si visualViewport n'est pas disponible.
 *     - iOS (KeyboardResize.None) : keyboardWillShow/keyboardWillHide → injecte
 *       `--keyboard-height` pour réduire la hauteur du container via `bottom`.
 */
function useCapacitorLayoutFix() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup = () => {};

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const platform = Capacitor.getPlatform(); // 'ios' ou 'android'
        document.documentElement.classList.add('capacitor-native');
        document.documentElement.classList.add(`platform-${platform}`);

        const setKeyboardHeight = (h: number) => {
          document.documentElement.style.setProperty('--keyboard-height', `${h}px`);
        };

        if (platform === 'android') {
          // visualViewport se met à jour frame par frame pendant l'animation du clavier
          // (même avec adjustNothing). Pas besoin de transition CSS : l'input bouge
          // pixel par pixel en sync parfait avec le clavier.
          const vv = window.visualViewport;
          if (vv) {
            const onResize = () => {
              const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
              setKeyboardHeight(kbHeight);
            };
            vv.addEventListener('resize', onResize);
            cleanup = () => vv.removeEventListener('resize', onResize);
          } else {
            // Fallback : visualViewport non disponible → Capacitor keyboard events
            const { Keyboard } = await import('@capacitor/keyboard');
            const didShowHandle = await Keyboard.addListener('keyboardDidShow', (info) => {
              setKeyboardHeight(info.keyboardHeight || 0);
            });
            const didHideHandle = await Keyboard.addListener('keyboardDidHide', () => {
              setKeyboardHeight(0);
            });
            cleanup = () => {
              didShowHandle.remove();
              didHideHandle.remove();
            };
          }
          return;
        }

        // iOS : Le clavier passe par-dessus (KeyboardResize.None).
        // On réduit la hauteur du container via bottom + var(--keyboard-height).
        const { Keyboard } = await import('@capacitor/keyboard');
        const willShowHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeight(info.keyboardHeight || 0);
        });
        const willHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        });
        cleanup = () => {
          willShowHandle.remove();
          willHideHandle.remove();
        };

      } catch {
        // Capacitor non dispo ou erreur plugin
      }
    })();

    return () => {
      cleanup();
    };
  }, []);
}

export default function CapacitorInit() {
  useCapacitorDeepLink();
  useCapacitorLayoutFix();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Nettoyage au unmount (rare car composant racine)
    return () => {
      document.documentElement.classList.remove('capacitor-native');
      document.documentElement.classList.remove('platform-ios');
      document.documentElement.classList.remove('platform-android');
    };
  }, []);

  return null;
}
