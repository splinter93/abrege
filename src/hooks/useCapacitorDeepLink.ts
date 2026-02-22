'use client';

import { useEffect } from 'react';
import { supabase } from '@/supabaseClient';

/** Type minimal pour le plugin App (addListener/getLaunchUrl). Évite conflit avec l'export value du package. */
interface AppPluginRef {
  addListener(event: 'appUrlOpen', cb: (e: { url: string }) => Promise<void>): Promise<{ remove: () => Promise<void> }>;
  getLaunchUrl(): Promise<{ url?: string } | undefined>;
}

/**
 * Gère le retour OAuth sur Capacitor Android.
 *
 * Architecture :
 *  A. onAuthStateChange — dès que Supabase crée une session (SIGNED_IN),
 *     on navigue vers /chat. C'est le déclencheur principal.
 *
 *  B. appUrlOpen — reçoit scrivia://callback?code=xxx, appelle exchangeCodeForSession.
 *     onAuthStateChange prend le relais pour la navigation.
 *
 * Timing critique (URL distante) :
 *  - @capacitor/core est bundlé dans le JS → window.Capacitor existe dès le chargement
 *  - native-bridge.js est injecté par Android via evaluateJavascript après onPageFinished
 *    (asynchrone, ~1-3s après le chargement) → ajoute triggerEvent + active les plugins
 *  - Appeler App.addListener avant native-bridge.js → "not implemented on android"
 *
 *  Solution : attendre que window.Capacitor.triggerEvent existe (signal bridge prêt)
 *  avant d'enregistrer le listener (jusqu'à 10s d'attente).
 */
export function useCapacitorDeepLink() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let removeAppListener: (() => void) | undefined;
    let unsubscribeAuth: (() => void) | undefined;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        let pendingRedirectToChat = false;

        // A. Rediriger vers /chat seulement si on vient de traiter un callback OAuth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN' && pendingRedirectToChat) {
            pendingRedirectToChat = false;
            window.location.assign('/chat');
          }
        });
        unsubscribeAuth = () => subscription.unsubscribe();

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

        // B. Attendre que native-bridge.js soit injecté par Android.
        //    Signal : window.Capacitor.triggerEvent devient une vraie fonction.
        //    Durée max : 20 × 500ms = 10s.
        const POLL_INTERVAL = 500;
        const MAX_POLLS = 20;
        let bridgeReady = false;
        for (let i = 0; i < MAX_POLLS; i++) {
          const cap = window.Capacitor as { triggerEvent?: unknown };
          if (typeof cap.triggerEvent === 'function') {
            bridgeReady = true;
            break;
          }
          console.log(`[DeepLink] Bridge pas encore prêt, attente... (${i + 1}/${MAX_POLLS})`);
          await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        }

        if (!bridgeReady) {
          console.error('[DeepLink] Bridge non disponible après 10s, abandon.');
          return;
        }

        console.log('[DeepLink] Bridge prêt, enregistrement du listener appUrlOpen.');

        const appMod = await import('@capacitor/app');
        const App = appMod.App as AppPluginRef;

        const handle = await App.addListener('appUrlOpen', async ({ url }) => {
          await processCallbackUrl(url);
        });

        console.log('[DeepLink] Listener appUrlOpen enregistré.');

        // Fallback au lancement (intent disponible via getLaunchUrl)
        try {
          const launch = await App.getLaunchUrl();
          if (launch?.url?.startsWith('scrivia://callback')) {
            await processCallbackUrl(launch.url);
          }
        } catch { /* ignore */ }

        removeAppListener = () => {
          handle.remove();
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
