'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import LogoHeader from '@/components/LogoHeader';
import './callback.css';

type OAuthParams = {
  client_id: string;
  redirect_uri: string;
  scope?: string; // espace-OU-virgule séparé (on tolère les deux)
  state?: string;
};

const ALLOWED_REDIRECT_HOSTS = ['chat.openai.com', 'openai.com', 'chatgpt.com'];
const MAX_STATE_LEN = 512;

function isAllowedRedirect(uri: string) {
  try {
    const u = new URL(uri);
    const hostOk = ALLOWED_REDIRECT_HOSTS.some(
      (h) => u.hostname === h || u.hostname.endsWith(`.${h}`)
    );
    return u.protocol === 'https:' && hostOk;
  } catch {
    return false;
  }
}

function sanitizeState(s?: string) {
  if (!s) return 'success';
  const trimmed = s.trim();
  return trimmed.length > MAX_STATE_LEN ? trimmed.slice(0, MAX_STATE_LEN) : trimmed;
}

async function createChatGPTOAuthCode(userId: string, params: OAuthParams): Promise<string> {
  // Filtrer les scopes pour ne garder que ceux autorisés
  const allowedScopes = [
    'notes:read', 'notes:write', 
    'dossiers:read', 'dossiers:write', 
    'classeurs:read', 'classeurs:write'
  ];
  
  const scopes = params.scope
    ? params.scope.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
    : [];
  
  // Filtrer pour ne garder que les scopes autorisés
  const validScopes = scopes.filter(scope => allowedScopes.includes(scope));
  
  // Log des scopes pour debug
  console.log('🔍 [OAuth] Scopes demandés:', scopes);
  console.log('🔍 [OAuth] Scopes autorisés:', validScopes);
  console.log('🔍 [OAuth] Scopes rejetés:', scopes.filter(scope => !allowedScopes.includes(scope)));
  
  if (validScopes.length === 0) {
    console.warn('⚠️ [OAuth] Aucun scope valide, utilisation des scopes par défaut');
    validScopes.push('notes:read'); // Scope minimal par défaut
  }

  // ✅ RÉCUPÉRER LE TOKEN D'AUTHENTIFICATION
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Token d\'authentification manquant');
  }

  const response = await fetch('/api/auth/create-code', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}` // ✅ Token d'authentification ajouté
    },
    body: JSON.stringify({
      clientId: params.client_id,
      userId,
      redirectUri: params.redirect_uri,
      scopes: validScopes,
      state: sanitizeState(params.state),
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`create-code failed: ${response.status} ${text}`);
  }

  const json = await response.json().catch(() => ({} as any));
  const code = json?.code as string | undefined;
  if (!code) throw new Error('No code returned by /api/auth/create-code');
  return code;
}

function AuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const didRunRef = useRef(false);
  const abortRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    const err = searchParams?.get('error');
    const errDesc = searchParams?.get('error_description');
    if (err) {
      setError(`Erreur OAuth: ${err}${errDesc ? ` – ${decodeURIComponent(errDesc)}` : ''}`);
      setStatus('error');
      return;
    }

    const checkSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (abortRef.current) return;

        if (sessionError || !data?.session) {
          console.error('❌ Pas de session Supabase:', sessionError);
          setError('Impossible de récupérer la session');
          setStatus('error');
          return;
        }

        setStatus('success');

        // 1) Flux OAuth externe classique → /auth
        const oauthExternalParams =
          typeof window !== 'undefined'
            ? window.sessionStorage.getItem('oauth_external_params')
            : null;

        if (oauthExternalParams) {
          try {
            const params = JSON.parse(oauthExternalParams);
            window.sessionStorage.removeItem('oauth_external_params');
            const authUrl = `/auth?${new URLSearchParams(params).toString()}`;
            router.push(authUrl);
            return;
          } catch (e) {
            console.error('Erreur parsing paramètres OAuth externes:', e);
          }
        }

        // 2) Flux ChatGPT personnalisé
        const isChatGPTFlow =
          typeof window !== 'undefined'
            ? window.sessionStorage.getItem('chatgpt_oauth_flow') === 'true'
            : false;

        console.log('🔍 [Callback] Vérification flux ChatGPT:', {
          isChatGPTFlow,
          sessionStorage: typeof window !== 'undefined' ? {
            chatgpt_oauth_flow: window.sessionStorage.getItem('chatgpt_oauth_flow'),
            chatgpt_oauth_params: window.sessionStorage.getItem('chatgpt_oauth_params')
          } : 'N/A'
        });

        if (isChatGPTFlow) {
          const raw = window.sessionStorage.getItem('chatgpt_oauth_params');
          
          console.log('🔍 [Callback] Paramètres OAuth ChatGPT récupérés:', raw);

          if (!raw) {
            console.error('❌ Paramètres OAuth ChatGPT manquants');
            // ✅ CORRECTION : Rediriger vers la page d'auth avec les paramètres OAuth
            const searchParams = new URLSearchParams(window.location.search);
            const oauthParams = {
              client_id: searchParams.get('oauth_client_id'),
              redirect_uri: searchParams.get('oauth_redirect_uri'),
              scope: searchParams.get('oauth_scope'),
              state: searchParams.get('state')?.replace('chatgpt_', ''),
              response_type: searchParams.get('oauth_response_type')
            };
            
            if (oauthParams.client_id && oauthParams.redirect_uri) {
              console.log('🔍 [Callback] Tentative de récupération depuis URL:', oauthParams);
              // ✅ CORRECTION : Créer un objet avec des types stricts
              const filteredParams: Record<string, string> = {};
              if (oauthParams.client_id) filteredParams.client_id = oauthParams.client_id;
              if (oauthParams.redirect_uri) filteredParams.redirect_uri = oauthParams.redirect_uri;
              if (oauthParams.scope) filteredParams.scope = oauthParams.scope;
              if (oauthParams.state) filteredParams.state = oauthParams.state;
              if (oauthParams.response_type) filteredParams.response_type = oauthParams.response_type;
              
              const authUrl = `/auth?${new URLSearchParams(filteredParams).toString()}`;
              router.push(authUrl);
              return;
            }
            
            console.error('❌ Aucun paramètre OAuth trouvé, redirection vers home');
            router.push('/');
            return;
          }

          let params: OAuthParams;
          try {
            params = JSON.parse(raw) as OAuthParams;
            console.log('🔍 [Callback] Paramètres OAuth ChatGPT parsés:', params);
          } catch {
            console.error('❌ Paramètres OAuth ChatGPT invalides (JSON)');
            router.push('/');
            return;
          }
          
          // ✅ CORRECTION : Nettoyage APRÈS avoir utilisé les paramètres
          window.sessionStorage.removeItem('chatgpt_oauth_flow');
          window.sessionStorage.removeItem('chatgpt_oauth_params');

          if (!isAllowedRedirect(params.redirect_uri)) {
            console.error('❌ redirect_uri non autorisée:', params.redirect_uri);
            setError('redirect_uri non autorisée');
            setStatus('error');
            return;
          }

          try {
            console.log('🔍 [Callback] Création du code OAuth ChatGPT pour utilisateur:', data.session.user.id);
            const code = await createChatGPTOAuthCode(data.session.user.id, params);
            if (abortRef.current) return;

            console.log('🔍 [Callback] Code OAuth créé avec succès:', code);

            const redirect = new URL(params.redirect_uri);
            redirect.searchParams.set('code', code);
            redirect.searchParams.set('state', sanitizeState(params.state));

            console.log('🔍 [Callback] URL de redirection construite:', redirect.toString());
            console.log('🔍 [Callback] Redirection vers ChatGPT...');

            // ✅ CORRECTION : Ajouter un délai pour laisser l'UI se mettre à jour
            setTimeout(() => {
              window.location.href = redirect.toString();
            }, 1000);
          } catch (e) {
            console.error('❌ Erreur création code OAuth ChatGPT:', e);
            setError('Erreur lors de la création du code OAuth');
            setStatus('error');
          }
          return;
        }

        // 3) Login classique → home
        const t = setTimeout(() => router.push('/'), 900);
        return () => clearTimeout(t);
      } catch (e) {
        if (abortRef.current) return;
        console.error('Erreur inattendue lors de la récupération session:', e);
        setError('Erreur inattendue lors de la récupération session');
        setStatus('error');
      }
    };

    checkSession();
    return () => {
      abortRef.current = true;
    };
  }, [searchParams, router]);

  return (
    <div className="auth-callback-content" role="status" aria-live="polite">
      {status === 'loading' && (
        <>
          <div className="loading-spinner-large" aria-hidden="true" />
          <p className="auth-callback-message">Finalisation de votre connexion...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="auth-callback-message success">Connexion réussie ! Redirection en cours...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="error-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="auth-callback-message error">{error}</p>
          <button onClick={() => router.push('/auth')} className="auth-callback-button">
            Retour à la connexion
          </button>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="auth-callback-layout">
      <LogoHeader />
      <div className="auth-callback-container">
        <Suspense fallback={<div>Chargement...</div>}>
          <AuthCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}