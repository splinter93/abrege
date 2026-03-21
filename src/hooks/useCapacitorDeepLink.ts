'use client';

import { useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { simpleLogger } from '@/utils/logger';

/**
 * Gère le retour OAuth sur Capacitor Android.
 *
 * Architecture (remote URL) :
 *  - Le bridge Capacitor (WebMessagePort) n'est pas fiable pour les URLs distantes :
 *    native-bridge.js peut ne pas s'exécuter, rendant addListener inopérant.
 *
 *  Mécanisme principal : window.__scriviaDeepLink / window.__scriviaDeepLinkPending
 *    → MainActivity.java injecte l'URL via evaluateJavascript dans onNewIntent.
 *    → Si le handler JS est prêt : appelé directement.
 *    → Sinon : stocké dans __scriviaDeepLinkPending, consommé ici au montage.
 *
 *  Mécanisme secondaire (fallback) :
 *    → Tente App.addListener via le bridge Capacitor (fonctionne si le bridge est prêt).
 *    → Tente getLaunchUrl() au montage et au retour en premier plan.
 *
 *  Redirection vers /chat :
 *    → onAuthStateChange (SIGNED_IN) après un callback OAuth traité.
 *    → Pas de redirection systématique pour ne pas perturber la navigation normale.
 */

interface AppPluginRef {
  addListener(event: 'appUrlOpen', cb: (e: { url: string }) => Promise<void>): Promise<{ remove: () => Promise<void> }>;
  getLaunchUrl(): Promise<{ url?: string } | undefined>;
}

declare global {
  interface Window {
    __scriviaDeepLink?: (url: string) => void;
    __scriviaDeepLinkPending?: string;
  }
}

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
          simpleLogger.dev('[DeepLink] Traitement URL:', url.slice(0, 100));

          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch { /* ignore */ }

          const normalized = url.replace('scrivia://callback', 'https://scrivia.local/callback');
          let urlObj: URL;
          try {
            urlObj = new URL(normalized);
          } catch (e) {
            simpleLogger.error('[DeepLink] URL invalide', e);
            return;
          }

          const errorParam = urlObj.searchParams.get('error');
          const code = urlObj.searchParams.get('code');
          const hash = urlObj.hash ? new URLSearchParams(urlObj.hash.slice(1)) : null;
          const accessToken = hash?.get('access_token');
          const refreshToken = hash?.get('refresh_token');

          if (errorParam) {
            simpleLogger.error('[DeepLink] Erreur OAuth', new Error(String(errorParam)));
            window.location.assign(`/auth?error=${encodeURIComponent(errorParam)}`);
            return;
          }

          if (code) {
            simpleLogger.dev('[DeepLink] Code PKCE reçu, exchange…');
            pendingRedirectToChat = true;
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              pendingRedirectToChat = false;
              simpleLogger.error('[DeepLink] exchangeCodeForSession échoué', error);
              window.location.assign('/auth?error=session_expired');
            }
            return;
          }

          if (accessToken && refreshToken) {
            simpleLogger.dev('[DeepLink] Tokens implicit, setSession…');
            pendingRedirectToChat = true;
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              pendingRedirectToChat = false;
              simpleLogger.error('[DeepLink] setSession échoué', error);
              window.location.assign('/auth?error=session_error');
            }
            return;
          }

          simpleLogger.warn('[DeepLink] URL sans code ni tokens:', url.slice(0, 100));
        };

        // ── Mécanisme principal : handler global injecté depuis MainActivity.java ──
        // Consommer une URL en attente (arrivée avant le montage du hook)
        if (window.__scriviaDeepLinkPending) {
          const pending = window.__scriviaDeepLinkPending;
          delete window.__scriviaDeepLinkPending;
          simpleLogger.dev('[DeepLink] URL pending trouvée:', pending.slice(0, 80));
          await processCallbackUrl(pending);
        }

        // Exposer le handler pour les deep links futurs
        window.__scriviaDeepLink = (url: string) => {
          simpleLogger.dev('[DeepLink] Handler global appelé:', url.slice(0, 80));
          processCallbackUrl(url);
        };

        // ── Mécanisme secondaire : bridge Capacitor (best-effort) ──
        try {
          const appMod = await import('@capacitor/app');
          const App = appMod.App as AppPluginRef;

          // Tenter getLaunchUrl immédiatement
          try {
            const launch = await App.getLaunchUrl();
            if (launch?.url?.startsWith('scrivia://callback')) {
              simpleLogger.dev('[DeepLink] getLaunchUrl() trouvé:', launch.url.slice(0, 80));
              await processCallbackUrl(launch.url);
            }
          } catch { /* ignore, bridge peut ne pas être prêt */ }

          // Tenter addListener
          const handle = await App.addListener('appUrlOpen', async ({ url }) => {
            await processCallbackUrl(url);
          });
          simpleLogger.dev('[DeepLink] addListener Capacitor enregistré.');

          const onVisibility = async () => {
            if (document.visibilityState !== 'visible') return;
            try {
              const launch = await App.getLaunchUrl();
              if (launch?.url?.startsWith('scrivia://callback')) {
                await processCallbackUrl(launch.url);
              }
            } catch { /* ignore */ }
          };
          document.addEventListener('visibilitychange', onVisibility);

          removeAppListener = () => {
            handle.remove();
            document.removeEventListener('visibilitychange', onVisibility);
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('not implemented') || msg.includes('UNIMPLEMENTED')) {
            simpleLogger.dev('[DeepLink] Bridge Capacitor non disponible (remote URL) — mécanisme principal actif.');
          } else {
            simpleLogger.error('[DeepLink] Erreur bridge secondaire', e);
          }

          // Même sans bridge : écouter visibilitychange pour attraper le retour depuis Chrome
          const onVisibility = () => {
            if (document.visibilityState !== 'visible') return;
            // Le handler global __scriviaDeepLink sera appelé par evaluateJavascript depuis MainActivity
            // Rien d'autre à faire ici
          };
          document.addEventListener('visibilitychange', onVisibility);
          removeAppListener = () => document.removeEventListener('visibilitychange', onVisibility);
        }

      } catch (e) {
        simpleLogger.error('[DeepLink] Erreur init', e);
      }
    })();

    return () => {
      unsubscribeAuth?.();
      removeAppListener?.();
      delete window.__scriviaDeepLink;
    };
  }, []);
}
