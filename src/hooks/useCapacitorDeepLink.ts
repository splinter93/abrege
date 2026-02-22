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
    let unsubscribeAuth: (() => void) | undefined;

    // A + B : uniquement sur plateforme Capacitor native (Android/iOS)
    // Redirection vers /chat uniquement après OAuth callback (pas à chaque SIGNED_IN),
    // sinon un clic sur "Agents" ou autre lien déclencherait une redirection vers /chat.
    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        // Attendre que le bridge natif soit prêt (évite "App plugin is not implemented"
        // quand la WebView charge une URL distante et que le JS s'exécute avant le bridge).
        await Capacitor.ready();

        let pendingRedirectToChat = false;

        // A. Rediriger vers /chat seulement si on vient de traiter un callback OAuth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN' && pendingRedirectToChat) {
            pendingRedirectToChat = false;
            window.location.assign('/chat');
          }
        });
        unsubscribeAuth = () => subscription.unsubscribe();

        const { App } = await import('@capacitor/app');

        const processedUrls = new Set<string>();
        const processCallbackUrl = async (url: string) => {
          if (!url.startsWith('scrivia://callback')) return;
          if (processedUrls.has(url)) return;
          processedUrls.add(url);
          console.log('[DeepLink] Traitement URL:', url.slice(0, 100));

          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch { /* ignore */ }

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

          if (errorParam) {
            console.error('[DeepLink] Erreur OAuth:', errorParam);
            window.location.assign(`/auth?error=${encodeURIComponent(errorParam)}`);
            return;
          }

          if (code) {
            console.log('[DeepLink] Code PKCE reçu, exchange…');
            pendingRedirectToChat = true;
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              pendingRedirectToChat = false;
              console.error('[DeepLink] exchangeCodeForSession échoué:', error.message);
              window.location.assign('/auth?error=session_expired');
            }
            return;
          }

          if (accessToken && refreshToken) {
            console.log('[DeepLink] Tokens implicit, setSession…');
            pendingRedirectToChat = true;
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              pendingRedirectToChat = false;
              console.error('[DeepLink] setSession échoué:', error.message);
              window.location.assign('/auth?error=session_error');
            }
            return;
          }

          console.warn('[DeepLink] URL sans code ni tokens:', url.slice(0, 100));
        };

        const handle = await App.addListener('appUrlOpen', async ({ url }) => {
          await processCallbackUrl(url);
        });

        // Fallback : au lancement, l’intent peut être disponible via getLaunchUrl()
        // (appUrlOpen ne se déclenche pas toujours au retour du navigateur)
        const tryLaunchUrl = async (): Promise<boolean> => {
          try {
            const launch = await App.getLaunchUrl();
            if (launch?.url?.startsWith('scrivia://callback')) {
              await processCallbackUrl(launch.url);
              return true;
            }
          } catch { /* ignore */ }
          return false;
        };
        await tryLaunchUrl();

        const onVisibility = () => {
          if (document.visibilityState !== 'visible') return;
          tryLaunchUrl();
        };
        document.addEventListener('visibilitychange', onVisibility);

        removeAppListener = () => {
          handle.remove();
          document.removeEventListener('visibilitychange', onVisibility);
        };
      } catch (e) {
        console.error('[DeepLink] Erreur init listener:', e);
      }
    })();

    return () => {
      unsubscribeAuth?.();
      removeAppListener?.();
    };
  }, []);
}
