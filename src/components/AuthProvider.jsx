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
          <div className="auth-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <svg width="44" height="44" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent-hover)" />
                  <stop offset="100%" stopColor="var(--accent-primary)" />
                </linearGradient>
              </defs>
              <rect width="16" height="16" rx="4" fill="url(#logoGradient)" />
              <path d="M11.33 4.67L4.67 11.33M4.67 7.33v4h4" stroke="var(--bg-main)" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="auth-title">Welcome Home.</h1>
          <div className="auth-subtitle">Connect to access your Abrège Workspace</div>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} theme="dark" />
        </div>
      </div>
    );
  }
  return children;
} 