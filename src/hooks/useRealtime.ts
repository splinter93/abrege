/**
 * 🔄 useRealtime - Hook React pour le Service Realtime
 * 
 * Hook de production simple et performant pour utiliser le RealtimeService
 * dans les composants React.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeService, RealtimeConfig, RealtimeState, RealtimeEvent } from '@/services/RealtimeService';
import { logger, LogCategory } from '@/utils/logger';

export interface UseRealtimeOptions {
  readonly userId: string;
  readonly noteId?: string;
  readonly debug?: boolean;
  readonly enabled?: boolean; // Désactiver complètement le realtime si false
  readonly onEvent?: (event: RealtimeEvent) => void;
  readonly onStateChange?: (state: RealtimeState) => void;
}

interface UseRealtimeReturn {
  // État de la connexion
  readonly state: RealtimeState;
  readonly isConnected: boolean;
  readonly isConnecting: boolean;
  readonly error: string | null;
  readonly channels: readonly string[];
  
  // Actions
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly reconnect: () => Promise<void>;
  readonly broadcast: (event: string, payload: unknown) => Promise<void>;
  readonly testRealtimeEvent: () => Promise<void>;
  
  // Utilitaires
  readonly isInitialized: boolean;
}

/**
 * Hook principal pour utiliser RealtimeService dans les composants React
 */
