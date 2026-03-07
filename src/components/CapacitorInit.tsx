'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

/**
 * CapacitorInit — Bootstrap natif Android/iOS.
 *
 * Responsabilités :
 *  1. Ajoute `html.capacitor-native` + `platform-ios`/`platform-android`.
 *  2. Gère le clavier spécifiquement par plateforme :
 *     - Android : RIEN (laisser `adjustResize` natif faire le travail).
 *     - iOS : Détecte `keyboardWillShow` → injecte `--keyboard-height` pour
 *       compenser le clavier qui passe par-dessus la webview (KeyboardResize.None).
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

        // ANDROID : Le manifest est en `adjustResize`. La webview se redimensionne nativement.
        // Mais Android peut encore "panner" le document quand le textarea prend le focus.
        // On force donc le scroll racine à rester à 0 pour garder le header réellement fixe.
        if (platform === 'android') {
          const { Keyboard } = await import('@capacitor/keyboard');

          const resetRootScroll = () => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
          };

          resetRootScroll();

          const willShowHandle = await Keyboard.addListener('keyboardWillShow', resetRootScroll);
          const didShowHandle = await Keyboard.addListener('keyboardDidShow', resetRootScroll);
          const willHideHandle = await Keyboard.addListener('keyboardWillHide', resetRootScroll);
          const didHideHandle = await Keyboard.addListener('keyboardDidHide', resetRootScroll);

          const handleWindowResize = () => {
            resetRootScroll();
          };

          window.addEventListener('resize', handleWindowResize);
          window.visualViewport?.addEventListener('resize', handleWindowResize);

          cleanup = () => {
            willShowHandle.remove();
            didShowHandle.remove();
            willHideHandle.remove();
            didHideHandle.remove();
            window.removeEventListener('resize', handleWindowResize);
            window.visualViewport?.removeEventListener('resize', handleWindowResize);
          };
          return;
        }

        // iOS : Le clavier passe par-dessus (KeyboardResize.None).
        // On doit réduire la hauteur du container manuellement via CSS + var.
        const { Keyboard } = await import('@capacitor/keyboard');
        
        const setKeyboardHeight = (h: number) => {
          document.documentElement.style.setProperty('--keyboard-height', `${h}px`);
        };

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
