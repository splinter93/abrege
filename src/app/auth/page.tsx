'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
  const [currentSession, setCurrentSession] = useState<any>(null);

  const { t } = useLanguageContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Params OAuth envoyés par ChatGPT Actions
  const clientId = searchParams?.get('client_id') || null;
  const redirectUri = searchParams?.get('redirect_uri') || null;
  const scope = searchParams?.get('scope') || null;         // espaces, pas virgules
  const state = searchParams?.get('state') || null;
  const responseType = searchParams?.get('response_type') || null;

  const isExternalOAuth = Boolean(clientId && redirectUri && responseType === 'code');

  // Anti double callback auto
  const didRunExternalCallbackRef = useRef(false);

  // Vérifie la session et gère le flux externe ChatGPT
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setCurrentSession(session);

          // ✅ CORRECTION : Flux ChatGPT → attente de connexion manuelle
          if (isExternalOAuth && clientId && redirectUri && !didRunExternalCallbackRef.current) {
            console.log('🔍 [Auth] Flux OAuth ChatGPT détecté, attente de connexion manuelle');
            didRunExternalCallbackRef.current = true;
            
            // ✅ NOUVEAU : Détecter si c'est l'ancienne ou la nouvelle action ID
            const isOldActionId = redirectUri.includes('g-011f24575c8d3b9d5d69e124bafa1364ae3badf9');
            const isNewActionId = redirectUri.includes('g-369c00bd47b6f501275b414d19d5244ac411097b');
            
            if (isOldActionId) {
              setSessionStatus('⚠️ Ancienne action ChatGPT détectée. Connectez-vous puis cliquez sur "Continuer le flux OAuth manuellement".');
            } else if (isNewActionId) {
              setSessionStatus('✅ Nouvelle action ChatGPT détectée. Veuillez vous connecter pour autoriser l\'accès.');
            } else {
              setSessionStatus('🔍 Flux OAuth externe détecté. Veuillez vous connecter pour autoriser l\'accès.');
            }
            
            // ✅ CORRECTION : Stocker les paramètres pour plus tard
            const oauthParams = {
              client_id: clientId,
              redirect_uri: redirectUri,
              scope: scope || '',
              state: state || ''
            };
            
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('oauth_external_params', JSON.stringify(oauthParams));
            }
            
            // ❌ NE PAS rediriger automatiquement - laisser l'utilisateur se connecter
            return;
          }

          // Flux normal
          if (!isExternalOAuth) {
            setSessionStatus('Session trouvée, redirection…');
            router.push('/');
          }
        } else {
          setSessionStatus('Aucune session');
          setCurrentSession(null);
        }
      } catch (e) {
        console.error('Erreur vérification session:', e);
        setSessionStatus('Erreur lors de la vérification de session');
        setCurrentSession(null);
      }
    })();
          // ✅ OPTIMISATION : Simplifier les dépendances
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, isExternalOAuth, clientId, redirectUri]);

  // Form email/password
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSessionStatus('Vérifiez votre email pour confirmer votre compte');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // OAuth (Google/GitHub/Apple) via hook dédié
  const { signIn: signInWithOAuth, loading: oauthLoading, error: oauthError } = useOAuth();

  // Lance l’auth interne ; le callback ChatGPT sera déclenché automatiquement quand la session existe
  const handleOAuthSignIn = async (provider: 'google' | 'apple' | 'github') => {
    try {
      await signInWithOAuth(provider);
    } catch (e) {
      console.error('Erreur connexion OAuth:', e);
      setError('Erreur lors de la connexion OAuth');
    }
  };

  // ✅ NOUVEAU : Fonction de redirection manuelle pour gérer l'ancienne action ID
  const handleManualOAuthRedirect = () => {
    if (isExternalOAuth && clientId && redirectUri) {
      console.log('🔍 [Auth] Redirection manuelle vers callback OAuth');
      
      // Stocker les paramètres OAuth
      const oauthParams = {
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scope || '',
        state: state || ''
      };
      
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('oauth_external_params', JSON.stringify(oauthParams));
      }
      
      // Rediriger vers callback pour traitement OAuth
      router.push('/auth/callback');
    }
  };

  return (
    <div className="auth-container">
      <LogoHeader />

      <div className="auth-content">
        <div className="auth-form-container">
          <div className="auth-header">
            <h1 className="auth-title">
              {isExternalOAuth ? `Autoriser l'accès à ${clientId}` : (isSignUp ? 'Créer un compte' : 'Se connecter')}
            </h1>
            <p className="auth-subtitle">
              {isExternalOAuth
                ? `Autoriser l'accès à ${clientId}`
                : (isSignUp ? 'Rejoignez Scrivia pour organiser vos connaissances' : 'Accédez à votre espace personnel')}
            </p>

            {/* Debug visible seulement en dev */}
            {process.env.NODE_ENV === 'development' && (
              <div style={{ background: '#f0f0f0', padding: 10, margin: '10px 0', borderRadius: 5, fontSize: 12 }}>
                <strong>Debug OAuth:</strong><br />
                client_id: {clientId}<br />
                redirect_uri: {redirectUri}<br />
                response_type: {responseType}<br />
                scope: {scope}<br />
                state: {state}<br />
                isExternalOAuth: {isExternalOAuth ? 'true' : 'false'}
              </div>
            )}

            {isExternalOAuth && (
              <div className="auth-oauth-info">
                <p><strong>Application :</strong> {clientId}</p>
                <p><strong>Permissions :</strong> {scope || 'Aucune permission spécifique'}</p>
              </div>
            )}

            <div className="auth-session-status">{sessionStatus}</div>
            {error && <div className="error-message" role="alert">{error}</div>}
          </div>

          {/* Formulaire classique (hors flux externe) */}
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
                <button type="submit" disabled={loading} className="auth-button primary">
                  {loading ? 'Chargement...' : (isSignUp ? 'Créer un compte' : 'Se connecter')}
                </button>
              </form>

              <div className="auth-divider"><span>ou</span></div>

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
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="switch-button">
                  {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? Créer un compte'}
                </button>
              </div>
            </>
          )}

          {/* Flux externe (ChatGPT) */}
          {isExternalOAuth && (
            <div className="auth-oauth-actions">
              {currentSession && (
                <div className="auth-oauth-session-info">
                  <p>✅ Connecté en tant que {currentSession.user?.email}</p>
                  {/* ✅ NOUVEAU : Bouton de redirection manuelle pour gérer l'ancienne action ID */}
                  <p>🔄 Redirection automatique en cours...</p>
                  
                  <button
                    onClick={() => handleManualOAuthRedirect()}
                    className="auth-button primary"
                    style={{ marginTop: '1rem' }}
                  >
                    🔄 Continuer le flux OAuth manuellement
                  </button>
                </div>
              )}

              {!currentSession && (
                <>
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
                </>
              )}
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