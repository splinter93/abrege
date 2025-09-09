/**
 * 🔄 useUnifiedRealtime - Hook React pour le Service Realtime Unifié
 * 
 * Hook personnalisé qui fournit une interface simple et réactive pour
 * utiliser le UnifiedRealtimeService dans les composants React.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedRealtimeService, UnifiedRealtimeConfig, UnifiedRealtimeState, UnifiedRealtimeEvent } from '@/services/UnifiedRealtimeService';
import { logger, LogCategory } from '@/utils/logger';

interface UseUnifiedRealtimeOptions {
  userId: string;
  noteId?: string;
  debug?: boolean;
  autoReconnect?: boolean;
  onEvent?: (event: UnifiedRealtimeEvent<unknown>) => void;
  onStateChange?: (state: UnifiedRealtimeState) => void;
}

interface UseUnifiedRealtimeReturn {
  // État de la connexion
  state: UnifiedRealtimeState;
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: UnifiedRealtimeState['connectionStatus'];
  lastError: string | null;
  reconnectAttempts: number;
  channels: Set<string>;
  uptime: number;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  broadcast: (event: string, payload: unknown) => Promise<void>;
  
  // Utilitaires
  isInitialized: boolean;
  lastActivity: number;
  stats: ReturnType<typeof unifiedRealtimeService.getStats>;
}

/**
 * Hook principal pour utiliser UnifiedRealtime dans les composants React
 */
