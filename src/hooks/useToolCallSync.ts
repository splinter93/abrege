import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { toolCallSyncService } from '@/services/toolCallSyncService';
import { simpleLogger as logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';

interface UseToolCallSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  onToolCallsSynced?: (toolCalls: any[], toolResults: any[]) => void;
}

/**
 * Hook de synchronisation des tool calls depuis la base de données
 * Ne modifie PAS la logique d'exécution LLM existante
 */
export function useToolCallSync(options: UseToolCallSyncOptions = {}) {
  const { autoSync = true, syncInterval = 2000, onToolCallsSynced } = options;
  const { currentSession } = useChatStore();
  const { user, loading: authLoading } = useAuth();
  const syncRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<{ toolCalls: number; toolResults: number }>({ toolCalls: 0, toolResults: 0 });

  /**
   * 🔄 Synchroniser manuellement les tool calls depuis la DB
   * Cette méthode ne modifie PAS l'exécution LLM
   */
  const syncToolCalls = useCallback(async () => {
    if (!currentSession?.id || !user) {
      logger.dev('[useToolCallSync] ⏳ Pas de session active ou utilisateur non connecté');
      return { success: false, error: 'Session ou utilisateur non disponible' };
    }

    try {
      logger.dev('[useToolCallSync] 🔄 Synchronisation manuelle des tool calls...');
      
      // Récupérer le token d'authentification
      const { data: { session } } = await import('@/supabaseClient').then(m => m.supabase.auth.getSession());
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Token d\'authentification non disponible');
      }

      const result = await toolCallSyncService.syncToolCallsFromDB(currentSession.id, token);
      
      if (result.success) {
        const hasNewData = (result.toolCalls?.length ?? 0) > lastSyncRef.current.toolCalls ||
                          (result.toolResults?.length ?? 0) > lastSyncRef.current.toolResults;
        
        if (hasNewData) {
          logger.dev('[useToolCallSync] ✅ Nouvelles données synchronisées:', {
            toolCalls: result.toolCalls?.length ?? 0,
            toolResults: result.toolResults?.length ?? 0
          });
          
          // Mettre à jour la référence
          lastSyncRef.current = {
            toolCalls: result.toolCalls?.length ?? 0,
            toolResults: result.toolResults?.length ?? 0
          };
          
          // Notifier le composant parent
          if (onToolCallsSynced && result.toolCalls && result.toolResults) {
            onToolCallsSynced(result.toolCalls, result.toolResults);
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('[useToolCallSync] ❌ Erreur synchronisation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }, [currentSession?.id, user, onToolCallsSynced]);

  /**
   * 🚀 Démarrer la synchronisation automatique
   * Cette méthode s'exécute en arrière-plan sans interférer avec l'exécution LLM
   */
  const startAutoSync = useCallback(() => {
    if (!currentSession?.id || !user) {
      logger.dev('[useToolCallSync] ⏳ Pas de session active, synchronisation automatique ignorée');
      return;
    }

    logger.dev('[useToolCallSync] 🚀 Démarrage synchronisation automatique...');
    
    // Arrêter la synchronisation précédente si elle existe
    if (syncRef.current) {
      clearInterval(syncRef.current);
    }

    // Démarrer la nouvelle synchronisation
    syncRef.current = setInterval(async () => {
      try {
        await syncToolCalls();
      } catch (error) {
        logger.warn('[useToolCallSync] ⚠️ Erreur synchronisation automatique:', error);
      }
    }, syncInterval);
  }, [currentSession?.id, user, syncToolCalls, syncInterval]);

  /**
   * 🛑 Arrêter la synchronisation automatique
   */
  const stopAutoSync = useCallback(() => {
    if (syncRef.current) {
      clearInterval(syncRef.current);
      syncRef.current = null;
      logger.dev('[useToolCallSync] 🛑 Synchronisation automatique arrêtée');
    }
  }, []);

  /**
   * 🔍 Vérifier s'il y a des données en attente de synchronisation
   */
  const checkPendingSync = useCallback(async (): Promise<boolean> => {
    if (!currentSession?.id || !user) {
      return false;
    }

    try {
      const { data: { session } } = await import('@/supabaseClient').then(m => m.supabase.auth.getSession());
      const token = session?.access_token;
      
      if (!token) {
        return false;
      }

      return await toolCallSyncService.checkPendingSync(currentSession.id, token);
    } catch (error) {
      logger.warn('[useToolCallSync] ⚠️ Erreur vérification synchronisation:', error);
      return false;
    }
  }, [currentSession?.id, user]);

  // Effet pour démarrer/arrêter la synchronisation automatique
  useEffect(() => {
    if (autoSync && currentSession?.id && user) {
      startAutoSync();
    } else {
      stopAutoSync();
    }

    // Cleanup à la destruction du composant
    return () => {
      stopAutoSync();
    };
  }, [autoSync, currentSession?.id, user, startAutoSync, stopAutoSync]);

  // Effet pour réinitialiser la référence lors du changement de session
  useEffect(() => {
    if (currentSession?.id) {
      lastSyncRef.current = { toolCalls: 0, toolResults: 0 };
    }
  }, [currentSession?.id]);

  return {
    syncToolCalls,
    startAutoSync,
    stopAutoSync,
    checkPendingSync,
    isAutoSyncing: !!syncRef.current
  };
} 