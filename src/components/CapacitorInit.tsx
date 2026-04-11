'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';
import { attachNativeKeyboardController } from '@/utils/nativeKeyboardController';

type SafeAreaSide = 'top' | 'bottom';

function readSafeAreaInsetPx(side: SafeAreaSide): string {
  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.pointerEvents = 'none';
  probe.style.opacity = '0';
  probe.style.inset = '0';

  if (side === 'top') {
    probe.style.paddingTop = 'env(safe-area-inset-top, 0px)';
  } else {
    probe.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
  }

  document.body.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  const value = side === 'top' ? computed.paddingTop : computed.paddingBottom;
  document.body.removeChild(probe);

  return value || '0px';
}

function syncFixedSafeAreaInsets(root: HTMLElement): void {
  root.style.setProperty('--capacitor-safe-top-fixed', readSafeAreaInsetPx('top'));
  root.style.setProperty('--capacitor-safe-bottom-fixed', readSafeAreaInsetPx('bottom'));
}

/**
 * CapacitorInit — Bootstrap natif Android/iOS.
 *
 * Responsabilités :
 *  1. Ajoute `html.capacitor-native` + `platform-ios`/`platform-android`.
 *  2. Gère le clavier spécifiquement par plateforme :
 *     - Android (adjustNothing) : contrôleur anti-race-condition. Le plugin Capacitor reste
 *       le fallback garanti ; `VirtualKeyboard` n'affine le mouvement que s'il émet réellement.
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

        const setKeyboardHeight = (height: number) => {
          root.style.setProperty('--keyboard-height', `${Math.max(0, Math.round(height))}px`);
        };

        syncFixedSafeAreaInsets(root);

        const handleWindowResize = () => {
          const keyboardHeight = parseFloat(root.style.getPropertyValue('--keyboard-height') || '0');
          if (keyboardHeight > 0) {
            return;
          }

          syncFixedSafeAreaInsets(root);
        };

        window.addEventListener('resize', handleWindowResize);

        const removeKeyboardController = await attachNativeKeyboardController({
          platform,
          onHeightChange: setKeyboardHeight,
          onVirtualKeyboardActiveChange: (active) => {
            root.classList.toggle('virtual-keyboard-supported', active);
            if (!active) {
              syncFixedSafeAreaInsets(root);
            }
          }
        });

        cleanup = () => {
          window.removeEventListener('resize', handleWindowResize);
          removeKeyboardController();
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
