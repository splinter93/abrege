'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/supabaseClient';

export default function AuthEntryPage() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    // Vérifier que les search params sont disponibles
    if (!sp) {
      console.error('❌ Search params non disponibles');
      router.replace('/auth/error?reason=no_search_params');
      return;
    }

    // 1) Récupère les params envoyés par ChatGPT (et éventuellement par ton flux externe)
    const client_id = sp.get('client_id') ?? '';
    const redirect_uri = sp.get('redirect_uri') ?? '';
    const scope = sp.get('scope') ?? '';
    const state = sp.get('state') ?? '';
    const response_type = sp.get('response_type') ?? 'code';

    console.log('🔐 [Auth Entry] Paramètres OAuth reçus:', {
      client_id,
      redirect_uri,
      scope,
      state,
      response_type
    });

    // Sanity checks minimales
    if (!client_id || !redirect_uri || response_type !== 'code') {
      console.error('❌ Paramètres OAuth init manquants/invalides', { 
        client_id, 
        redirect_uri, 
        response_type 
      });
      router.replace('/auth/error?reason=invalid_init_params');
      return;
    }

    // 2) Stocke les paramètres pour la callback (clé !
    //    sans ça, AuthCallback n'aura pas le contexte "flux ChatGPT")
    try {
      sessionStorage.setItem('chatgpt_oauth_flow', 'true');
      sessionStorage.setItem(
        'chatgpt_oauth_params',
        JSON.stringify({ client_id, redirect_uri, scope, state })
      );
      
      console.log('✅ [Auth Entry] Paramètres stockés en sessionStorage:', {
        chatgpt_oauth_flow: sessionStorage.getItem('chatgpt_oauth_flow'),
        chatgpt_oauth_params: sessionStorage.getItem('chatgpt_oauth_params')
      });
    } catch (e) {
      console.error('❌ SessionStorage indisponible', e);
      router.replace('/auth/error?reason=session_storage_unavailable');
      return;
    }

    // 3) Déclenche le sign-in Google via Supabase,
    //    et assure-toi que redirectTo == https://www.scrivia.app/auth/callback
    //    (même sous-domaine que la page callback !)
    const host = typeof window !== 'undefined' ? window.location.origin : 'https://www.scrivia.app';
    const redirectTo = `${host}/auth/callback`;

    console.log('🚀 [Auth Entry] Déclenchement sign-in Google vers:', redirectTo);

    supabase.auth
      .signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // prompt "consent" force l'écran Google si nécessaire
          queryParams: { prompt: 'consent', access_type: 'offline' },
        },
      })
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Erreur signInWithOAuth:', error);
          router.replace('/auth/error?reason=sign_in_failed');
        } else {
          console.log('✅ [Auth Entry] Sign-in Google initié avec succès:', data);
        }
      })
      .catch((e) => {
        console.error('❌ Erreur signInWithOAuth (catch):', e);
        router.replace('/auth/error?reason=sign_in_failed');
      });
  }, [router, sp]);

  return (
    <div style={{ 
      padding: 24, 
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <h2>🔐 Authentification en cours...</h2>
      <p>Redirection vers le fournisseur d'authentification Google...</p>
      <div style={{ 
        marginTop: 20,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        fontSize: '14px',
        color: '#666'
      }}>
        <p>Si la redirection ne se fait pas automatiquement, vérifiez que :</p>
        <ul style={{ textAlign: 'left', display: 'inline-block' }}>
          <li>Les cookies sont activés</li>
          <li>Les popups ne sont pas bloqués</li>
          <li>Vous êtes sur le bon domaine</li>
        </ul>
      </div>
    </div>
  );
} 