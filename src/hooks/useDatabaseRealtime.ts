/**
 * 🔄 useDatabaseRealtime - Hook pour écouter les événements de base de données
 * 
 * Hook qui utilise le DatabaseRealtimeService pour synchroniser l'éditeur
 * avec les changements de base de données en temps réel.
 */

import React, { useEffect, useCallback, useRef } from 'react';
import { databaseRealtimeService, DatabaseRealtimeConfig, DatabaseRealtimeState } from '@/services/DatabaseRealtimeService';
import { logger, LogCategory } from '@/utils/logger';

interface UseDatabaseRealtimeOptions {
  userId: string;
  debug?: boolean;
  autoReconnect?: boolean;
  onStateChange?: (state: DatabaseRealtimeState) => void;
}

interface UseDatabaseRealtimeReturn {
  // État de la connexion
  state: DatabaseRealtimeState;
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: DatabaseRealtimeState['connectionStatus'];
  lastError: string | null;
  reconnectAttempts: number;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Utilitaires
  isInitialized: boolean;
}

/**
 * Hook principal pour utiliser DatabaseRealtime dans les composants React
 */
export function useDatabaseRealtime({
  userId,
  debug = false,
  autoReconnect = true,
  onStateChange
}: UseDatabaseRealtimeOptions): UseDatabaseRealtimeReturn {
  
  const [state, setState] = React.useState<DatabaseRealtimeState>(() => 
    databaseRealtimeService.getState()
  );
  
  const [isInitialized, setIsInitialized] = React.useState(false);
  const configRef = useRef<DatabaseRealtimeConfig | null>(null);
  const unsubscribeStateRef = useRef<(() => void) | null>(null);

  // Initialisation du service
  const initializeService = useCallback(async () => {
    // Validation des paramètres
    if (!userId || typeof userId !== 'string' || userId.trim() === '' || userId === 'anonymous') {
      logger.warn(LogCategory.EDITOR, '[useDatabaseRealtime] UserId manquant, invalide ou anonyme:', { userId });
      return;
    }

    const config: DatabaseRealtimeConfig = {
      userId: userId.trim(),
      debug: Boolean(debug),
      autoReconnect: Boolean(autoReconnect)
    };

    configRef.current = config;

    try {
      logger.info(LogCategory.EDITOR, '[useDatabaseRealtime] 🚀 Initialisation du service DatabaseRealtime', {
        userId: config.userId,
        debug: config.debug
      });

      await databaseRealtimeService.initialize(config);
      setIsInitialized(true);

      // S'abonner aux changements d'état
      unsubscribeStateRef.current = databaseRealtimeService.onStateChange((newState) => {
        setState(newState);
        if (typeof onStateChange === 'function') {
          try {
            onStateChange(newState);
          } catch (error) {
            logger.error(LogCategory.EDITOR, '[useDatabaseRealtime] Erreur dans callback onStateChange:', error);
          }
        }
      });

      logger.info(LogCategory.EDITOR, '[useDatabaseRealtime] ✅ Service initialisé avec succès');

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useDatabaseRealtime] ❌ Erreur d\'initialisation:', error);
      setIsInitialized(false);
    }
  }, [userId, debug, autoReconnect, onStateChange]);

  // Effet d'initialisation
  useEffect(() => {
    initializeService();

    // Cleanup
    return () => {
      if (unsubscribeStateRef.current) {
        unsubscribeStateRef.current();
        unsubscribeStateRef.current = null;
      }
    };
  }, [initializeService]);

  // Actions
  const connect = useCallback(async () => {
    if (!isInitialized) {
      await initializeService();
    } else {
      // Le service gère sa propre reconnexion
      logger.info(LogCategory.EDITOR, '[useDatabaseRealtime] Reconnexion demandée');
    }
  }, [isInitialized, initializeService]);

  const disconnect = useCallback(async () => {
    await databaseRealtimeService.disconnect();
  }, []);

  return {
    // État
    state,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    connectionStatus: state.connectionStatus,
    lastError: state.lastError,
    reconnectAttempts: state.reconnectAttempts,
    
    // Actions
    connect,
    disconnect,
    
    // Utilitaires
    isInitialized
  };
}

/**
 * Hook simplifié pour obtenir uniquement l'état de la connexion
 */
export function useDatabaseRealtimeState(): DatabaseRealtimeState {
  const [state, setState] = React.useState<DatabaseRealtimeState>(() => 
    databaseRealtimeService.getState()
  );

  useEffect(() => {
    const unsubscribe = databaseRealtimeService.onStateChange(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook pour obtenir le service DatabaseRealtime
 */
export function useDatabaseRealtimeService() {
  return databaseRealtimeService;
}
