import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import type { AuthProvider } from '@/config/authProviders';

/**
 * URL de callback pour le flux OAuth natif (Capacitor).
 * Scheme custom = pas besoin d'assetlinks.json.
 * À enregistrer aussi dans Supabase Dashboard > Auth > URL Configuration > Redirect URLs.
 */
const NATIVE_OAUTH_REDIRECT = 'scrivia://callback';

function isSupabaseError(error: unknown): error is { message: string; status?: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isSupabaseError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

/**
 * Détecte si on tourne dans un WebView Capacitor natif.
 * Import dynamique pour éviter les erreurs SSR.
 */
async function isNative(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function useOAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: AuthProvider) {
    setLoading(true);
    setError(null);
    try {
      const native = await isNative();

      if (native) {
        // ─── CAPACITOR NATIF ───────────────────────────────────────────────
        // Google bloque OAuth dans les WebViews. On ouvre l'URL dans un navigateur
        // (Chrome Custom Tab si @capacitor/browser dispo, sinon navigateur système).
        // Le callback revient via deep link scrivia://callback (AndroidManifest).
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            skipBrowserRedirect: true,
            redirectTo: NATIVE_OAUTH_REDIRECT,
          },
        });
        if (oauthError) throw oauthError;
        if (data?.url) {
          // Google bloque OAuth dans les WebViews (403 disallowed_useragent).
          // On ouvre uniquement dans un navigateur système. Ordre :
          // 1. OpenInBrowser (plugin local dans l'APK, fiable avec server.url)
          // 2. Browser / InAppBrowser (peuvent être "not implemented" si chargement distant)
          let opened = false;
          try {
            const { Capacitor } = await import('@capacitor/core');
            const openInBrowser = Capacitor.Plugins['OpenInBrowser'] as
              | { openUrl: (opts: { url: string }) => Promise<void> }
              | undefined;
            if (openInBrowser) {
              await openInBrowser.openUrl({ url: data.url });
              opened = true;
            }
          } catch {
            // Plugin absent (APK ancien) ou erreur — fall through
          }
          if (!opened) {
            try {
              const { Browser } = await import('@capacitor/browser');
              await Browser.open({ url: data.url });
              opened = true;
            } catch (browserErr) {
              const msg = getErrorMessage(browserErr, '');
              if (!msg.includes('not implemented') && !msg.includes('Browser')) throw browserErr;
            }
          }
          if (!opened) {
            try {
              const { InAppBrowser, DefaultSystemBrowserOptions } = await import(
                '@capacitor/inappbrowser'
              );
              await InAppBrowser.openInSystemBrowser({
                url: data.url,
                options: DefaultSystemBrowserOptions,
              });
              opened = true;
            } catch (inAppErr) {
              const msg = getErrorMessage(inAppErr, '');
              if (!msg.includes('not implemented') && !msg.includes('InAppBrowser')) throw inAppErr;
            }
          }
          if (!opened) {
            try {
              const { InAppBrowser } = await import('@capacitor/inappbrowser');
              await InAppBrowser.openInExternalBrowser({ url: data.url });
              opened = true;
            } catch {
              // fall through
            }
          }
          if (!opened) {
            setError(
              'Connexion Google indisponible dans cette version. Reconstruisez l’app (npm run cap:run:android:prod) puis réinstallez.',
            );
            setLoading(false);
          }
        }
        // Le reste est géré par useCapacitorDeepLink (appUrlOpen listener).
        // setLoading(false) intentionnellement omis : le spinner reste actif
        // jusqu'à ce que l'app reçoive le deep link et navigue.
      } else {
        // ─── WEB ──────────────────────────────────────────────────────────
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (oauthError) throw oauthError;
        // Pas de setLoading(false) : redirect immédiate.
      }
    } catch (err: unknown) {
      console.error(`useOAuth signIn error for ${provider}:`, err);
      const msg = getErrorMessage(err, 'An unexpected error occurred.');
      if (msg.includes('not configured') || msg.includes('not enabled')) {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured.`);
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err: unknown) {
      console.error('useOAuth signOut error:', err);
      setError(getErrorMessage(err, 'An unexpected error occurred during sign out.'));
    } finally {
      setLoading(false);
    }
  }

  return { signIn, signOut, loading, error };
}
