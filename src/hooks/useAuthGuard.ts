/**
 * Hook centralisé pour la gestion de l'authentification
 * Simplifie les vérifications répétitives dans les composants
 */

import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { simpleLogger as logger } from '@/utils/logger';

interface AuthGuardReturn {
  /** Vérifie si l'utilisateur est authentifié */
  requireAuth: () => boolean;
  /** Utilisateur actuel */
  user: { id: string; email?: string } | null;
  /** État de chargement */
  loading: boolean;
  /** Booléen indiquant si l'utilisateur est authentifié */
  isAuthenticated: boolean;
}

/**
 * Hook pour gérer l'authentification de manière centralisée
 * 
 * @example
 * ```typescript
 * const { requireAuth, user, isAuthenticated } = useAuthGuard();
 * 
 * const handleAction = useCallback(() => {
 *   if (!requireAuth()) return;
 *   // Action sécurisée
 * }, [requireAuth]);
 * ```
 */
export function useAuthGuard(): AuthGuardReturn {
  const { user, loading: authLoading } = useAuth();

  const requireAuth = useCallback((): boolean => {
    if (authLoading) {
      logger.dev('[useAuthGuard] ⏳ Vérification de l\'authentification en cours...');
      return false;
    }
    
    if (!user) {
      logger.warn('[useAuthGuard] ⚠️ Utilisateur non authentifié');
      return false;
    }
    
    return true;
  }, [user, authLoading]);

  return {
    requireAuth,
    user,
    loading: authLoading,
    isAuthenticated: !!user && !authLoading
  };
}

