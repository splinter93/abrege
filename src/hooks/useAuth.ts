import { useState, useEffect } from 'react';
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
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Récupérer la session actuelle
    const getCurrentSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logApi('auth', 'Erreur récupération session', { error: error.message });
          setAuthState({
            user: null,
            loading: false,
            error: error.message,
          });
          return;
        }

        if (session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || undefined,
            username: session.user.user_metadata?.username || undefined,
          };
          
          logApi('auth', 'Session utilisateur trouvée', { userId: user.id });
          setAuthState({
            user,
            loading: false,
            error: null,
          });
        } else {
          logApi('auth', 'Aucune session utilisateur');
          setAuthState({
            user: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        logApi('auth', 'Erreur inattendue lors de la récupération de session', { error });
        setAuthState({
          user: null,
          loading: false,
          error: 'Erreur inattendue',
        });
      }
    };

    getCurrentSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logApi('auth', `Changement d'état d'authentification: ${event}`);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || undefined,
            username: session.user.user_metadata?.username || undefined,
          };
          
          setAuthState({
            user,
            loading: false,
            error: null,
          });
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            loading: false,
            error: null,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logApi('auth', 'Erreur connexion', { error: error.message });
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { error: error.message };
      }

      logApi('auth', 'Connexion réussie', { userId: data.user?.id });
      return { user: data.user };
    } catch (error) {
      logApi('auth', 'Erreur inattendue lors de la connexion', { error });
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Erreur inattendue',
      }));
      return { error: 'Erreur inattendue' };
    }
  };

  const signUp = async (email: string, password: string, username?: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    
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
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
        }));
        return { error: error.message };
      }

      logApi('auth', 'Inscription réussie', { userId: data.user?.id });
      return { user: data.user };
    } catch (error) {
      logApi('auth', 'Erreur inattendue lors de l\'inscription', { error });
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Erreur inattendue',
      }));
      return { error: 'Erreur inattendue' };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        logApi('auth', 'Erreur déconnexion', { error: error.message });
        return { error: error.message };
      }

      logApi('auth', 'Déconnexion réussie');
      return { success: true };
    } catch (error) {
      logApi('auth', 'Erreur inattendue lors de la déconnexion', { error });
      return { error: 'Erreur inattendue' };
    }
  };

  const getFallbackUserId = (): string | null => {
    // Utiliser une variable d'environnement pour le fallback
    return process.env.NEXT_PUBLIC_FALLBACK_USER_ID || null;
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
    getFallbackUserId,
  };
} 