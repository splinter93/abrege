import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { ENV } from '@/config/env';

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Sur app native (Capacitor) **et** en mode PWA standalone, OAuth s'ouvre dans
 * un contexte différent de celui qui a stocké le `code_verifier` :
 *   - Capacitor : navigateur système externe → retour deep link sans verifier.
 *   - PWA standalone (Chrome desktop) : Chrome intercepte la navigation vers
 *     accounts.google.com et l'ouvre dans un onglet classique ; le callback
 *     `?code=` revient dans cet onglet, pas dans la fenêtre PWA.
 * Dans les deux cas, GoTrue fait l'échange côté serveur et renvoie les tokens
 * dans le hash (#access_token=…) → pas de verifier côté client requis.
 */
function getAuthFlowType(): 'pkce' | 'implicit' {
  if (typeof window === 'undefined') return 'pkce';
  try {
    if (Capacitor.isNativePlatform()) return 'implicit';
    // PWA installée (standalone / fullscreen / minimal-ui) : même problème que Capacitor
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    ) {
      return 'implicit';
    }
    return 'pkce';
  } catch {
    return 'pkce';
  }
}

/**
 * Get singleton Supabase client instance
 * Prevents multiple client creation warnings
 * 
 * @returns Singleton SupabaseClient instance
 * @throws Error if environment variables are missing
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(ENV.supabase.url, ENV.supabase.anonKey, {
      auth: {
        flowType: getAuthFlowType(),
        detectSessionInUrl: true,
      },
    });
  }
  
  return supabaseClientInstance;
}
