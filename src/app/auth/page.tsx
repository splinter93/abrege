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
  
  // Détection automatique de ChatGPT
  const isChatGPT = redirectUri?.includes('chat.openai.com') || clientId === 'scrivia-custom-gpt';
  const isExternalOAuth = clientId && redirectUri && responseType === 'code';

  useEffect(() => {
    // Attendre que les paramètres OAuth soient disponibles
    if (searchParams) {
      checkSession();
    }
  }, [searchParams]);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setSessionStatus('Session trouvée, redirection...');
        
        // Si c'est un flux OAuth externe, rediriger vers le callback avec le code
        if (isExternalOAuth && clientId && redirectUri) {
          await handleExternalOAuthCallback(session);
        } else {
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
   * Gère la connexion OAuth en stockant les paramètres externes si nécessaire
   */
  const handleOAuthSignIn = async (provider: 'google' | 'apple' | 'github') => {
    try {
      // Si c'est un flux OAuth externe, stocker les paramètres
      if (isExternalOAuth && clientId && redirectUri) {
        const oauthParams = {
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: scope || '',
          state: state || '',
          response_type: responseType || ''
        };
        
        // Stocker les paramètres OAuth dans le sessionStorage
        sessionStorage.setItem('oauth_external_params', JSON.stringify(oauthParams));
        console.log('🔍 Paramètres OAuth stockés:', oauthParams);
        
        // POUR CHATGPT : Rediriger directement vers Google OAuth avec le bon redirect_uri
        if (isChatGPT && provider === 'google') {
          console.log('🤖 Flux ChatGPT détecté, redirection directe vers Google OAuth');
          
          // Construire l'URL Google OAuth avec le redirect_uri de ChatGPT
          const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
          googleOAuthUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!);
          googleOAuthUrl.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback`);
          googleOAuthUrl.searchParams.set('response_type', 'code');
          googleOAuthUrl.searchParams.set('scope', 'email profile');
          googleOAuthUrl.searchParams.set('access_type', 'offline');
          googleOAuthUrl.searchParams.set('prompt', 'consent');
          
          // Stocker un flag pour identifier que c'est un flux ChatGPT
          sessionStorage.setItem('chatgpt_oauth_flow', 'true');
          
          // Rediriger vers Google OAuth
          window.location.href = googleOAuthUrl.toString();
          return;
        }
      }
      
      // Lancer la connexion OAuth standard pour les autres cas
      await signInWithOAuth(provider);
    } catch (error) {
      console.error('Erreur connexion OAuth:', error);
      setError('Erreur lors de la connexion OAuth');
    }
  };

  /**
   * Gère le callback OAuth pour les applications externes
   */
  const handleExternalOAuthCallback = async (session: any) => {
    try {
      if (!clientId || !redirectUri) {
        console.error('🔍 Paramètres manquants:', { clientId, redirectUri });
        return;
      }
      
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Erreur réponse:', errorText);
        throw new Error(`Erreur lors de la création du code OAuth: ${response.status} ${errorText}`);
      }

      const { code } = await response.json();
      
      // Construire l'URL de redirection avec le code
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', code);
      if (state) {
        callbackUrl.searchParams.set('state', state);
      }
      
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
            
            {/* Debug: Affichage temporaire des paramètres OAuth */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0', borderRadius: '5px', fontSize: '12px' }}>
                <strong>Debug OAuth:</strong><br/>
                client_id: {clientId}<br/>
                redirect_uri: {redirectUri}<br/>
                response_type: {responseType}<br/>
                scope: {scope}<br/>
                state: {state}<br/>
                isExternalOAuth: {isExternalOAuth ? 'true' : 'false'}
              </div>
            )}
            
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
                    onClick={() => handleOAuthSignIn(provider.provider as 'google' | 'apple' | 'github')}
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
                onClick={() => handleOAuthSignIn('google')}
                disabled={oauthLoading}
                className="oauth-button google"
              >
                {oauthLoading ? 'Chargement...' : 'Se connecter avec Google'}
              </button>
              <button
                onClick={() => handleOAuthSignIn('github')}
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