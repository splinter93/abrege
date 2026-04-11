'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

interface VirtualKeyboardApi extends EventTarget {
  overlaysContent: boolean;
  boundingRect: DOMRectReadOnly;
}

function getVirtualKeyboardApi(): VirtualKeyboardApi | null {
  const navigatorWithVirtualKeyboard = navigator as Navigator & {
    virtualKeyboard?: VirtualKeyboardApi;
  };

  return navigatorWithVirtualKeyboard.virtualKeyboard ?? null;
}

/**
 * CapacitorInit — Bootstrap natif Android/iOS.
 *
 * Responsabilités :
 *  1. Ajoute `html.capacitor-native` + `platform-ios`/`platform-android`.
 *  2. Gère le clavier spécifiquement par plateforme :
 *     - Android (adjustNothing) : `@capacitor/keyboard` reste le fallback garanti.
 *       Si `VirtualKeyboard.geometrychange` est réellement émis par le WebView, on s'y branche
 *       pour coller l'input au clavier frame par frame.
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
        const root = document.documentElement;
        root.classList.add('capacitor-native');
        root.classList.add(`platform-${platform}`);

        let geometrySourceActive = false;
        let removeVirtualKeyboardListener = () => {};

        const setKeyboardHeight = (height: number) => {
          root.style.setProperty('--keyboard-height', `${Math.max(0, Math.round(height))}px`);
        };

        const virtualKeyboard = platform === 'android' ? getVirtualKeyboardApi() : null;
        if (virtualKeyboard) {
          try {
            virtualKeyboard.overlaysContent = true;

            const handleGeometryChange = () => {
              const height = virtualKeyboard.boundingRect.height;
              geometrySourceActive = height > 0;
              root.classList.toggle('virtual-keyboard-supported', geometrySourceActive);
              setKeyboardHeight(height);
            };

            virtualKeyboard.addEventListener('geometrychange', handleGeometryChange);
            removeVirtualKeyboardListener = () => {
              virtualKeyboard.removeEventListener('geometrychange', handleGeometryChange);
            };
          } catch {
            root.classList.remove('virtual-keyboard-supported');
          }
        }

        const setKeyboardHeightFromPlugin = (height: number) => {
          if (geometrySourceActive) return;
          setKeyboardHeight(height);
        };

        // iOS & Android utilisent toujours le plugin Capacitor.
        // Sur Android 16+, VirtualKeyboard peut affiner le mouvement uniquement s'il émet réellement.
        const { Keyboard } = await import('@capacitor/keyboard');

        const willShowHandle = await Keyboard.addListener('keyboardWillShow', (info) => {
          setKeyboardHeightFromPlugin(info.keyboardHeight || 0);
        });

        const didShowHandle = await Keyboard.addListener('keyboardDidShow', (info) => {
          setKeyboardHeightFromPlugin(info.keyboardHeight || 0);
        });

        const willHideHandle = await Keyboard.addListener('keyboardWillHide', () => {
          if (!geometrySourceActive) {
            setKeyboardHeight(0);
          }
        });

        const didHideHandle = await Keyboard.addListener('keyboardDidHide', () => {
          geometrySourceActive = false;
          root.classList.remove('virtual-keyboard-supported');
          setKeyboardHeight(0);
        });

        cleanup = () => {
          removeVirtualKeyboardListener();
          willShowHandle.remove();
          didShowHandle.remove();
          willHideHandle.remove();
          didHideHandle.remove();
          root.classList.remove('virtual-keyboard-supported');
          setKeyboardHeight(0);
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
