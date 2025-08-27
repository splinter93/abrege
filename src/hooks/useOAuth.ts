import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import type { AuthProvider } from '@/config/authProviders';

export function useOAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: AuthProvider) {
    setLoading(true);
    setError(null);
    try {
      // Toujours utiliser le callback Supabase standard
      // Supabase gère automatiquement la redirection vers notre app
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { 
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (oauthError) {
        throw oauthError;
      }
      // No need to setLoading(false) here; redirect will occur
    } catch (err: any) {
      console.error(`useOAuth signIn error for ${provider}:`, err);
      if (err.message?.includes('not configured') || err.message?.includes('not enabled')) {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured.`);
      } else {
        setError(err.message ?? 'An unexpected error occurred.');
      }
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
    } catch (err: any) {
      console.error('useOAuth signOut error:', err);
      setError(err.message ?? 'An unexpected error occurred during sign out.');
    } finally {
      setLoading(false);
    }
  }

  return { signIn, signOut, loading, error };
}
