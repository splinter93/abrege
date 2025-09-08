/**
 * 🔄 RealtimeEditorHook - Hook React pour l'intégration Realtime Editor
 * 
 * Hook personnalisé qui fournit une interface simple et réactive pour
 * utiliser le service RealtimeEditor dans les composants React.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { realtimeEditorService, RealtimeEditorConfig, RealtimeEditorState, RealtimeEditorEvent } from '@/services/RealtimeEditorService';
import { simpleLogger as logger } from '@/utils/logger';

interface UseRealtimeEditorOptions {
  noteId: string;
  userId: string;
  debug?: boolean;
  autoReconnect?: boolean;
  onEvent?: (event: RealtimeEditorEvent) => void;
  onStateChange?: (state: RealtimeEditorState) => void;
}

interface UseRealtimeEditorReturn {
  // État de la connexion
  state: RealtimeEditorState;
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: RealtimeEditorState['connectionStatus'];
  lastError: string | null;
  reconnectAttempts: number;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  broadcast: (event: string, payload: any) => Promise<void>;
  
  // Utilitaires
  isInitialized: boolean;
  lastActivity: number;
}

/**
 * Hook principal pour utiliser RealtimeEditor dans les composants React
 */
export function useRealtimeEditor({
  noteId,
  userId,
  debug = false,
  autoReconnect = true,
  onEvent,
  onStateChange
}: UseRealtimeEditorOptions): UseRealtimeEditorReturn {
  
  const [state, setState] = useState<RealtimeEditorState>(() => 
    realtimeEditorService.getState()
  );
  
  const [isInitialized, setIsInitialized] = useState(false);
  const configRef = useRef<RealtimeEditorConfig | null>(null);
  const unsubscribeStateRef = useRef<(() => void) | null>(null);
  const unsubscribeEventRef = useRef<(() => void) | null>(null);

  // Initialisation du service
  const initializeService = useCallback(async () => {
    if (!noteId || !userId) {
      logger.warn('[RealtimeEditorHook] NoteId ou UserId manquant');
      return;
    }

    const config: RealtimeEditorConfig = {
      noteId,
      userId,
      debug,
      autoReconnect
    };

    configRef.current = config;

    try {
      logger.info('[RealtimeEditorHook] 🚀 Initialisation du service Realtime', {
        noteId,
        userId,
        debug
      });

      await realtimeEditorService.initialize(config);
      setIsInitialized(true);

      // S'abonner aux changements d'état
      unsubscribeStateRef.current = realtimeEditorService.onStateChange((newState) => {
        setState(newState);
        onStateChange?.(newState);
      });

      // S'abonner aux événements
      unsubscribeEventRef.current = realtimeEditorService.onEvent((event) => {
        onEvent?.(event);
      });

      logger.info('[RealtimeEditorHook] ✅ Service initialisé avec succès');

    } catch (error) {
      logger.error('[RealtimeEditorHook] ❌ Erreur d\'initialisation:', error);
    }
  }, [noteId, userId, debug, autoReconnect, onEvent, onStateChange]);

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

  // Actions
  const connect = useCallback(async () => {
    if (!isInitialized) {
      await initializeService();
    } else {
      await realtimeEditorService.reconnect();
    }
  }, [isInitialized, initializeService]);

  const disconnect = useCallback(async () => {
    await realtimeEditorService.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    await realtimeEditorService.reconnect();
  }, []);

  const broadcast = useCallback(async (event: string, payload: any) => {
    await realtimeEditorService.broadcast(event, payload);
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
    reconnect,
    broadcast,
    
    // Utilitaires
    isInitialized,
    lastActivity: state.lastActivity
  };
}

/**
 * Hook simplifié pour obtenir uniquement l'état de la connexion
 */
export function useRealtimeEditorState(): RealtimeEditorState {
  const [state, setState] = useState<RealtimeEditorState>(() => 
    realtimeEditorService.getState()
  );

  useEffect(() => {
    const unsubscribe = realtimeEditorService.onStateChange(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook pour obtenir le service RealtimeEditor
 */
export function useRealtimeEditorService() {
  return realtimeEditorService;
}

/**
 * Hook pour écouter les événements Realtime
 */
export function useRealtimeEditorEvents(
  onEvent: (event: RealtimeEditorEvent) => void,
  dependencies: any[] = []
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const unsubscribe = realtimeEditorService.onEvent((event) => {
      onEventRef.current(event);
    });

    return unsubscribe;
  }, dependencies);
}

/**
 * Hook pour gérer la reconnexion automatique
 */
export function useRealtimeEditorAutoReconnect(
  enabled: boolean = true,
  delay: number = 5000
) {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = realtimeEditorService.onStateChange((state) => {
      if (state.connectionStatus === 'error' && !isReconnecting) {
        setIsReconnecting(true);
        
        timeoutRef.current = setTimeout(async () => {
          try {
            await realtimeEditorService.reconnect();
          } catch (error) {
            logger.error('[RealtimeEditorHook] Erreur de reconnexion automatique:', error);
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
export function useRealtimeEditorVisibility() {
  const [isVisible, setIsVisible] = useState(() => {
    // Vérifier que nous sommes côté client
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return true; // Valeur par défaut côté serveur
    }
    return !document.hidden;
  });

  useEffect(() => {
    // Vérifier que nous sommes côté client
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);

      if (visible) {
        // Page visible - vérifier la connexion
        const state = realtimeEditorService.getState();
        if (!state.isConnected && !state.isConnecting) {
          logger.info('[RealtimeEditorHook] 👁️ Page visible - reconnexion automatique');
          realtimeEditorService.reconnect();
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
 * Hook pour le debug et monitoring
 */
export function useRealtimeEditorDebug() {
  const state = useRealtimeEditorState();
  const [events, setEvents] = useState<RealtimeEditorEvent[]>([]);

  useEffect(() => {
    const unsubscribe = realtimeEditorService.onEvent((event) => {
      setEvents(prev => [event, ...prev.slice(0, 49)]); // Garder les 50 derniers événements
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
      lastEvent: events[0] || null,
      connectionUptime: state.isConnected ? now - state.lastActivity : 0
    };
  }, [events, state.isConnected, state.lastActivity]);

  return {
    state,
    events,
    clearEvents,
    getStats
  };
}
