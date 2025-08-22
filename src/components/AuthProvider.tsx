"use client";
import { useState, useEffect, ReactNode } from "react";
import { supabase } from "../supabaseClient";

import type { Session } from "@supabase/supabase-js";
import { useLanguageContext } from "../contexts/LanguageContext";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const { t } = useLanguageContext();

  useEffect(() => {
    console.log('🔧 AuthProvider: Vérification de la session...');
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔧 AuthProvider: Session récupérée:', { session: !!session, error: error?.message });
      setSession(session);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔧 AuthProvider: Changement d\'état auth:', event, { session: !!session });
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    // Afficher un loader simple au lieu de rediriger
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        color: 'white'
      }}>
        <div>Chargement...</div>
      </div>
    );
  }
  return <>{children}</>;
} 