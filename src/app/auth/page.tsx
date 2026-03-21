'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOAuth } from '@/hooks/useOAuth';
import { authProviders } from '@/config/authProviders';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { FiFeather } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub, FaApple } from 'react-icons/fa';
import { supabase } from '@/supabaseClient';
import { simpleLogger } from '@/utils/logger';
import './auth.css';

function AuthPageContent() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionStatus, setSessionStatus] = useState<string>('Vérification...');
  const [currentSession, setCurrentSession] = useState<{ access_token?: string; user?: { email?: string } } | null>(null);

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
            simpleLogger.dev('🔍 [Auth] Flux OAuth ChatGPT détecté, attente de connexion manuelle');
            didRunExternalCallbackRef.current = true;
            
            // ✅ Détecter les actions ChatGPT
            const isOldActionId = redirectUri.includes('g-011f24575c8d3b9d5d69e124bafa1364ae3badf9');
            const isNewActionId = redirectUri.includes('g-369c00bd47b6f501275b414d19d5244ac411097b');
            
            if (isOldActionId) {
              setSessionStatus('✅ Action ChatGPT détectée (ID: g-011f24575c8d3b9d5d69e124bafa1364ae3badf9). Veuillez vous connecter pour autoriser l\'accès.');
            } else if (isNewActionId) {
              setSessionStatus('✅ Action ChatGPT détectée (ID: g-369c00bd47b6f501275b414d19d5244ac411097b). Veuillez vous connecter pour autoriser l\'accès.');
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
            setSessionStatus('Session trouvée');
            // ❌ SUPPRIMÉ : Redirection automatique
            // router.push('/');
          }
        } else {
          setSessionStatus('Aucune session');
          setCurrentSession(null);
        }
      } catch (e) {
        simpleLogger.error('Erreur vérification session', e);
        setSessionStatus('Erreur lors de la vérification de session');
        setCurrentSession(null);
      }
    })();
          // ✅ OPTIMISATION : Simplifier les dépendances
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, isExternalOAuth, clientId, redirectUri]);

  // Erreur renvoyée après callback OAuth natif (ex: session_expired, session_error)
  useEffect(() => {
    const err = searchParams?.get('error');
    if (!err) return;
    if (err === 'session_expired') {
      setError('Session expirée. Réessayez de vous connecter avec Google.');
    } else if (err === 'session_error') {
      setError('Erreur de session. Réessayez de vous connecter.');
    } else {
      setError(err === 'access_denied' ? 'Connexion annulée.' : `Erreur: ${err}`);
    }
  }, [searchParams]);

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
        // ❌ SUPPRIMÉ : Redirection automatique après connexion
        // router.push('/');
      }
    } catch (err) {
      const error = err as { message?: string };
      setError(error?.message || 'Erreur de connexion');
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
      simpleLogger.error('Erreur connexion OAuth', e);
      setError('Erreur lors de la connexion OAuth');
    }
  };

  // ✅ NOUVEAU : Fonction de redirection manuelle pour gérer l'ancienne action ID
  const handleManualOAuthRedirect = () => {
    if (isExternalOAuth && clientId && redirectUri) {
      simpleLogger.dev('🔍 [Auth] Redirection manuelle vers callback OAuth');
      
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
      
      // ✅ CORRECTION : Redirection vers le callback OAuth
      router.push('/auth/callback');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <FiFeather size={52} />
        </div>

        <div className="auth-content">
          <div className="auth-form-container">
            <div className="auth-header">
              <h1 className="auth-title">
                {isExternalOAuth ? `Autoriser l'accès à ${clientId}` : (isSignUp ? 'Créer un compte' : 'Connexion')}
              </h1>
              <p className="auth-subtitle">
                {isExternalOAuth
                  ? `Autoriser l'accès à ${clientId}`
                  : (isSignUp ? 'Rejoignez Scrivia pour organiser vos connaissances' : 'Accédez à votre Espace Scrivia')}
              </p>

            {isExternalOAuth && (
              <div className="auth-oauth-info">
                <p><strong>Application :</strong> {clientId}</p>
                <p><strong>Permissions :</strong> {scope || 'Aucune permission spécifique'}</p>
              </div>
            )}

              {/* Afficher le statut uniquement si c'est utile (pas "Aucune session" ni "Session trouvée") */}
              {sessionStatus && 
               sessionStatus !== 'Aucune session' && 
               sessionStatus !== 'Session trouvée' && 
               sessionStatus !== 'Vérification...' && (
                <div className="auth-session-status">{sessionStatus}</div>
              )}
              {error && <div className="error-message" role="alert">{error}</div>}
            </div>

          {/* Formulaire classique (hors flux externe) */}
          {!isExternalOAuth && (
            <>
              <div className="oauth-buttons">
                {authProviders.map((provider) => {
                  const getIcon = () => {
                    switch (provider.provider) {
                      case 'google':
                        return <FcGoogle size={20} />;
                      case 'apple':
                        return <FaApple size={20} />;
                      case 'github':
                        return <FaGithub size={20} />;
                      default:
                        return null;
                    }
                  };
                  
                  return (
                    <button
                      key={provider.provider}
                      onClick={() => handleOAuthSignIn(provider.provider as 'google' | 'apple' | 'github')}
                      disabled={oauthLoading}
                      className={`oauth-button ${provider.provider}`}
                    >
                      {getIcon()}
                      {oauthLoading ? 'Chargement...' : `Continuer avec ${provider.label}`}
                    </button>
                  );
                })}
                {oauthError && <div className="error-message">{oauthError}</div>}
              </div>

              <div className="auth-divider"><span>ou</span></div>

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
                  {loading ? 'Chargement...' : (isSignUp ? 'Créer un compte' : 'Connexion')}
                </button>
              </form>

              <div className="auth-switch">
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="switch-button">
                  {isSignUp ? 'Déjà un compte ? Connexion' : 'Pas de compte ? Créer un compte'}
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
                  <p>✅ Vous êtes connecté et pouvez rester sur cette page</p>
                  
                  <button
                    onClick={() => handleManualOAuthRedirect()}
                    className="auth-button primary"
                    style={{ marginTop: '1rem' }}
                  >
                    🔄 Continuer le flux OAuth
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
                    <FcGoogle size={20} />
                    {oauthLoading ? 'Chargement...' : 'Connexion avec Google'}
                  </button>
                  <button
                    onClick={() => handleOAuthSignIn('github')}
                    disabled={oauthLoading}
                    className="oauth-button github"
                  >
                    <FaGithub size={20} />
                    {oauthLoading ? 'Chargement...' : 'Connexion avec GitHub'}
                  </button>
                  {oauthError && <div className="error-message">{oauthError}</div>}
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant principal avec Suspense
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-content">
            <div className="auth-form-container">
              <div className="auth-header">
                <h1 className="auth-title">Chargement...</h1>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <AuthPageContent />
    </Suspense>
  );
}