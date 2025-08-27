import { useState, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { oauthService } from '@/services/oauthService';
import type { AuthProvider } from '@/config/authProviders';

export function useOAuth(externalOAuthParams?: {
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  responseType?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Écouter les changements de session pour gérer le callback OAuth externe
  useEffect(() => {
    if (!externalOAuthParams) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          console.log('🔍 OAuth externe détecté, création du code d\'autorisation...');
          
          // Créer le code d'autorisation OAuth
          const code = await oauthService.createAuthorizationCode(
            externalOAuthParams.clientId,
            session.user.id,
            externalOAuthParams.redirectUri,
            externalOAuthParams.scope ? externalOAuthParams.scope.split(' ').filter(s => s.trim()) : [],
            externalOAuthParams.state
          );
          
          // Construire l'URL de redirection avec le code
          const callbackUrl = new URL(externalOAuthParams.redirectUri);
          callbackUrl.searchParams.set('code', code);
          if (externalOAuthParams.state) {
            callbackUrl.searchParams.set('state', externalOAuthParams.state);
          }
          
          console.log('🔍 Redirection vers ChatGPT avec le code:', code);
          
          // Rediriger vers l'application externe (ChatGPT)
          window.location.href = callbackUrl.toString();
          
        } catch (error) {
          console.error('🔍 Erreur callback OAuth externe:', error);
          setError('Erreur lors de la redirection OAuth');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [externalOAuthParams]);

  async function signIn(provider: AuthProvider) {
    setLoading(true);
    setError(null);
    try {
      // Si c'est un flux OAuth externe, passer les paramètres au callback
      let redirectTo = `${window.location.origin}/auth/callback`;
      
      if (externalOAuthParams) {
        const params = new URLSearchParams();
        params.set('client_id', externalOAuthParams.clientId);
        params.set('redirect_uri', externalOAuthParams.redirectUri);
        if (externalOAuthParams.scope) params.set('scope', externalOAuthParams.scope);
        if (externalOAuthParams.state) params.set('state', externalOAuthParams.state);
        if (externalOAuthParams.responseType) params.set('response_type', externalOAuthParams.responseType);
        params.set('is_external_oauth', 'true');
        
        redirectTo = `${redirectTo}?${params.toString()}`;
      }

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
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
