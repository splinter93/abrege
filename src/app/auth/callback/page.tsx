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

// ✅ Action IDs ChatGPT autorisées
const ALLOWED_ACTION_IDS = [
  'g-011f24575c8d3b9d5d69e124bafa1364ae3badf9',  // Action ID ChatGPT actuelle
  'g-369c00bd47b6f501275b414d19d5244ac411097b'   // Action ID ChatGPT alternative
];
const MAX_STATE_LEN = 512;

function isAllowedRedirect(uri: string) {
  try {
    const u = new URL(uri);
    const hostOk = ALLOWED_REDIRECT_HOSTS.some(
      (h) => u.hostname === h || u.hostname.endsWith(`.${h}`)
    );
    
    // ✅ Vérification plus souple pour les URLs ChatGPT
    if (u.hostname.includes('chat.openai.com') || u.hostname.includes('openai.com')) {
      console.log('✅ URL ChatGPT détectée, autorisation accordée');
      return true;
    }
    
    // ✅ Vérifier que l'action ID est autorisée (pour compatibilité)
    const actionIdOk = ALLOWED_ACTION_IDS.some(
      (actionId) => uri.includes(actionId)
    );
    
    return u.protocol === 'https:' && hostOk && actionIdOk;
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
    'notes:read', 'notes:write', 'notes:create', 'notes:update', 'notes:delete',
    'classeurs:read', 'classeurs:write', 'classeurs:create', 'classeurs:update', 'classeurs:delete',
    'dossiers:read', 'dossiers:write', 'dossiers:create', 'dossiers:update', 'dossiers:delete',
    'files:read', 'files:write', 'files:upload', 'files:delete',
    'agents:execute', 'agents:read',
    'search:content', 'profile:read'
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

  const json = await response.json().catch(() => ({} as Record<string, unknown>));
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

        // ✅ OPTIMISATION : Un seul flux OAuth externe unifié
        const oauthExternalParams = typeof window !== 'undefined'
          ? window.sessionStorage.getItem('oauth_external_params')
          : null;

        console.log('🔍 [Callback] Vérification flux OAuth externe:', {
          oauthExternalParams: oauthExternalParams ? 'PRÉSENT' : 'ABSENT',
          sessionStorage: typeof window !== 'undefined' ? {
            oauth_external_params: window.sessionStorage.getItem('oauth_external_params')
          } : 'N/A'
        });

        if (oauthExternalParams) {
          try {
            const params = JSON.parse(oauthExternalParams) as OAuthParams;
            console.log('🔍 [Callback] Paramètres OAuth ChatGPT récupérés:', params);
            
            // ✅ OPTIMISATION : Nettoyage immédiat après parsing
            window.sessionStorage.removeItem('oauth_external_params');

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

              // ✅ OPTIMISATION : Redirection immédiate sans délai
              window.location.href = redirect.toString();
              return;
            } catch (e) {
              console.error('❌ Erreur création code OAuth ChatGPT:', e);
              setError('Erreur lors de la création du code OAuth');
              setStatus('error');
              return;
            }
          } catch (e) {
            console.error('❌ Erreur parsing paramètres OAuth externes:', e);
            // ✅ OPTIMISATION : Nettoyage en cas d'erreur
            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem('oauth_external_params');
            }
            setError('Paramètres OAuth invalides');
            setStatus('error');
            return;
          }
        }

        // ✅ OPTIMISATION : Flux normal (pas de redirection vers /auth)
        console.log('🔍 [Callback] Flux normal, redirection vers home');
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