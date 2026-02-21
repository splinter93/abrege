'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import { simpleLogger } from '@/utils/logger';

/**
 * Écoute les deep links entrants sur Capacitor natif.
 *
 * Flux OAuth Google :
 *  1. Chrome Custom Tab ouvre l'URL Google OAuth
 *  2. Google → Supabase → redirige vers scrivia://callback?code=xxx (PKCE)
 *     ou scrivia://callback#access_token=xxx (implicit fallback)
 *  3. Android intercepte scrivia://callback via l'intent filter (AndroidManifest)
 *  4. Ce hook reçoit l'URL, échange le code ou set la session
 *  5. Ferme le Custom Tab, redirige vers /chat
 */
export function useCapacitorDeepLink() {
  const router = useRouter();

  useEffect(() => {
    let removeListener: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import('@capacitor/app');
        const { Browser } = await import('@capacitor/browser');

        const handle = await App.addListener('appUrlOpen', async ({ url }) => {
          simpleLogger.dev(`[CapacitorDeepLink] URL reçue: ${url}`);

          // Filtrer les URLs qui ne concernent pas notre callback OAuth
          if (!url.startsWith('scrivia://callback')) return;

          try {
            await Browser.close();
          } catch {
            // Browser déjà fermé
          }

          // ─── PKCE : code dans les query params ───────────────────────────
          // scrivia://callback?code=xxx
          const qIndex = url.indexOf('?');
          const hIndex = url.indexOf('#');

          if (qIndex !== -1) {
            const queryStr = url.slice(qIndex + 1, hIndex !== -1 ? hIndex : undefined);
            const params = new URLSearchParams(queryStr);
            const code = params.get('code');

            if (code) {
              simpleLogger.dev('[CapacitorDeepLink] PKCE code reçu, exchange en cours…');
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) {
                simpleLogger.dev(`[CapacitorDeepLink] Erreur exchangeCodeForSession: ${error.message}`);
                return;
              }
              simpleLogger.dev('[CapacitorDeepLink] Session créée via PKCE ✓');
              router.replace('/chat');
              return;
            }
          }

          // ─── Implicit fallback : tokens dans le hash ──────────────────────
          // scrivia://callback#access_token=xxx&refresh_token=yyy
          if (hIndex !== -1) {
            const hashStr = url.slice(hIndex + 1);
            const params = new URLSearchParams(hashStr);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              simpleLogger.dev('[CapacitorDeepLink] Implicit token reçu, set session…');
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) {
                simpleLogger.dev(`[CapacitorDeepLink] Erreur setSession: ${error.message}`);
                return;
              }
              simpleLogger.dev('[CapacitorDeepLink] Session créée via implicit ✓');
              router.replace('/chat');
              return;
            }
          }

          // Paramètre error envoyé par Supabase (ex: scrivia://callback?error=access_denied)
          const qErrIndex = url.indexOf('?');
          if (qErrIndex !== -1) {
            const params = new URLSearchParams(url.slice(qErrIndex + 1));
            const err = params.get('error');
            if (err) {
              simpleLogger.dev(`[CapacitorDeepLink] Erreur OAuth: ${err}`);
            }
          }
        });

        removeListener = () => handle.remove();
      } catch {
        // Capacitor non disponible (SSR ou web)
      }
    })();

    return () => removeListener?.();
  }, [router]);
}