export function useUnifiedRealtime({
  userId,
  noteId,
  debug = false,
  autoReconnect = true,
  onEvent,
  onStateChange
}: UseUnifiedRealtimeOptions): UseUnifiedRealtimeReturn {
  
  const [state, setState] = useState<UnifiedRealtimeState>(() => {
    try {
      // Vérifier que le service est initialisé avant d'appeler getState
      if (unifiedRealtimeService && typeof unifiedRealtimeService.getState === 'function') {
        return unifiedRealtimeService.getState();
      }
      throw new Error('Service non initialisé');
    } catch (error) {
      logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur lors de l\'obtention de l\'état initial:', error);
      return {
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'disconnected' as const,
        lastError: null,
        reconnectAttempts: 0,
        lastActivity: 0,
        channels: new Set(),
        uptime: 0,
        connectionStartTime: null
      };
    }
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  const configRef = useRef<UnifiedRealtimeConfig | null>(null);
  const unsubscribeStateRef = useRef<(() => void) | null>(null);
  const unsubscribeEventRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false); // Flag pour éviter les initialisations simultanées
  
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
    if (!userId) {
      logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] UserId manquant');
      return;
    }

    // Protection contre les initialisations multiples
    if (isInitialized || isInitializingRef.current) {
      logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] Service déjà initialisé ou en cours d\'initialisation, évitement de la double initialisation');
      return;
    }

    // Marquer comme en cours d'initialisation
    isInitializingRef.current = true;

    // Validation des paramètres
    if (typeof userId !== 'string' || userId.trim() === '') {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] UserId invalide:', { userId });
      return;
    }

    if (userId === 'anonymous') {
      logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] UserId "anonymous" non supporté pour Realtime');
      return;
    }

    const config: UnifiedRealtimeConfig = {
      userId: userId.trim(),
      noteId: noteId?.trim() || undefined,
      debug: Boolean(debug),
      autoReconnect: Boolean(autoReconnect)
    };

    configRef.current = config;

    try {
      logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] 🚀 Initialisation du service UnifiedRealtime', {
        userId,
        noteId,
        debug
      });

      // Vérifier que le service est disponible avant l'initialisation
      if (!unifiedRealtimeService) {
        throw new Error('Service UnifiedRealtime non disponible');
      }

      await unifiedRealtimeService.initialize(config);
      setIsInitialized(true);
      isInitializingRef.current = false;

      // S'abonner aux changements d'état
      if (unifiedRealtimeService && typeof unifiedRealtimeService.onStateChange === 'function') {
        unsubscribeStateRef.current = unifiedRealtimeService.onStateChange((newState) => {
          setState(newState);
          onStateChangeRef.current?.(newState);
        });
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour l\'abonnement aux changements d\'état');
      }

      // S'abonner aux événements
      if (unifiedRealtimeService && typeof unifiedRealtimeService.onEvent === 'function') {
        unsubscribeEventRef.current = unifiedRealtimeService.onEvent((event) => {
          onEventRef.current?.(event);
        });
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour l\'abonnement aux événements');
      }

      logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] ✅ Service initialisé avec succès');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Obtenir des informations de débogage si le service est disponible
      let debugInfo = null;
      try {
        if (unifiedRealtimeService && typeof unifiedRealtimeService.getDebugInfo === 'function') {
          debugInfo = unifiedRealtimeService.getDebugInfo();
        }
      } catch (debugError) {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur lors de l\'obtention des infos de débogage:', debugError);
      }
      
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] ❌ Erreur d\'initialisation:', {
        error: errorMessage,
        userId,
        noteId,
        debug,
        debugInfo
      });
      setIsInitialized(false);
      isInitializingRef.current = false;
      
      // Mettre à jour l'état avec l'erreur
      setState(prevState => ({
        ...prevState,
        connectionStatus: 'error',
        lastError: errorMessage,
        isConnecting: false,
        isConnected: false
      }));
    }
  }, [userId, noteId, debug, autoReconnect, isInitialized]);

  // Effet d'initialisation - seulement quand les paramètres essentiels changent
  useEffect(() => {
    // Ne s'exécuter que si on a un userId valide et qu'on n'est pas déjà initialisé
    if (userId && !isInitialized) {
      initializeService();
    }

    // Cleanup
    return () => {
      if (unsubscribeStateRef.current) {
        unsubscribeStateRef.current();
        unsubscribeStateRef.current = null;
      }

      if (unsubscribeEventRef.current) {
        unsubscribeEventRef.current();
        unsubscribeEventRef.current = null;
      }
    };
  }, [userId, isInitialized, initializeService]);

  // Gestion des changements de configuration - seulement pour les changements critiques
  useEffect(() => {
    if (!isInitialized || !configRef.current) return;

    const currentConfig = configRef.current;
    const newConfig: UnifiedRealtimeConfig = {
      userId,
      noteId,
      debug,
      autoReconnect
    };

    // Vérifier si la configuration critique a changé (seulement userId et noteId)
    const criticalConfigChanged = 
      currentConfig.userId !== newConfig.userId ||
      currentConfig.noteId !== newConfig.noteId;

    if (criticalConfigChanged) {
      logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] 🔄 Configuration critique changée - réinitialisation', {
        oldUserId: currentConfig.userId,
        newUserId: newConfig.userId,
        oldNoteId: currentConfig.noteId,
        newNoteId: newConfig.noteId
      });
      
      // Réinitialiser avec la nouvelle configuration
      unifiedRealtimeService.initialize(newConfig).then(() => {
        configRef.current = newConfig;
      }).catch((error) => {
        logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] ❌ Erreur de réinitialisation:', error);
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
      } else if (unifiedRealtimeService && typeof unifiedRealtimeService.reconnect === 'function') {
        await unifiedRealtimeService.reconnect();
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour la reconnexion');
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur lors de la connexion:', error);
    }
  }, [isInitialized, initializeService]);

  const disconnect = useCallback(async () => {
    try {
      if (unifiedRealtimeService && typeof unifiedRealtimeService.disconnect === 'function') {
        await unifiedRealtimeService.disconnect();
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour la déconnexion');
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur lors de la déconnexion:', error);
    }
  }, []);

  const reconnect = useCallback(async () => {
    try {
      if (unifiedRealtimeService && typeof unifiedRealtimeService.reconnect === 'function') {
        await unifiedRealtimeService.reconnect();
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour la reconnexion');
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur lors de la reconnexion:', error);
    }
  }, []);

  const broadcast = useCallback(async (event: string, payload: unknown) => {
    try {
      if (unifiedRealtimeService && typeof unifiedRealtimeService.broadcast === 'function') {
        await unifiedRealtimeService.broadcast(event, payload);
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour le broadcast');
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur lors du broadcast:', error);
    }
  }, []);

  // Statistiques - avec vérification de sécurité
  const stats = isInitialized ? unifiedRealtimeService.getStats() : {
    isConnected: false,
    channelsCount: 0,
    reconnectAttempts: 0,
    uptime: 0,
    lastActivity: 0,
    connectionStartTime: null,
    metrics: {
      connectionAttempts: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageConnectionTime: 0,
      totalReconnectAttempts: 0,
      lastConnectionTime: null,
      eventsProcessed: 0,
      errorsCount: 0
    }
  };

  return {
    // État
    state,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    connectionStatus: state.connectionStatus,
    lastError: state.lastError,
    reconnectAttempts: state.reconnectAttempts,
    channels: state.channels,
    uptime: state.uptime,
    
    // Actions
    connect,
    disconnect,
    reconnect,
    broadcast,
    
    // Utilitaires
    isInitialized,
    lastActivity: state.lastActivity,
    stats
  };
}

/**
 * Hook simplifié pour obtenir uniquement l'état de la connexion
 */
export function useUnifiedRealtimeState(): UnifiedRealtimeState {
  const [state, setState] = useState<UnifiedRealtimeState>(() => {
    try {
      // Vérifier que le service est initialisé avant d'appeler getState
      if (unifiedRealtimeService && typeof unifiedRealtimeService.getState === 'function') {
        return unifiedRealtimeService.getState();
      }
      throw new Error('Service non initialisé');
    } catch (error) {
      logger.warn(LogCategory.EDITOR, '[useUnifiedRealtimeState] Erreur lors de l\'obtention de l\'état initial:', error);
      return {
        isConnected: false,
        isConnecting: false,
        connectionStatus: 'disconnected' as const,
        lastError: null,
        reconnectAttempts: 0,
        lastActivity: 0,
        channels: new Set(),
        uptime: 0,
        connectionStartTime: null
      };
    }
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      if (unifiedRealtimeService && typeof unifiedRealtimeService.onStateChange === 'function') {
        unsubscribe = unifiedRealtimeService.onStateChange(setState);
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtimeState] Service non disponible pour l\'abonnement');
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtimeState] Erreur lors de l\'abonnement:', error);
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
 * Hook pour obtenir le service UnifiedRealtime
 */
export function useUnifiedRealtimeService() {
  // Vérifier que le service est disponible
  if (!unifiedRealtimeService) {
    logger.warn(LogCategory.EDITOR, '[useUnifiedRealtimeService] Service non disponible');
    return null;
  }
  return unifiedRealtimeService;
}

/**
 * Hook pour écouter les événements Realtime
 */
export function useUnifiedRealtimeEvents(
  onEvent: (event: UnifiedRealtimeEvent<unknown>) => void,
  dependencies: unknown[] = []
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      if (unifiedRealtimeService && typeof unifiedRealtimeService.onEvent === 'function') {
        unsubscribe = unifiedRealtimeService.onEvent((event) => {
          onEventRef.current(event);
        });
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtimeEvents] Service non disponible pour l\'abonnement aux événements');
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtimeEvents] Erreur lors de l\'abonnement:', error);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, dependencies);
}

