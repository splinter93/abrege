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

  // Params OAuth externes (ChatGPT Actions)
  const clientId = searchParams?.get('client_id') || null;
  const redirectUri = searchParams?.get('redirect_uri') || null;
  const scope = searchParams?.get('scope') || null; // espaces attendus
  const state = searchParams?.get('state') || null;
  const responseType = searchParams?.get('response_type') || null;

  const isExternalOAuth = Boolean(clientId && redirectUri && responseType === 'code');

  // Empêche les doubles callbacks auto
  const didRunExternalCallbackRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCurrentSession(session);

          // Flux externe (ChatGPT) → générer le code et rediriger automatiquement
          if (isExternalOAuth && clientId && redirectUri && !didRunExternalCallbackRef.current) {
            didRunExternalCallbackRef.current = true; // lock anti double-run
            setSessionStatus('Session trouvée, authentification OAuth en cours...');
            await handleExternalOAuthCallback(session);
            return;
          }

          // Flux normal → entrer dans l’app
          setSessionStatus('Session trouvée, redirection…');
          router.push('/');
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
    // Recalc si les params changent (nouvelle tentative d’OAuth externe)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isExternalOAuth, clientId, redirectUri]);

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

  /**
   * Lance l’auth OAuth (interne). Pour un flux externe, on stocke juste les params (debug/traçabilité),
   * puis on laisse Supabase gérer l’auth. La redirection finale vers ChatGPT sera faite par handleExternalOAuthCallback.
   */
  const handleOAuthSignIn = async (provider: 'google' | 'apple' | 'github') => {
    try {
      if (isExternalOAuth && clientId && redirectUri) {
        const oauthParams = {
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: scope || '',
          state: state || '',
          response_type: responseType || ''
        };
        sessionStorage.setItem('oauth_external_params', JSON.stringify(oauthParams));
      }
      await signInWithOAuth(provider);
    } catch (e) {
      console.error('Erreur connexion OAuth:', e);
      setError('Erreur lors de la connexion OAuth');
    }
  };

  /**
   * Callback OAuth pour applications externes (ChatGPT).
   * Rôle: générer un code Scrivia, puis rediriger vers `redirect_uri` avec `code` + `state` **inchangé**.
   */
  const handleExternalOAuthCallback = async (session: any) => {
    try {
      console.log('🔍 [OAuth] Début handleExternalOAuthCallback avec session:', session.user.email);
      
      if (!clientId || !redirectUri) {
        console.error('❌ [OAuth] Paramètres manquants:', { clientId, redirectUri });
        return;
      }

      console.log('🔍 [OAuth] Paramètres OAuth externes:', { clientId, redirectUri, scope, state });

      // Scopes autorisés (filtrage souple)
      const allowedScopes = [
        'notes:read', 'notes:write',
        'dossiers:read', 'dossiers:write',
        'classeurs:read', 'classeurs:write'
      ];
      const requested = scope ? scope.split(' ').filter(Boolean) : [];
      const validScopes = requested.filter(s => allowedScopes.includes(s));
      const finalScopes = validScopes.length > 0 ? validScopes : ['notes:read'];

      console.log('🔍 [OAuth] Scopes traités:', { requested, validScopes, finalScopes });

      // Demande de code d'autorisation Scrivia
      console.log('🔍 [OAuth] Appel API create-code...');
      const res = await fetch('/api/auth/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Bearer = session Scrivia (Supabase), côté backend on identifie l'utilisateur
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          clientId,
          userId: session.user?.id,
          redirectUri,
          scopes: finalScopes,
          state // IMPORTANT: on renvoie le state tel quel à ChatGPT
        })
      });

      console.log('🔍 [OAuth] Réponse API create-code:', res.status, res.statusText);

      if (!res.ok) {
        const text = await res.text();
        console.error('❌ [OAuth] Erreur /api/auth/create-code:', res.status, text);
        throw new Error(`create-code failed ${res.status}`);
      }

      const { code } = await res.json();
      console.log('🔍 [OAuth] Code OAuth reçu:', code ? 'PRÉSENT' : 'ABSENT');

      // Redirection vers le callback ChatGPT
      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set('code', code);
      if (state) callbackUrl.searchParams.set('state', state);

      console.log('🔁 [OAuth] Redirection finale →', callbackUrl.toString());
      console.log('🔁 [OAuth] Redirection vers ChatGPT dans 2 secondes...');
      
      // ✅ CORRECTION : Délai pour laisser l'UI se mettre à jour
      setTimeout(() => {
        window.location.href = callbackUrl.toString();
      }, 2000);
    } catch (e) {
      console.error('❌ [OAuth] Erreur callback OAuth externe:', e);
      setError('Erreur lors de la redirection OAuth');
      setSessionStatus('Erreur OAuth externe');
      // Permettre un retry manuel si besoin
      didRunExternalCallbackRef.current = false;
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

          {/* Formulaire classique (non flux externe) */}
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
                  <button
                    onClick={() => handleExternalOAuthCallback(currentSession)}
                    className="auth-button primary"
                  >
                    Autoriser l'application {clientId}
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