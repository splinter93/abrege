/**
 * 🎯 Hook pour le Polling Ciblé et Ponctuel
 * 
 * Principe : 1 Action UI = 1 Polling Ciblé = 1 Mise à jour UI
 */

import { useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { targetedPollingService, type OperationType } from '@/services/targetedPollingService';
import { simpleLogger as logger } from '@/utils/logger';

export interface UseTargetedPollingReturn {
  // Actions de polling ciblé
  pollNotes: (operation?: OperationType) => Promise<void>;
  pollFolders: (operation?: OperationType) => Promise<void>;
  pollClasseurs: (operation?: OperationType) => Promise<void>;
  pollAll: (operation?: OperationType) => Promise<void>;
  
  // État du service
  isPolling: boolean;
}

export function useTargetedPolling(): UseTargetedPollingReturn {
  const { user } = useAuth();

  // Initialiser le service avec le token utilisateur
  useEffect(() => {
    if (user?.id) {
      logger.dev('[useTargetedPolling] 🚀 Début initialisation service', { userId: user.id });
      
      // Récupérer le token d'authentification
      const initializeService = async () => {
        try {
          const { data: { session } } = await import('@/supabaseClient').then(m => m.supabase.auth.getSession());
          
          const token = session?.access_token;
          
          if (token) {
            targetedPollingService.initialize(token);
            logger.dev('[useTargetedPolling] ✅ Service initialisé avec token');
          } else {
            logger.warn('[useTargetedPolling] ⚠️ Pas de token disponible');
          }
        } catch (error) {
          logger.error('[useTargetedPolling] ❌ Erreur initialisation:', error);
        }
      };

      initializeService();
    } else {
      logger.dev('[useTargetedPolling] ⚠️ Pas d\'utilisateur connecté');
    }
  }, [user?.id]);

  // Polling ciblé pour les notes
  const pollNotes = useCallback(async (operation: OperationType = 'UPDATE'): Promise<void> => {
    try {
      await targetedPollingService.pollNotesOnce(operation);
    } catch (error) {
      logger.error('[useTargetedPolling] ❌ Erreur polling notes:', error);
    }
  }, []);

  // Polling ciblé pour les dossiers
  const pollFolders = useCallback(async (operation: OperationType = 'UPDATE'): Promise<void> => {
    try {
      await targetedPollingService.pollFoldersOnce(operation);
    } catch (error) {
      logger.error('[useTargetedPolling] ❌ Erreur polling dossiers:', error);
    }
  }, []);

  // Polling ciblé pour les classeurs
  const pollClasseurs = useCallback(async (operation: OperationType = 'UPDATE'): Promise<void> => {
    try {
      await targetedPollingService.pollClasseursOnce(operation);
    } catch (error) {
      logger.error('[useTargetedPolling] ❌ Erreur polling classeurs:', error);
    }
  }, []);

  // Polling ciblé pour tout
  const pollAll = useCallback(async (operation: OperationType = 'UPDATE'): Promise<void> => {
    try {
      await targetedPollingService.pollAllOnce(operation);
    } catch (error) {
      logger.error('[useTargetedPolling] ❌ Erreur polling complet:', error);
    }
  }, []);

  return {
    pollNotes,
    pollFolders,
    pollClasseurs,
    pollAll,
    isPolling: targetedPollingService.isCurrentlyPolling()
  };
}
