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
      return unifiedRealtimeService.getState();
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

  // Initialisation du service
  const initializeService = useCallback(async () => {
    if (!userId) {
      logger.warn(LogCategory.EDITOR, '[useUnifiedRealtime] UserId manquant');
      return;
    }

    const config: UnifiedRealtimeConfig = {
      userId,
      noteId,
      debug,
      autoReconnect
    };

    configRef.current = config;

    try {
      logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] 🚀 Initialisation du service UnifiedRealtime', {
        userId,
        noteId,
        debug
      });

      await unifiedRealtimeService.initialize(config);
      setIsInitialized(true);

      // S'abonner aux changements d'état
      unsubscribeStateRef.current = unifiedRealtimeService.onStateChange((newState) => {
        setState(newState);
        onStateChange?.(newState);
      });

      // S'abonner aux événements
      unsubscribeEventRef.current = unifiedRealtimeService.onEvent((event) => {
        onEvent?.(event);
      });

      logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] ✅ Service initialisé avec succès');

    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] ❌ Erreur d\'initialisation:', error);
      setIsInitialized(false);
    }
  }, [userId, noteId, debug, autoReconnect, onEvent, onStateChange]);

  // Effet d'initialisation
  useEffect(() => {
    initializeService();

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
  }, [initializeService]);

  // Gestion des changements de configuration
  useEffect(() => {
    if (!isInitialized || !configRef.current) return;

    const currentConfig = configRef.current;
    const newConfig: UnifiedRealtimeConfig = {
      userId,
      noteId,
      debug,
      autoReconnect
    };

    // Vérifier si la configuration a changé
    const configChanged = 
      currentConfig.userId !== newConfig.userId ||
      currentConfig.noteId !== newConfig.noteId ||
      currentConfig.debug !== newConfig.debug ||
      currentConfig.autoReconnect !== newConfig.autoReconnect;

    if (configChanged) {
      logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] 🔄 Configuration changée - réinitialisation');
      
      // Réinitialiser avec la nouvelle configuration
      unifiedRealtimeService.initialize(newConfig).then(() => {
        configRef.current = newConfig;
      }).catch((error) => {
        logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] ❌ Erreur de réinitialisation:', error);
      });
    }
  }, [userId, noteId, debug, autoReconnect, isInitialized]);

  // Actions
  const connect = useCallback(async () => {
    if (!isInitialized) {
      await initializeService();
    } else {
      await unifiedRealtimeService.reconnect();
    }
  }, [isInitialized, initializeService]);

  const disconnect = useCallback(async () => {
    await unifiedRealtimeService.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    await unifiedRealtimeService.reconnect();
  }, []);

  const broadcast = useCallback(async (event: string, payload: unknown) => {
    await unifiedRealtimeService.broadcast(event, payload);
  }, []);

  // Statistiques
  const stats = unifiedRealtimeService.getStats();

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
      return unifiedRealtimeService.getState();
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
    const unsubscribe = unifiedRealtimeService.onStateChange(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook pour obtenir le service UnifiedRealtime
 */
export function useUnifiedRealtimeService() {
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
    const unsubscribe = unifiedRealtimeService.onEvent((event) => {
      onEventRef.current(event);
    });

    return unsubscribe;
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

    const unsubscribe = unifiedRealtimeService.onStateChange((state) => {
      if (state.connectionStatus === 'error' && !isReconnecting) {
        setIsReconnecting(true);
        
        timeoutRef.current = setTimeout(async () => {
          try {
            await unifiedRealtimeService.reconnect();
          } catch (error) {
            logger.error(LogCategory.EDITOR, '[useUnifiedRealtime] Erreur de reconnexion automatique:', error);
          } finally {
            setIsReconnecting(false);
          }
        }, delay);
      }
    });

    return () => {
      unsubscribe();
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
        const state = unifiedRealtimeService.getState();
        if (!state.isConnected && !state.isConnecting) {
          logger.info(LogCategory.EDITOR, '[useUnifiedRealtime] 👁️ Page visible - reconnexion automatique');
          unifiedRealtimeService.reconnect();
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
    const unsubscribe = unifiedRealtimeService.onEvent((event) => {
      setEvents(prev => [event, ...prev.slice(0, 99)]); // Garder les 100 derniers événements
    });

    return unsubscribe;
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
