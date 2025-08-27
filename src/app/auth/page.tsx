'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOAuth } from '@/hooks/useOAuth';
import { authProviders } from '@/config/authProviders';
import { useLanguageContext } from '@/contexts/LanguageContext';
import LogoHeader from '@/components/LogoHeader';
import { supabase } from '@/supabaseClient';
import './auth.css';

function AuthPageContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionStatus, setSessionStatus] = useState<string>('Vérification...');
  const { t } = useLanguageContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Paramètres OAuth externes
  const clientId = searchParams?.get('client_id') || null;
  const redirectUri = searchParams?.get('redirect_uri') || null;
  const scope = searchParams?.get('scope') || null;
  const state = searchParams?.get('state') || null;
  const responseType = searchParams?.get('response_type') || null;
  
  const isExternalOAuth = clientId && redirectUri && responseType === 'code';

  // Debug: Log des paramètres OAuth
  console.log('🔍 Debug OAuth:', {
    clientId,
    redirectUri,
    scope,
    state,
    responseType,
    isExternalOAuth
  });

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🔍 Session trouvée:', !!session, 'isExternalOAuth:', isExternalOAuth);
      
      if (session) {
        setSessionStatus('Session trouvée, redirection...');
        
        // Si c'est un flux OAuth externe, rediriger vers le callback avec le code
        if (isExternalOAuth && clientId && redirectUri) {
          console.log('🔍 Flux OAuth externe détecté, appel de handleExternalOAuthCallback');
          await handleExternalOAuthCallback(session);
        } else {
          console.log('🔍 Flux OAuth interne, redirection vers /');
          router.push('/');
        }
      } else {
        setSessionStatus('Aucune session');
      }
    } catch (error) {
      console.error('Erreur vérification session:', error);
      setSessionStatus('Erreur lors de la vérification de session');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSessionStatus('Vérifiez votre email pour confirmer votre compte');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Use OAuth hook for OAuth sign-in
  const { signIn: signInWithOAuth, loading: oauthLoading, error: oauthError } = useOAuth();

  /**
   * Gère le callback OAuth pour les applications externes
   */
  const handleExternalOAuthCallback = async (session: any) => {
    try {
      console.log('🔍 handleExternalOAuthCallback appelé avec:', {
        clientId,
        redirectUri,
        scope,
        state,
        userId: session.user.id
      });

      if (!clientId || !redirectUri) {
        console.error('🔍 Paramètres manquants:', { clientId, redirectUri });
        return;
      }
      
      console.log('🔍 Appel de /api/auth/create-code...');
      
      // Créer un vrai code d'autorisation OAuth
      const response = await fetch('/api/auth/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          userId: session.user.id,
          redirectUri,
          scopes: scope ? scope.split(' ').filter(s => s.trim()) : [],
          state
        })
      });

      console.log('🔍 Réponse /api/auth/create-code:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Erreur réponse:', errorText);
        throw new Error(`Erreur lors de la création du code OAuth: ${response.status} ${errorText}`);
      }

      const { code } = await response.json();
      console.log('🔍 Code OAuth généré:', code);
      
      // Construire l'URL de redirection avec le code
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', code);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }
      
      console.log('🔍 Redirection vers:', callbackUrl.toString());
      
      // Rediriger vers l'application externe
      window.location.href = callbackUrl.toString();
      
    } catch (error) {
      console.error('🔍 Erreur callback OAuth externe:', error);
      setError('Erreur lors de la redirection OAuth');
    }
  };

  return (
    <div className="auth-container">
      <LogoHeader />
      
      <div className="auth-content">
        <div className="auth-form-container">
          <div className="auth-header">
            <h1 className="auth-title">
              {isExternalOAuth 
                ? `Autoriser l'accès à ${clientId}`
                : (isSignUp ? 'Créer un compte' : 'Se connecter')
              }
            </h1>
            <p className="auth-subtitle">
              {isExternalOAuth 
                ? `Autoriser l'accès à ${clientId}`
                : (isSignUp ? 'Rejoignez Scrivia pour organiser vos connaissances' : 'Accédez à votre espace personnel')
              }
            </p>
            
            {isExternalOAuth && (
              <div className="auth-oauth-info">
                <p><strong>Application :</strong> {clientId}</p>
                <p><strong>Permissions :</strong> {scope || 'Aucune permission spécifique'}</p>
              </div>
            )}
            
            <div className="auth-session-status">
              {sessionStatus}
            </div>
          </div>

          {!isExternalOAuth && (
            <>
              <form onSubmit={handleEmailAuth} className="auth-form">
                <div className="form-group">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>
                {error && <div className="error-message">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-button primary"
                >
                  {loading ? 'Chargement...' : (isSignUp ? 'Créer un compte' : 'Se connecter')}
                </button>
              </form>

              <div className="auth-divider">
                <span>ou</span>
              </div>

              <div className="oauth-buttons">
                {authProviders.map((provider) => (
                  <button
                    key={provider.provider}
                    onClick={() => signInWithOAuth(provider.provider)}
                    disabled={oauthLoading}
                    className={`oauth-button ${provider.provider}`}
                  >
                    {oauthLoading ? 'Chargement...' : `Continuer avec ${provider.label}`}
                  </button>
                ))}
                {oauthError && <div className="error-message">{oauthError}</div>}
              </div>

              <div className="auth-switch">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="switch-button"
                >
                  {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? Créer un compte'}
                </button>
              </div>
            </>
          )}

          {isExternalOAuth && (
            <div className="auth-oauth-actions">
              <button
                onClick={() => signInWithOAuth('google')}
                disabled={oauthLoading}
                className="oauth-button google"
              >
                {oauthLoading ? 'Chargement...' : 'Se connecter avec Google'}
              </button>
              <button
                onClick={() => signInWithOAuth('github')}
                disabled={oauthLoading}
                className="oauth-button github"
              >
                {oauthLoading ? 'Chargement...' : 'Se connecter avec GitHub'}
              </button>
              {oauthError && <div className="error-message">{oauthError}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant principal avec Suspense
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="auth-container">
        <div className="auth-content">
          <div className="auth-form-container">
            <div className="auth-header">
              <h1 className="auth-title">Chargement...</h1>
            </div>
          </div>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
} 