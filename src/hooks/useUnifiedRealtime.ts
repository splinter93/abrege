/**
 * 🔄 Hook Unifié pour le Realtime
 * 
 * Ce hook remplace tous les anciens hooks de realtime avec une interface simple
 * et une gestion automatique de l'initialisation.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  initializeUnifiedRealtime, 
  getUnifiedRealtimeStatus, 
  stopUnifiedRealtimeService,
  triggerUnifiedRealtimePolling,
  type EntityType,
  type OperationType
} from '@/services/unifiedRealtimeService';

export interface UseUnifiedRealtimeOptions {
  autoInitialize?: boolean;
  debug?: boolean;
}

export interface UseUnifiedRealtimeReturn {
  // Statut du service
  isConnected: boolean;
  provider: 'realtime' | 'polling' | 'none';
  status: ReturnType<typeof getUnifiedRealtimeStatus>;
  
  // Actions
  initialize: () => Promise<boolean>;
  stop: () => void;
  triggerPolling: (entityType: EntityType, operation: OperationType) => Promise<void>;
  
  // État de chargement
  isLoading: boolean;
  error: string | null;
}

export function useUnifiedRealtime(options: UseUnifiedRealtimeOptions = {}): UseUnifiedRealtimeReturn {
  const { autoInitialize = true, debug = false } = options;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(getUnifiedRealtimeStatus());

  // Initialiser le service
  const initialize = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('Utilisateur non authentifié');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await initializeUnifiedRealtime({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        userId: user.id,
        debug: debug || process.env.NODE_ENV === 'development'
      });

      if (success) {
        setStatus(getUnifiedRealtimeStatus());
        if (debug) {
          console.log('[useUnifiedRealtime] ✅ Service initialisé avec succès');
        }
      } else {
        setError('Échec de l\'initialisation du service realtime');
      }

      return success;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur d'initialisation: ${errorMessage}`);
      if (debug) {
        console.error('[useUnifiedRealtime] ❌ Erreur d\'initialisation:', err);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, debug]);

  // Arrêter le service
  const stop = useCallback(() => {
    stopUnifiedRealtimeService();
    setStatus(getUnifiedRealtimeStatus());
    if (debug) {
      console.log('[useUnifiedRealtime] 🛑 Service arrêté');
    }
  }, [debug]);

  // Déclencher un polling immédiat
  const triggerPolling = useCallback(async (entityType: EntityType, operation: OperationType): Promise<void> => {
    try {
      await triggerUnifiedRealtimePolling(entityType, operation);
      if (debug) {
        console.log(`[useUnifiedRealtime] 🔄 Polling déclenché: ${entityType}.${operation}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur de polling: ${errorMessage}`);
      if (debug) {
        console.error('[useUnifiedRealtime] ❌ Erreur de polling:', err);
      }
    }
  }, [debug]);

  // Auto-initialisation
  useEffect(() => {
    if (autoInitialize && user?.id) {
      initialize();
    }
  }, [autoInitialize, user?.id, initialize]);

  // Surveillance du statut
  useEffect(() => {
    if (!user?.id) return;

    const statusInterval = setInterval(() => {
      setStatus(getUnifiedRealtimeStatus());
    }, 1000);

    return () => clearInterval(statusInterval);
  }, [user?.id]);

  // Cleanup à la destruction du composant
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isConnected: status.isConnected,
    provider: status.provider,
    status,
    initialize,
    stop,
    triggerPolling,
    isLoading,
    error
  };
}

// Hook spécialisé pour les notes
export function useNotesRealtime(options: UseUnifiedRealtimeOptions = {}) {
  const realtime = useUnifiedRealtime(options);
  
  const triggerNotesPolling = useCallback(async (operation: OperationType) => {
    await realtime.triggerPolling('notes', operation);
  }, [realtime]);

  return {
    ...realtime,
    triggerNotesPolling
  };
}

// Hook spécialisé pour les dossiers
export function useFoldersRealtime(options: UseUnifiedRealtimeOptions = {}) {
  const realtime = useUnifiedRealtime(options);
  
  const triggerFoldersPolling = useCallback(async (operation: OperationType) => {
    await realtime.triggerPolling('folders', operation);
  }, [realtime]);

  return {
    ...realtime,
    triggerFoldersPolling
  };
}

// Hook spécialisé pour les classeurs
export function useClasseursRealtime(options: UseUnifiedRealtimeOptions = {}) {
  const realtime = useUnifiedRealtime(options);
  
  const triggerClasseursPolling = useCallback(async (operation: OperationType) => {
    await realtime.triggerPolling('classeurs', operation);
  }, [realtime]);

  return {
    ...realtime,
    triggerClasseursPolling
  };
} 