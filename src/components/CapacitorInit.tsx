'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

/**
 * CapacitorInit — Bootstrap natif Android/iOS.
 *
 * Responsabilités :
 *  1. Ajoute `html.capacitor-native` + `platform-ios`/`platform-android`.
 *  2. Gère le clavier spécifiquement par plateforme :
 *     - Android (adjustNothing) : keyboardWillShow/keyboardWillHide → injecte `--keyboard-height`
 *       pour décaler `.chatgpt-chat-bottom` via transition CSS fluide (250ms ease-out decel).
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

        // iOS & Android partagent la même logique d'événements : on lance l'animation
        // fluide dès le WillShow. Sur Android, le plugin donne parfois des valeurs
        // erratiques (trop hautes) au WillShow. On utilise donc un cache mis à jour
        // par DidShow pour garantir une hauteur stable d'une fois sur l'autre.
        let cachedKeyboardHeight = 0;
        const { Keyboard } = await import('@capacitor/keyboard');

        const willShowHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
          let raw = info.keyboardHeight || 0;
          const maxInset = Math.floor(window.innerHeight * 0.6);
          raw = Math.min(raw, maxInset);

          const heightToUse = (platform === 'android' && cachedKeyboardHeight > 0) ? cachedKeyboardHeight : raw;
          setKeyboardHeight(heightToUse);
        });

        const didShowHandle = await Keyboard.addListener('keyboardDidShow', (info) => {
          let raw = info.keyboardHeight || 0;
          const maxInset = Math.floor(window.innerHeight * 0.6);
          raw = Math.min(raw, maxInset);

          if (raw > 0) {
            cachedKeyboardHeight = raw;
          }
          setKeyboardHeight(raw); // Corrige avec la valeur finale parfaite
        });

        const willHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardHeight(0);
        });
        
        cleanup = () => {
          willShowHandle.remove();
          didShowHandle.remove();
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
