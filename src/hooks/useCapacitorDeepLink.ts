'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/supabaseClient';
import { simpleLogger } from '@/utils/logger';

/**
 * Écoute les deep links entrants sur Capacitor natif.
 *
 * Flux OAuth Google :
 *  1. Chrome ouvre l'URL Google OAuth (OpenInBrowser / Browser)
 *  2. Google → Supabase → redirige vers scrivia://callback?code=xxx (PKCE)
 *     ou scrivia://callback#access_token=xxx (implicit)
 *  3. Android intercepte scrivia://callback (intent filter)
 *  4. URL reçue via appUrlOpen (retour en arrière-plan) ou getLaunchUrl() (cold start)
 *  5. Échange du code / setSession → navigation vers /chat
 *
 * On utilise window.location.assign('/chat') pour forcer un rechargement et que
 * la session Supabase soit bien lue par l'app (router.replace peut laisser le cache).
 */
export function useCapacitorDeepLink() {
  const processedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    async function processCallbackUrl(url: string): Promise<boolean> {
      if (!url.startsWith('scrivia://callback')) return false;
      // Éviter de traiter deux fois la même URL (appUrlOpen + getLaunchUrl)
      if (processedUrlRef.current === url) return false;
      processedUrlRef.current = url;

      simpleLogger.dev(`[CapacitorDeepLink] Traitement: ${url.slice(0, 80)}…`);

      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.close();
      } catch {
        // Browser déjà fermé ou non dispo
      }

      const qIndex = url.indexOf('?');
      const hIndex = url.indexOf('#');

      // ─── PKCE : code dans les query params ───────────────────────────
      if (qIndex !== -1) {
        const queryStr = url.slice(qIndex + 1, hIndex !== -1 ? hIndex : undefined);
        const params = new URLSearchParams(queryStr);
        const code = params.get('code');
        const errorParam = params.get('error');

        if (errorParam) {
          simpleLogger.dev(`[CapacitorDeepLink] Erreur OAuth: ${errorParam}`);
          window.location.assign(`/auth?error=${encodeURIComponent(errorParam)}`);
          return true;
        }

        if (code) {
          simpleLogger.dev('[CapacitorDeepLink] PKCE code reçu, exchange…');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            simpleLogger.dev(`[CapacitorDeepLink] exchangeCodeForSession: ${error.message}`);
            // code_verifier perdu si app tuée → demander de réessayer
            window.location.assign(`/auth?error=session_expired`);
            return true;
          }
          simpleLogger.dev('[CapacitorDeepLink] Session créée ✓');
          window.location.assign('/chat');
          return true;
        }
      }

      // ─── Implicit : tokens dans le hash ───────────────────────────────
      if (hIndex !== -1) {
        const hashStr = url.slice(hIndex + 1);
        const params = new URLSearchParams(hashStr);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          simpleLogger.dev('[CapacitorDeepLink] Tokens implicit, setSession…');
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            simpleLogger.dev(`[CapacitorDeepLink] setSession: ${error.message}`);
            window.location.assign(`/auth?error=session_error`);
            return true;
          }
          simpleLogger.dev('[CapacitorDeepLink] Session créée ✓');
          window.location.assign('/chat');
          return true;
        }
      }

      return true;
    }

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import('@capacitor/app');

        // Cold start : l'app a été ouverte via scrivia://callback (getLaunchUrl)
        const launch = await App.getLaunchUrl();
        if (launch?.url) {
          simpleLogger.dev(`[CapacitorDeepLink] getLaunchUrl: ${launch.url.slice(0, 60)}…`);
          const handled = await processCallbackUrl(launch.url);
          if (handled) return;
        }

        // Retour d'arrière-plan : appUrlOpen
        const handle = await App.addListener('appUrlOpen', async ({ url }) => {
          simpleLogger.dev(`[CapacitorDeepLink] appUrlOpen: ${url.slice(0, 60)}…`);
          await processCallbackUrl(url);
        });

        removeListener = () => handle.remove();
      } catch {
        // Capacitor non disponible (SSR ou web)
      }
    })();

    return () => removeListener?.();
  }, []);
}