/**
 * Hook pour gérer la reconnexion automatique avancée
 */
export function useUnifiedRealtimeAutoReconnect(
  enabled: boolean = true,
  delay: number = 5000
) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let unsubscribe: (() => void) | null = null;
    
    try {
      if (unifiedRealtimeService && typeof unifiedRealtimeService.onStateChange === 'function') {
        unsubscribe = unifiedRealtimeService.onStateChange((state) => {
          if (state.connectionStatus === 'error' && !isReconnecting) {
            setIsReconnecting(true);
            
            timeoutRef.current = setTimeout(async () => {
              try {
                if (unifiedRealtimeService && typeof unifiedRealtimeService.reconnect === 'function') {
                  await unifiedRealtimeService.reconnect();
                } else {
                  logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour la reconnexion automatique');
                }
              } catch (error) {
                logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur de reconnexion automatique:', error);
              } finally {
                setIsReconnecting(false);
              }
            }, delay);
          }
        });
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour la reconnexion automatique');
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur lors de l\'abonnement pour la reconnexion automatique:', error);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, delay, isReconnecting]);

  return { isReconnecting };
}

/**
 * Hook pour gérer la visibilité de la page
 */
export function useUnifiedRealtimeVisibility() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return true;
    }
    return !document.hidden;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);

      if (visible) {
        // Page visible - vérifier la connexion
        try {
          if (unifiedRealtimeService && typeof unifiedRealtimeService.getState === 'function') {
            const state = unifiedRealtimeService.getState();
            if (!state.isConnected && !state.isConnecting) {
              logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] 👁️ Page visible - reconnexion automatique');
              if (unifiedRealtimeService && typeof unifiedRealtimeService.reconnect === 'function') {
                unifiedRealtimeService.reconnect();
              } else {
                logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour la reconnexion');
              }
            }
          } else {
            logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] Service non disponible pour vérifier l\'état');
          }
        } catch (error) {
          logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur lors de la vérification de l\'état:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { isVisible };
}

/**
 * Hook pour le debug et monitoring avancé
 */
export function useUnifiedRealtimeDebug() {
  const state = useUnifiedRealtimeState();
  const [events, setEvents] = useState<UnifiedRealtimeEvent<unknown>[]>([]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    try {
      if (unifiedRealtimeService && typeof unifiedRealtimeService.onEvent === 'function') {
        unsubscribe = unifiedRealtimeService.onEvent((event) => {
          setEvents(prev => [event, ...prev.slice(0, 99)]); // Garder les 100 derniers événements
        });
      } else {
        logger.warn(LogCategory.EDITOR, '[useUnifiedRealtimeDebug] Service non disponible pour l\'abonnement aux événements');
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtimeDebug] Erreur lors de l\'abonnement aux événements:', error);
    }

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const getStats = useCallback(() => {
    const now = Date.now();
    const recentEvents = events.filter(e => now - e.timestamp < 60000); // Dernière minute
    
    return {
      totalEvents: events.length,
      recentEvents: recentEvents.length,
      eventsByType: events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      eventsBySource: events.reduce((acc, event) => {
        acc[event.source] = (acc[event.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      eventsByChannel: events.reduce((acc, event) => {
        acc[event.channel] = (acc[event.channel] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      lastEvent: events[0] || null,
      connectionUptime: state.uptime,
      channelsCount: state.channels.size,
      reconnectAttempts: state.reconnectAttempts
    };
  }, [events, state.uptime, state.channels.size, state.reconnectAttempts]);

  return {
    state,
    events,
    clearEvents,
    getStats
  };
}
