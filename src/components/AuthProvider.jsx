'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return (
      <div className="auth-bg-gradient">
        <div className="auth-container-glass">
          <h1>Connexion à Abrège</h1>
          <div className="auth-subtitle">Accédez à votre espace collaboratif, vos notes et agents IA.<br/>Connexion sécurisée via Supabase.</div>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} theme="dark" />
        </div>
      </div>
    );
  }
  return children;
} 