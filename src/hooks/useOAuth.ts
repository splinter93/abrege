import { useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { supabase } from '@/supabaseClient';
import type { AuthProvider } from '@/config/authProviders';

/**
 * URL de callback pour le flux OAuth natif (Capacitor).
 * Scheme custom = pas besoin d'assetlinks.json.
 * À enregistrer dans Supabase Dashboard > Auth > URL Configuration > Redirect URLs.
 */
const NATIVE_OAUTH_REDIRECT = 'scrivia://callback';

/**
 * Plugin natif local (OpenInBrowserPlugin.java) enregistré dans MainActivity.
 * Deux mécanismes :
 *   - openUrl()          : appel explicite → Intent ACTION_VIEW → Chrome
 *   - shouldOverrideLoad : intercepte accounts.google.com dans le WebView → Chrome
 */
interface OpenInBrowserPlugin {
  openUrl(options: { url: string }): Promise<void>;
}
const OpenInBrowser = registerPlugin<OpenInBrowserPlugin>('OpenInBrowser');

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

/** Détecte si on tourne dans un WebView Capacitor natif (import dynamique pour SSR). */
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
        // ─── CAPACITOR NATIF ────────────────────────────────────────────────
        // Google refuse OAuth dans les WebViews (403 disallowed_useragent).
        // On obtient l'URL OAuth Supabase sans rediriger, puis on l'ouvre dans
        // le navigateur système via différentes stratégies.
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            skipBrowserRedirect: true,
            redirectTo: NATIVE_OAUTH_REDIRECT,
          },
        });
        if (oauthError) throw oauthError;

        if (data?.url) {
          await openOAuthUrl(data.url);
        }
        // Le reste est géré par useCapacitorDeepLink (appUrlOpen listener).
        // setLoading(false) intentionnellement omis : spinner actif jusqu'au deep link.
      } else {
        // ─── WEB ──────────────────────────────────────────────────────────
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (oauthError) throw oauthError;
      }
    } catch (err: unknown) {
      console.error(`useOAuth signIn error for ${provider}:`, err);
      const msg = getErrorMessage(err, 'An unexpected error occurred.');
      setError(
        msg.includes('not configured') || msg.includes('not enabled')
          ? `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured.`
          : msg,
      );
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

/**
 * Ouvre l'URL OAuth dans le navigateur système Android.
 *
 * Ordre de priorité :
 *   1. OpenInBrowser.openUrl()     — plugin natif local (le plus fiable, Intent direct)
 *   2. Browser.open()              — @capacitor/browser (Chrome Custom Tabs)
 *   3. InAppBrowser (system puis external)
 *   4. window.location.href        — dernier recours : shouldOverrideLoad dans
 *                                    OpenInBrowserPlugin intercepte accounts.google.com
 *                                    et ouvre Chrome sans quitter l'app.
 */
async function openOAuthUrl(url: string): Promise<void> {
  // 1. Plugin natif local (disponible après rebuild avec OpenInBrowserPlugin.java)
  try {
    await OpenInBrowser.openUrl({ url });
    return;
  } catch {
    // Plugin absent ou bridge indispo — fall through
  }

  // 2. @capacitor/browser (Chrome Custom Tabs)
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  } catch {
    // fall through
  }

  // 3. @capacitor/inappbrowser — System Browser (Custom Tabs)
  try {
    const { InAppBrowser, DefaultSystemBrowserOptions } = await import('@capacitor/inappbrowser');
    await InAppBrowser.openInSystemBrowser({ url, options: DefaultSystemBrowserOptions });
    return;
  } catch {
    // fall through
  }

  // 4. @capacitor/inappbrowser — External Browser
  try {
    const { InAppBrowser } = await import('@capacitor/inappbrowser');
    await InAppBrowser.openInExternalBrowser({ url });
    return;
  } catch {
    // fall through
  }

  // 5. Dernier recours : window.location.href
  // shouldOverrideLoad dans OpenInBrowserPlugin.java intercepte la navigation
  // vers accounts.google.com → Intent Chrome → WebView reste sur la page.
  // Ne fonctionne qu'après rebuild avec le plugin.
  window.location.href = url;
}
