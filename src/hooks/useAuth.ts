import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
// Temporairement désactivé pour éviter les erreurs
// import { logApi } from '@/utils/logger';

export interface User {
  id: string;
  email?: string;
  username?: string;
  user_metadata?: { [key: string]: unknown };
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

  // Fonction de déconnexion automatique en cas de problème d'authentification
  const forceSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setError('Session expirée. Veuillez vous reconnecter.');
    } catch (error) {
      // Erreur silencieuse
    }
  }, []);

  // Fonction pour vérifier et rafraîchir l'authentification
  const checkAndRefreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.access_token) {
        return false;
      }

      // Vérifier si le token est expiré
      const tokenExpiry = session.expires_at;
      if (tokenExpiry && new Date(tokenExpiry * 1000) < new Date()) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.access_token) {
          return false;
        }
        
        setUser(refreshData.session.user);
        return true;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  // Fonction pour récupérer le token d'authentification
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.access_token) {
        return null;
      }

      // Vérifier si le token est expiré
      const tokenExpiry = session.expires_at;
      if (tokenExpiry && new Date(tokenExpiry * 1000) < new Date()) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.access_token) {
          return null;
        }
        
        return refreshData.session.access_token;
      }
      
      return session.access_token;
    } catch (error) {
      return null;
    }
  }, []);

  useEffect(() => {
    let isInitialized = false;
    
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
        isInitialized = true;
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification SEULEMENT après l'initialisation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Éviter les déclenchements pendant l'initialisation
        if (!isInitialized) return;
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return { error: error.message };
      }

      return { user: data.user };
    } catch (error) {
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
        setError(error.message);
        return { error: error.message };
      }

      return { user: data.user };
    } catch (error) {
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
        setError('Erreur lors de la déconnexion');
      } else {
        setUser(null);
      }
    } catch (error) {
      setError('Erreur inattendue lors de la déconnexion');
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
    forceSignOut,
    checkAndRefreshAuth,
    getAccessToken, // Nouvelle méthode pour récupérer le token
    getFallbackUserId,
  };
} 