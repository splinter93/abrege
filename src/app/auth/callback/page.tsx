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

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('loading');
        
        // Récupérer les paramètres de l'URL
        if (!searchParams) {
          setError('Paramètres de recherche manquants');
          setStatus('error');
          return;
        }
        
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setError(errorDescription || 'Erreur lors de l\'authentification');
          setStatus('error');
          return;
        }

        if (!code) {
          setError('Vous êtes arrivé sur cette page sans passer par l\'authentification. Retournez à la page de connexion.');
          setStatus('error');
          return;
        }

        // Échanger le code contre une session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (exchangeError) {
          console.error('Session exchange error:', exchangeError);
          setError('Erreur lors de l\'échange de session');
          setStatus('error');
          return;
        }

        if (data.session) {
          setStatus('success');
          
          // Vérifier si c'est un flux OAuth externe (paramètres stockés en sessionStorage)
          const oauthParams = sessionStorage.getItem('oauth_external_params');
          
          if (oauthParams) {
            try {
              const params = JSON.parse(oauthParams);
              console.log('🔍 Flux OAuth externe détecté, redirection vers /auth avec paramètres');
              
              // Nettoyer les paramètres stockés
              sessionStorage.removeItem('oauth_external_params');
              
              // Rediriger vers la page d'auth avec les paramètres OAuth
              const authUrl = `/auth?${new URLSearchParams(params).toString()}`;
              router.push(authUrl);
              return;
            } catch (err) {
              console.error('Erreur parsing paramètres OAuth:', err);
            }
          }
          
          // Si pas de flux OAuth externe, redirection normale
          setTimeout(() => {
            router.push('/');
          }, 1500);
        } else {
          setError('Aucune session créée');
          setStatus('error');
        }

      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Erreur inattendue');
        setStatus('error');
      }
    };

    handleAuthCallback();
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