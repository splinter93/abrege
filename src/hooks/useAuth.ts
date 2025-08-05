import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
import { logApi } from '@/utils/logger';

export interface User {
  id: string;
  email?: string;
  username?: string;
  user_metadata?: { [key: string]: any };
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSession = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        logApi('auth', 'Erreur récupération session', { error: error.message });
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        logApi('auth', 'Session utilisateur trouvée');
        setUser(session.user);
      } else {
        logApi('auth', 'Aucune session utilisateur');
        setUser(null);
      }
    } catch (error) {
      logApi('auth', 'Erreur inattendue lors de la récupération de session');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logApi('auth', `Changement d'état d'authentification: ${event}`);
        
        if (event === 'SIGNED_IN' && session?.user) {
          logApi('auth', 'Session utilisateur trouvée');
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          logApi('auth', 'Aucune session utilisateur');
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [getSession]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logApi('auth', 'Erreur connexion', { error: error.message });
        setError(error.message);
        return { error: error.message };
      }

      logApi('auth', 'Connexion réussie', { userId: data.user?.id });
      return { user: data.user };
    } catch (error) {
      logApi('auth', 'Erreur inattendue lors de la connexion', { error });
      setError('Erreur inattendue');
      return { error: 'Erreur inattendue' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) {
        logApi('auth', 'Erreur inscription', { error: error.message });
        setError(error.message);
        return { error: error.message };
      }

      logApi('auth', 'Inscription réussie', { userId: data.user?.id });
      return { user: data.user };
    } catch (error) {
      logApi('auth', 'Erreur inattendue lors de l\'inscription', { error });
      setError('Erreur inattendue');
      return { error: 'Erreur inattendue' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logApi('auth', 'Erreur déconnexion', { error: error.message });
        setError(error.message);
        return { error: error.message };
      }

      logApi('auth', 'Déconnexion réussie');
      return { success: true };
    } catch (error) {
      logApi('auth', 'Erreur inattendue lors de la déconnexion', { error });
      setError('Erreur inattendue');
      return { error: 'Erreur inattendue' };
    } finally {
      setLoading(false);
    }
  };

  const getFallbackUserId = (): string | null => {
    // Utiliser une variable d'environnement pour le fallback
    return process.env.NEXT_PUBLIC_FALLBACK_USER_ID || null;
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    getFallbackUserId,
  };
} 