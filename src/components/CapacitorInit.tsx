'use client';

import { useEffect } from 'react';
import { useCapacitorDeepLink } from '@/hooks/useCapacitorDeepLink';

/**
 * Composant client global pour initialiser les listeners Capacitor.
 * Monté une seule fois dans le layout racine.
 * - useCapacitorDeepLink : intercepte les deep links OAuth (scrivia://callback)
 * - Ajoute html.capacitor-native quand Capacitor.isNativePlatform() === true
 *   (utilisé par pwa-mobile.css pour les règles CSS Capacitor-spécifiques)
 * - Masque le clavier au démarrage (Android ouvre le clavier sur le premier input visible)
 */
export default function CapacitorInit() {
  useCapacitorDeepLink();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cleanupOrientation: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        // Classe CSS fiable pour tous les styles Capacitor (indépendant des media queries)
        document.documentElement.classList.add('capacitor-native');

        // Masquer le clavier au démarrage : Android focus le premier input visible
        try {
          const { Keyboard } = await import('@capacitor/keyboard');
          await Keyboard.hide();
        } catch {
          // Plugin non disponible ou clavier déjà masqué — pas bloquant
        }

        // Mobile <= 480px: verrou portrait. > 480px: rotation autorisée.
        const media = window.matchMedia('(max-width: 480px)');
        const applyOrientationPolicy = async () => {
          const orientation = window.screen?.orientation;
          if (!orientation) return;
          try {
            if (media.matches) {
              await orientation.lock('portrait');
            } else {
              orientation.unlock();
            }
          } catch {
            // lock/unlock peut échouer selon device/OS, on ignore sans casser l'app
          }
        };

        await applyOrientationPolicy();
        const onMediaChange = () => {
          void applyOrientationPolicy();
        };

        if (typeof media.addEventListener === 'function') {
          media.addEventListener('change', onMediaChange);
          cleanupOrientation = () => {
            media.removeEventListener('change', onMediaChange);
            try {
              window.screen?.orientation?.unlock();
            } catch {}
          };
        } else {
          media.addListener(onMediaChange);
          cleanupOrientation = () => {
            media.removeListener(onMediaChange);
            try {
              window.screen?.orientation?.unlock();
            } catch {}
          };
        }
      } catch {
        // Capacitor non disponible (browser) — normal
      }
    })();

    return () => {
      cleanupOrientation?.();
      document.documentElement.classList.remove('capacitor-native');
    };
  }, []);

  return null;
}
