"use client";
import { useState, useEffect, ReactNode } from "react";
import { supabase } from "../supabaseClient";

import type { Session } from "@supabase/supabase-js";
import { useLanguageContext } from "../contexts/LanguageContext";
import { SimpleLoadingState } from './DossierLoadingStates';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguageContext();

  useEffect(() => {
    console.log('🔧 AuthProvider: Vérification de la session...');
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔧 AuthProvider: Session récupérée:', { session: !!session, error: error?.message });
      setSession(session);
      setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔧 AuthProvider: Changement d\'état auth:', event, { session: !!session });
      setSession(session);
      
      // ✅ CORRECTION : Rediriger vers la page d'accueil si déconnexion
      if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
        console.log('🔧 AuthProvider: Déconnexion détectée, redirection...');
        window.location.href = '/';
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // ✅ Pas de loader ici, le loader est géré par chaque page
  if (loading) {
    return null;
  }

  // ✅ CORRECTION : Si pas de session après chargement, rediriger
  if (!session && typeof window !== 'undefined') {
    console.log('🔧 AuthProvider: Pas de session, redirection vers la page d\'accueil');
    window.location.href = '/';
    return null;
  }

  return <>{children}</>;
} 