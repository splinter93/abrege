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

  const getSession = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.log('🔧 Auth: Erreur récupération session', { error: error.message });
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        console.log('🔧 Auth: Session utilisateur trouvée');
        setUser(session.user);
      } else {
        console.log('🔧 Auth: Aucune session utilisateur');
        setUser(null);
      }
    } catch (error) {
      console.log('🔧 Auth: Erreur inattendue lors de la récupération de session', error);
      setUser(null);
    } finally {
      setLoading(false);
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
      
      return session.access_token;
    } catch (error) {
      console.log('🔧 Auth: Erreur lors de la récupération du token', error);
      return null;
    }
  }, []);

  useEffect(() => {
    getSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
        console.log('🔧 Auth: Erreur déconnexion', { error: error.message });
        setError(error.message);
        return { error: error.message };
      }

      console.log('🔧 Auth: Déconnexion réussie');
      return { success: true };
    } catch (error) {
      console.log('🔧 Auth: Erreur inattendue lors de la déconnexion', { error });
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
    getAccessToken, // Nouvelle méthode pour récupérer le token
  };
} 