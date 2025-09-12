import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';
// Temporairement désactivé pour éviter les erreurs
// import { logApi } from '@/utils/logger';

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

  // Fonction de déconnexion automatique en cas de problème d'authentification
  const forceSignOut = useCallback(async () => {
    console.log('🔧 Auth: Déconnexion forcée suite à un problème d\'authentification');
    try {
      await supabase.auth.signOut();
      setUser(null);
      setError('Session expirée. Veuillez vous reconnecter.');
    } catch (error) {
      console.log('🔧 Auth: Erreur lors de la déconnexion forcée', error);
    }
  }, []);

  // Fonction pour vérifier et rafraîchir l'authentification
  const checkAndRefreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('🔧 Auth: Erreur lors de la vérification de session', { error: error.message });
        return false;
      }
      
      if (!session?.access_token) {
        console.log('🔧 Auth: Aucune session active');
        return false;
      }

      // Vérifier si le token est expiré
      const tokenExpiry = session.expires_at;
      if (tokenExpiry && new Date(tokenExpiry * 1000) < new Date()) {
        console.log('🔧 Auth: Token expiré, tentative de rafraîchissement');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.access_token) {
          console.log('🔧 Auth: Échec du rafraîchissement', { error: refreshError?.message });
          return false;
        }
        
        console.log('🔧 Auth: Token rafraîchi avec succès');
        setUser(refreshData.session.user);
        return true;
      }
      
      return true;
    } catch (error) {
      console.log('🔧 Auth: Erreur lors de la vérification d\'authentification', error);
      return false;
    }
  }, []);

  // Fonction pour récupérer le token d'authentification
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.access_token) {
        console.log('🔧 Auth: Impossible de récupérer le token', { error: error?.message });
        return null;
      }

      // Vérifier si le token est expiré
      const tokenExpiry = session.expires_at;
      if (tokenExpiry && new Date(tokenExpiry * 1000) < new Date()) {
        console.log('🔧 Auth: Token expiré, tentative de rafraîchissement');
        
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.access_token) {
          console.log('🔧 Auth: Échec du rafraîchissement du token', { error: refreshError?.message });
          return null;
        }
        
        console.log('🔧 Auth: Token rafraîchi avec succès');
        return refreshData.session.access_token;
      }
      
      return session.access_token;
    } catch (error) {
      console.log('🔧 Auth: Erreur lors de la récupération du token', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isInitialized = false;
    
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('🔧 Auth: Erreur récupération session', { error: error.message });
          setUser(null);
        } else if (session?.user) {
          console.log('🔧 Auth: Session utilisateur trouvée');
          setUser(session.user);
        } else {
          console.log('🔧 Auth: Aucune session utilisateur');
          setUser(null);
        }
      } catch (error) {
        console.log('🔧 Auth: Erreur inattendue lors de l\'initialisation de l\'authentification', error);
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
        
        console.log(`🔧 Auth: Changement d'état d'authentification: ${event}`);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔧 Auth: Session utilisateur trouvée');
          setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          console.log('🔧 Auth: Aucune session utilisateur');
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
        console.log('🔧 Auth: Erreur connexion', { error: error.message });
        setError(error.message);
        return { error: error.message };
      }

      console.log('🔧 Auth: Connexion réussie', { userId: data.user?.id });
      return { user: data.user };
    } catch (error) {
      console.log('🔧 Auth: Erreur inattendue lors de la connexion', { error });
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
        console.log('🔧 Auth: Erreur inscription', { error: error.message });
        setError(error.message);
        return { error: error.message };
      }

      console.log('🔧 Auth: Inscription réussie', { userId: data.user?.id });
      return { user: data.user };
    } catch (error) {
      console.log('🔧 Auth: Erreur inattendue lors de l\'inscription', { error });
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
        console.log('🔧 Auth: Erreur lors de la déconnexion', { error: error.message });
        setError('Erreur lors de la déconnexion');
      } else {
        console.log('🔧 Auth: Déconnexion réussie');
        setUser(null);
      }
    } catch (error) {
      console.log('🔧 Auth: Erreur inattendue lors de la déconnexion', error);
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