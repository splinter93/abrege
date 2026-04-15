import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { ENV } from '@/config/env';

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Sur app native (Capacitor), OAuth s’ouvre souvent dans le navigateur système :
 * le retour `?code=` (PKCE) arrive alors sans le `code_verifier` stocké dans la WebView
 * → erreur Supabase « both auth code and code verifier should be non-empty ».
 * Le flux implicit renvoie les tokens dans le hash (#access_token=…) : pas de verifier.
 */
function getAuthFlowType(): 'pkce' | 'implicit' {
  if (typeof window === 'undefined') return 'pkce';
  try {
    return Capacitor.isNativePlatform() ? 'implicit' : 'pkce';
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


