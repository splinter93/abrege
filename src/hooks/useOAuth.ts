import { useState } from 'react';
import { supabase } from '@/supabaseClient';
import type { AuthProvider } from '@/config/authProviders';

/**
 * Type guard pour vérifier si une erreur est une erreur Supabase
 */
function isSupabaseError(error: unknown): error is { message: string; status?: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Extrait un message d'erreur sûr depuis une erreur inconnue
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (isSupabaseError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

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
    } catch (err: unknown) {
      console.error(`useOAuth signIn error for ${provider}:`, err);
      
      const errorMessage = getErrorMessage(err, 'An unexpected error occurred.');
      
      if (errorMessage.includes('not configured') || errorMessage.includes('not enabled')) {
        setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured.`);
      } else {
        setError(errorMessage);
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
    } catch (err: unknown) {
      console.error('useOAuth signOut error:', err);
      setError(getErrorMessage(err, 'An unexpected error occurred during sign out.'));
    } finally {
      setLoading(false);
    }
  }

  return { signIn, signOut, loading, error };
}
