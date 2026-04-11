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

        // ANDROID 15+ FIX: L'API VirtualKeyboard permet au navigateur de gérer le layout
        // frame par frame pendant l'animation du clavier, ce qui est infiniment plus fluide
        // que les événements JS (keyboardWillShow/DidShow) ou les transitions CSS.
        let hasVirtualKeyboard = false;
        if (platform === 'android' && 'virtualKeyboard' in navigator) {
          try {
            // @ts-ignore - L'API n'est pas toujours typée dans TypeScript
            navigator.virtualKeyboard.overlaysContent = true;
            hasVirtualKeyboard = true;
            document.documentElement.classList.add('virtual-keyboard-supported');
            
            // On écoute geometrychange pour mettre à jour --keyboard-height en temps réel
            // @ts-ignore
            navigator.virtualKeyboard.addEventListener('geometrychange', (e) => {
              const { width, height } = e.target.boundingRect;
              document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
            });
          } catch (e) {
            console.error('VirtualKeyboard API error', e);
          }
        }

        const setKeyboardHeight = (h: number) => {
          // Si VirtualKeyboard gère déjà le clavier, on ignore les événements JS
          if (hasVirtualKeyboard) return;
          document.documentElement.style.setProperty('--keyboard-height', `${h}px`);
        };

        // iOS & Android (fallback) partagent la logique d'événements JS classique : 
        // on lance l'animation CSS dès le WillShow avec la hauteur brute.
        const { Keyboard } = await import('@capacitor/keyboard');

        const willShowHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeight(info.keyboardHeight || 0);
        });

        // DidShow corrige au pixel près si la prédiction du clavier a changé pendant l'animation
        const didShowHandle = await Keyboard.addListener('keyboardDidShow', (info) => {
          setKeyboardHeight(info.keyboardHeight || 0);
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
