"use client";
import { useState, useEffect, useRef, ReactNode } from "react";
import { supabase } from "../supabaseClient";

import type { Session } from "@supabase/supabase-js";
import { useLanguageContext } from "../contexts/LanguageContext";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguageContext();
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mountedRef.current) {
        setSession(session);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mountedRef.current) setSession(session);
      if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // ✅ Pas de loader ici, le loader est géré par chaque page
  if (loading) {
    return null;
  }

  if (!session && typeof window !== 'undefined') {
    window.location.href = '/';
    return null;
  }

  return <>{children}</>;
} 