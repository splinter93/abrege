'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import LogoHeader from '@/components/LogoHeader';
import './callback.css';

function AuthCallbackContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Fonction pour créer un code OAuth ChatGPT
  const createChatGPTOAuthCode = async (
    userId: string,
    params: { client_id: string; redirect_uri: string; scope?: string; state?: string }
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/create-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: params.client_id,
          userId: userId,
          redirectUri: params.redirect_uri,
          scopes: params.scope ? params.scope.split(' ') : [],
          state: params.state,
        }),
      });

      if (!response.ok) {
        console.error('❌ Erreur création code OAuth:', response.status);
        return null;
      }

      const { code } = await response.json();
      console.log('✅ Code OAuth ChatGPT créé:', code);
      return code;
    } catch (error) {
      console.error('❌ Erreur création code OAuth ChatGPT:', error);
      return null;
    }
  };

  useEffect(() => {
    const error = searchParams?.get('error');
    if (error) {
      setError(`Erreur OAuth: ${error}`);
      setStatus('error');
      return;
    }

    // Ici on ne traite plus le `code` directement → Supabase s’en occupe déjà
    const checkSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !data.session) {
          console.error('❌ Pas de session Supabase trouvée:', sessionError);
          setError('Impossible de récupérer la session');
          setStatus('error');
          return;
        }

        const session = data.session;
        setStatus('success');

        // Vérifier si flux OAuth externe classique
        const oauthParams = sessionStorage.getItem('oauth_external_params');
        if (oauthParams) {
          try {
            const params = JSON.parse(oauthParams);
            console.log('🔍 Flux OAuth externe détecté, redirection vers /auth avec paramètres');
            sessionStorage.removeItem('oauth_external_params');

            const authUrl = `/auth?${new URLSearchParams(params).toString()}`;
            router.push(authUrl);
            return;
          } catch (err) {
            console.error('Erreur parsing paramètres OAuth externes:', err);
          }
        }

        // Vérifier si flux ChatGPT
        const isChatGPTFlow = sessionStorage.getItem('chatgpt_oauth_flow') === 'true';
        if (isChatGPTFlow) {
          console.log('🤖 Flux ChatGPT détecté, récupération des paramètres OAuth...');
          const oauthParams = sessionStorage.getItem('chatgpt_oauth_params');
          if (!oauthParams) {
            console.error('❌ Paramètres OAuth ChatGPT manquants');
            router.push('/');
            return;
          }

          const params = JSON.parse(oauthParams);
          sessionStorage.removeItem('chatgpt_oauth_flow');
          sessionStorage.removeItem('chatgpt_oauth_params');

          // Créer un code OAuth pour ChatGPT
          createChatGPTOAuthCode(session.user.id, params).then((code) => {
            if (code) {
              const redirectUrl = `${params.redirect_uri}?code=${code}&state=${params.state || 'success'}`;
              console.log('🔄 Redirection vers ChatGPT avec le code OAuth:', code);
              console.log('🔗 URL de redirection:', redirectUrl);
              window.location.href = redirectUrl;
            } else {
              console.error('❌ Erreur création code OAuth ChatGPT');
              router.push('/');
            }
          });
          return;
        }

        // Sinon, login classique → redirection home
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } catch (err) {
        console.error('Erreur inattendue lors de la récupération session:', err);
        setError('Erreur inattendue lors de la récupération session');
        setStatus('error');
      }
    };

    checkSession();
  }, [searchParams, router]);

  return (
    <div className="auth-callback-content">
      {status === 'loading' && (
        <>
          <div className="loading-spinner-large" />
          <p className="auth-callback-message">
            Finalisation de votre connexion...
          </p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="auth-callback-message success">
            Connexion réussie ! Redirection en cours...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="error-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="auth-callback-message error">
            {error}
          </p>
          <button 
            onClick={() => router.push('/auth')}
            className="auth-callback-button"
          >
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