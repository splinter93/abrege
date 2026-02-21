'use client';

import { useEffect } from 'react';
import { supabase } from '@/supabaseClient';

/**
 * Gère le retour OAuth sur Capacitor Android.
 *
 * Architecture :
 *  A. onAuthStateChange — dès que Supabase crée une session (SIGNED_IN),
 *     on navigue vers /chat. C'est le déclencheur principal, indépendant
 *     du timing du deep link.
 *
 *  B. appUrlOpen — reçoit scrivia://callback?code=xxx, extrait le code,
 *     appelle exchangeCodeForSession. onAuthStateChange prend le relais.
 *
 * Pas de getLaunchUrl() : trop risqué (URL périmée d'un lancement précédent).
 * Pas de processedUrlRef : on laisse Supabase gérer la déduplication.
 * console.error au lieu de simpleLogger.dev : visible en production (logcat).
 */
export function useCapacitorDeepLink() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let removeAppListener: (() => void) | undefined;

    // A. Écoute les changements de session — navigation fiable vers /chat
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        window.location.assign('/chat');
      }
    });

    // B. Écoute les deep links entrants
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import('@capacitor/app');

        const handle = await App.addListener('appUrlOpen', async ({ url }) => {
          console.log('[DeepLink] appUrlOpen reçu:', url.slice(0, 100));

          if (!url.startsWith('scrivia://callback')) return;

          // Fermer le tab Chrome si ouvert via @capacitor/browser
          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch { /* ignore */ }

          // Parser l'URL (scrivia://callback?code=xxx ou #access_token=xxx)
          const normalized = url.replace('scrivia://callback', 'https://scrivia.local/callback');
          let urlObj: URL;
          try {
            urlObj = new URL(normalized);
          } catch (e) {
            console.error('[DeepLink] URL invalide:', url, e);
            return;
          }

          const errorParam = urlObj.searchParams.get('error');
          const code = urlObj.searchParams.get('code');
          const hash = urlObj.hash ? new URLSearchParams(urlObj.hash.slice(1)) : null;
          const accessToken = hash?.get('access_token');
          const refreshToken = hash?.get('refresh_token');

          // Erreur renvoyée par Supabase / Google
          if (errorParam) {
            console.error('[DeepLink] Erreur OAuth:', errorParam);
            window.location.assign(`/auth?error=${encodeURIComponent(errorParam)}`);
            return;
          }

          // PKCE : échange du code contre une session
          if (code) {
            console.log('[DeepLink] Code PKCE reçu, exchange…');
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[DeepLink] exchangeCodeForSession échoué:', error.message);
              window.location.assign('/auth?error=session_expired');
            }
            // onAuthStateChange (SIGNED_IN) prend le relais pour naviguer vers /chat
            return;
          }

          // Implicit flow : tokens dans le hash
          if (accessToken && refreshToken) {
            console.log('[DeepLink] Tokens implicit, setSession…');
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              console.error('[DeepLink] setSession échoué:', error.message);
              window.location.assign('/auth?error=session_error');
            }
            // onAuthStateChange (SIGNED_IN) prend le relais
            return;
          }

          console.warn('[DeepLink] URL de callback sans code ni tokens:', url.slice(0, 100));
        });

        removeAppListener = () => handle.remove();
      } catch (e) {
        console.error('[DeepLink] Erreur init listener:', e);
      }
    })();

    return () => {
      subscription.unsubscribe();
      removeAppListener?.();
    };
  }, []);
}
