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

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const platform = Capacitor.getPlatform(); // 'ios' ou 'android'
        document.documentElement.classList.add('capacitor-native');
        document.documentElement.classList.add(`platform-${platform}`);

        // ANDROID : Le manifest est en `adjustResize`. La webview se redimensionne nativement.
        // Pas besoin de JS pour gérer le clavier. Le CSS s'adapte à la nouvelle hauteur.
        if (platform === 'android') {
          return;
        }

        // iOS : Le clavier passe par-dessus (KeyboardResize.None).
        // On doit réduire la hauteur du container manuellement via CSS + var.
        const { Keyboard } = await import('@capacitor/keyboard');
        
        const setKeyboardHeight = (h: number) => {
          document.documentElement.style.setProperty('--keyboard-height', `${h}px`);
        };

        await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeight(info.keyboardHeight || 0);
        });
        
        await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        });

      } catch {
        // Capacitor non dispo ou erreur plugin
      }
    })();
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