export function useRealtime({
  userId,
  noteId,
  debug = false,
  enabled = true, // Par défaut activé
  onEvent,
  onStateChange
}: UseRealtimeOptions): UseRealtimeReturn {
  
  const [state, setState] = useState<RealtimeState>(() => {
    try {
      return realtimeService.getState();
    } catch (error) {
      logger.warn(LogCategory.EDITOR, '[useRealtime] Erreur état initial:', error);
      return {
        isConnected: false,
        isConnecting: false,
        error: null,
        channels: []
      };
    }
  });
  
  const [isInitialized, setIsInitialized] = useState(() => {
    try {
      // Vérifier si le service est déjà initialisé
      return realtimeService.isInitialized();
    } catch {
      return false;
    }
  });
  const configRef = useRef<RealtimeConfig | null>(null);
  const unsubscribeStateRef = useRef<(() => void) | null>(null);
  const unsubscribeEventRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs pour les callbacks pour éviter les re-créations
  const onEventRef = useRef(onEvent);
  const onStateChangeRef = useRef(onStateChange);
  
  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  // Initialisation du service
  const initializeService = useCallback(async () => {
    // Si désactivé (readonly/public page), ne rien faire
    if (!enabled) {
      logger.debug(LogCategory.EDITOR, '[useRealtime] initializeService skipped (disabled)', { userId, noteId });
      return;
    }
    
    if (!userId) {
      logger.debug(LogCategory.EDITOR, '[useRealtime] initializeService skipped (no userId)', { userId, noteId });
      return;
    }

    // Protection contre les initialisations multiples
    if (isInitialized) {
      logger.debug(LogCategory.EDITOR, '[useRealtime] initializeService skipped (already initialized)', { userId, noteId });
      return;
    }

    // Si on est en cours d'initialisation, ne pas réessayer
    if (isInitializingRef.current) {
      logger.debug(LogCategory.EDITOR, '[useRealtime] initializeService skipped (already initializing)', { userId, noteId });
      return;
    }

    // Marquer comme en cours d'initialisation
    isInitializingRef.current = true;
    logger.info(LogCategory.EDITOR, '[useRealtime] 🚀 Démarrage initialisation...', { userId, noteId, timestamp: Date.now() });

    // Validation des paramètres
    if (typeof userId !== 'string' || userId.trim() === '') {
      logger.warn(LogCategory.EDITOR, '[useRealtime] userId invalide', { userId, noteId });
      isInitializingRef.current = false;
      return;
    }

    if (userId === 'anonymous') {
      logger.debug(LogCategory.EDITOR, '[useRealtime] userId est anonymous, skip', { userId, noteId });
      isInitializingRef.current = false;
      return;
    }

    const config: RealtimeConfig = {
      userId: userId.trim(),
      noteId: noteId?.trim() || undefined,
      debug: Boolean(debug)
    };

    configRef.current = config;

    try {
      logger.info(LogCategory.EDITOR, '[useRealtime] 📞 Appel realtimeService.initialize...', {
        userId: config.userId,
        noteId: config.noteId,
        timestamp: Date.now()
      });
      
      await realtimeService.initialize(config);
      
      logger.info(LogCategory.EDITOR, '[useRealtime] ✅ Service initialisé avec succès', {
        userId: config.userId,
        noteId: config.noteId,
        timestamp: Date.now()
      });
      
      setIsInitialized(true);
      isInitializingRef.current = false;

      // S'abonner aux changements d'état
      unsubscribeStateRef.current = realtimeService.onStateChange((newState) => {
        logger.debug(LogCategory.EDITOR, '[useRealtime] État changé', {
          isConnected: newState.isConnected,
          isConnecting: newState.isConnecting,
          error: newState.error,
          channels: newState.channels
        });
        setState(newState);
        onStateChangeRef.current?.(newState);
      });

      // S'abonner aux événements
      unsubscribeEventRef.current = realtimeService.onEvent((event) => {
        logger.debug(LogCategory.EDITOR, '[useRealtime] Événement reçu', {
          type: event.type,
          channel: event.channel,
          source: event.source
        });
        onEventRef.current?.(event);
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(LogCategory.EDITOR, '[useRealtime] ❌ Erreur d\'initialisation:', {
        error: errorMessage,
        userId,
        noteId,
        debug,
        stack: error instanceof Error ? error.stack : undefined
      });
      setIsInitialized(false);
      isInitializingRef.current = false;
      
      // Mettre à jour l'état avec l'erreur
      setState(prevState => ({
        ...prevState,
        error: errorMessage,
        isConnecting: false,
        isConnected: false
      }));
    }
  }, [userId, noteId, debug, enabled, isInitialized]);

  // Effet d'initialisation - seulement quand les paramètres essentiels changent
  useEffect(() => {
    // Si désactivé (readonly/public page), ne rien faire
    if (!enabled) {
      logger.debug(LogCategory.EDITOR, '[useRealtime] ⏭️ Skipped (disabled)', { userId, noteId });
      return;
    }
    
    // Ignorer les userId invalides
    if (!userId || userId === 'anonymous') {
      logger.debug(LogCategory.EDITOR, '[useRealtime] ⏭️ Skipped (invalid userId)', { userId, noteId });
      return;
    }
    
    // ✅ FIX: Logger pour diagnostiquer
    logger.info(LogCategory.EDITOR, '[useRealtime] 🔄 Initialisation...', {
      userId,
      noteId,
      isInitialized,
      enabled
    });
    
    // Ne s'exécuter que si on a un userId valide et qu'on n'est pas déjà initialisé
    if (!isInitialized) {
      // ✅ FIX: Réduire le debounce à 100ms pour initialisation plus rapide
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      
      initTimeoutRef.current = setTimeout(() => {
        logger.info(LogCategory.EDITOR, '[useRealtime] 🚀 Appel initializeService', {
          userId,
          noteId,
          timestamp: Date.now()
        });
        initializeService();
      }, 100); // ✅ Réduit de 500ms à 100ms
    } else {
      logger.debug(LogCategory.EDITOR, '[useRealtime] ✅ Déjà initialisé', { userId, noteId });
    }

    // Cleanup
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      if (unsubscribeStateRef.current) {
        unsubscribeStateRef.current();
        unsubscribeStateRef.current = null;
      }

      if (unsubscribeEventRef.current) {
        unsubscribeEventRef.current();
        unsubscribeEventRef.current = null;
      }
    };
  }, [userId, noteId, isInitialized, enabled, initializeService]);

  // Gestion des changements de configuration - seulement pour les changements critiques
  useEffect(() => {
    if (!isInitialized || !configRef.current) return;

    const currentConfig = configRef.current;
    const newConfig: RealtimeConfig = {
      userId,
      noteId,
      debug
    };

    // Vérifier si la configuration critique a changé (seulement userId et noteId)
    const criticalConfigChanged = 
      currentConfig.userId !== newConfig.userId ||
      currentConfig.noteId !== newConfig.noteId;

    if (criticalConfigChanged) {
      logger.info(LogCategory.EDITOR, '[useRealtime] Configuration critique changée - réinitialisation', {
        oldUserId: currentConfig.userId,
        newUserId: newConfig.userId,
        oldNoteId: currentConfig.noteId,
        newNoteId: newConfig.noteId
      });
      
      // Réinitialiser avec la nouvelle configuration
      realtimeService.initialize(newConfig).then(() => {
        configRef.current = newConfig;
      }).catch((error) => {
        logger.error(LogCategory.EDITOR, '[useRealtime] Erreur de réinitialisation:', error);
      });
    } else {
      // Mettre à jour la configuration sans réinitialiser
      configRef.current = newConfig;
    }
  }, [userId, noteId, isInitialized]);

  // Actions
  const connect = useCallback(async () => {
    try {
      if (!isInitialized) {
        await initializeService();
      } else {
        await realtimeService.reconnect();
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useRealtime] Erreur lors de la connexion:', error);
    }
  }, [isInitialized, initializeService]);

  const disconnect = useCallback(async () => {
    try {
      await realtimeService.disconnect();
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useRealtime] Erreur lors de la déconnexion:', error);
    }
  }, []);

  const reconnect = useCallback(async () => {
    try {
      await realtimeService.reconnect();
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useRealtime] Erreur lors de la reconnexion:', error);
    }
  }, []);

  const broadcast = useCallback(async (event: string, payload: unknown) => {
    try {
      await realtimeService.broadcast(event, payload);
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useRealtime] Erreur lors du broadcast:', error);
    }
  }, []);

  const testRealtimeEvent = useCallback(async () => {
    try {
      await realtimeService.testRealtimeEvent();
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useRealtime] Erreur lors du test realtime:', error);
    }
  }, []);

  return {
    // État
    state,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    channels: state.channels,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    broadcast,
    testRealtimeEvent,
    
    // Utilitaires
    isInitialized
  };
}

/**
 * Hook simplifié pour obtenir uniquement l'état de la connexion
 */
export function useRealtimeState(): RealtimeState {
  const [state, setState] = useState<RealtimeState>(() => {
    try {
      return realtimeService.getState();
    } catch (error) {
      logger.warn(LogCategory.EDITOR, '[useRealtimeState] Erreur état initial:', error);
      return {
        isConnected: false,
        isConnecting: false,
        error: null,
        channels: []
      };
    }
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = realtimeService.onStateChange(setState);
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useRealtimeState] Erreur lors de l\'abonnement:', error);
    }
    
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return state;
}

/**
 * Hook pour écouter les événements Realtime
 */
export function useRealtimeEvents(
  onEvent: (event: RealtimeEvent) => void,
  dependencies: unknown[] = []
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      unsubscribe = realtimeService.onEvent((event) => {
        onEventRef.current(event);
      });
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useRealtimeEvents] Erreur lors de l\'abonnement aux événements:', error);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, dependencies);
}
