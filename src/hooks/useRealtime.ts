import { useEffect, useRef } from 'react';
import { initRealtimeService, subscribeToTable as subscribeToPolling, unsubscribeFromTable as unsubscribeFromPolling, stopRealtimeService } from '@/services/realtimeService';
import { initWebSocketService, subscribeToTable as subscribeToWebSocket, unsubscribeFromTable as unsubscribeFromWebSocket, stopWebSocketService } from '@/services/websocketService';
// import { initSSEService, subscribeToTable, unsubscribeFromTable, stopSSEService } from '@/services/sseService';

interface RealtimeConfig {
  userId?: string;
  type: 'polling' | 'websocket' | 'sse';
  interval?: number; // pour polling
  wsUrl?: string; // pour websocket
  token?: string; // pour websocket sécurisé
  debug?: boolean;
  onError?: (err: any) => void;
  /**
   * Handler générique appelé à chaque événement WebSocket reçu (mode websocket uniquement).
   * Signature : (event: { type: string, payload: any, timestamp: number }) => void
   * L'utilisateur peut dispatcher comme il veut dans son UI ou son store.
   */
  onEvent?: (event: { type: string, payload: any, timestamp: number }) => void;
}

interface ChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: number;
}

/**
 * useRealtime - Hook universel pour le realtime (polling, websocket, sse)
 *
 * @param config {RealtimeConfig}
 *   - type: 'polling' | 'websocket' | 'sse'
 *   - userId: string (pour polling)
 *   - wsUrl: string (pour websocket)
 *   - token: string (pour websocket sécurisé)
 *   - debug: boolean (logs)
 *   - onError: (err) => void (callback erreur)
 *   - onEvent: (event: { type, payload, timestamp }) => void (callback générique WS)
 *
 * @returns { subscribe, unsubscribe, subscribeToTables, unsubscribeFromTables }
 *
 * Exemple d'utilisation (WebSocket) :
 *
 *   const { subscribe, unsubscribe } = useRealtime({
 *     type: 'websocket',
 *     wsUrl: 'wss://mon-backend/ws',
 *     token: monTokenJWT,
 *     debug: true,
 *     onEvent: (event) => {
 *       if (event.type === 'note.created') {
 *         // Ajoute la note dans le state local
 *       }
 *     }
 *   });
 *
 *   useEffect(() => {
 *     // ...
 *   }, []);
 */
export function useRealtime(config: RealtimeConfig) {
  const initialized = useRef(false);
  const listeners = useRef<Map<string, (event: ChangeEvent) => void>>(new Map());

  // Handler générique pour tous les events WebSocket
  useEffect(() => {
    if (config.type !== 'websocket' || !config.onEvent) return;
    const handleRawEvent = (event: { type: string, payload: any, timestamp: number }) => {
      if (config.debug) console.log('[WS EVENT]', event);
      config.onEvent?.(event);
    };
    // On utilise 'all' comme table générique pour tous les events
    subscribeToWebSocket('all', handleRawEvent as unknown as (event: ChangeEvent) => void);
    return () => unsubscribeFromWebSocket('all', handleRawEvent as unknown as (event: ChangeEvent) => void);
  }, [config.type, config.token, config.onEvent, config.debug]);

  useEffect(() => {
    if (initialized.current) return;
    try {
      switch (config.type) {
        case 'polling':
          if (!config.userId) throw new Error('userId requis pour le polling');
          initRealtimeService(config.userId);
          break;
        case 'websocket':
          if (!config.wsUrl || !config.token) throw new Error('wsUrl et token requis pour WebSocket');
          initWebSocketService(config.wsUrl, config.token, !!config.debug, config.onError);
          break;
        case 'sse':
          // À implémenter si besoin
          break;
        default:
          throw new Error(`Type de realtime non supporté: ${config.type}`);
      }
      initialized.current = true;
      if (config.debug) console.log(`🔄 Service realtime initialisé (${config.type})`);
    } catch (error) {
      if (config.debug) console.error('❌ Erreur initialisation realtime:', error);
      if (config.onError) config.onError(error);
    }
    // Cleanup
    return () => {
      try {
        switch (config.type) {
          case 'polling':
            stopRealtimeService();
            break;
          case 'websocket':
            stopWebSocketService();
            break;
          case 'sse':
            // À implémenter si besoin
            break;
        }
        initialized.current = false;
      } catch (error) {
        if (config.debug) console.error('❌ Erreur cleanup realtime:', error);
        if (config.onError) config.onError(error);
      }
    };
  }, [config.type, config.userId, config.wsUrl, config.token, config.debug, config.onError]);

  /**
   * S'abonner aux changements d'une table
   */
  const subscribe = (table: string, callback: (event: ChangeEvent) => void) => {
    listeners.current.set(table, callback);
    if (config.type === 'websocket') {
      subscribeToWebSocket(table, callback);
    } else {
      subscribeToPolling(table, callback);
    }
  };

  /**
   * Se désabonner des changements
   */
  const unsubscribe = (table: string, callback: (event: ChangeEvent) => void) => {
    if (config.type === 'websocket') {
      unsubscribeFromWebSocket(table, callback);
    } else {
      unsubscribeFromPolling(table, callback);
    }
    listeners.current.delete(table);
  };

  /**
   * S'abonner à plusieurs tables
   */
  const subscribeToTables = (tables: string[], callback: (event: ChangeEvent) => void) => {
    tables.forEach(table => {
      subscribe(table, callback);
    });
  };

  /**
   * Se désabonner de plusieurs tables
   */
  const unsubscribeFromTables = (tables: string[], callback: (event: ChangeEvent) => void) => {
    tables.forEach(table => {
      unsubscribe(table, callback);
    });
  };

  return {
    subscribe,
    unsubscribe,
    subscribeToTables,
    unsubscribeFromTables,
  };
}

/**
 * Hook spécialisé pour les notes (remplace l'ancien realtime)
 */
export function useNoteRealtime(noteId: string, userId: string) {
  const { subscribe, unsubscribe } = useRealtime({
    userId,
    type: 'polling',
    interval: 2000
  });

  useEffect(() => {
    if (!noteId || !userId) return;

    const handleNoteChange = (event: ChangeEvent) => {
      if (event.table === 'articles') {
        switch (event.eventType) {
          case 'UPDATE':
            if (event.new?.id === noteId) {
              console.log('📝 Note modifiée en temps réel:', event);
              // Ici vous pouvez déclencher une action (recharger la note, etc.)
            }
            break;
          case 'DELETE':
            if (event.old?.id === noteId) {
              console.log('🗑️ Note supprimée en temps réel:', event);
              // Ici vous pouvez déclencher une action (rediriger, etc.)
            }
            break;
          case 'INSERT':
            console.log('➕ Nouvelle note créée en temps réel:', event);
            // Ici vous pouvez déclencher une action (rafraîchir la liste, etc.)
            break;
        }
      }
    };

    subscribe('articles', handleNoteChange);

    return () => {
      unsubscribe('articles', handleNoteChange);
    };
  }, [noteId, userId, subscribe, unsubscribe]);

  return { subscribe, unsubscribe };
}

/**
 * Hook spécialisé pour les dossiers
 */
export function useFolderRealtime(classeurId: string, userId: string) {
  const { subscribe, unsubscribe } = useRealtime({
    userId,
    type: 'polling',
    interval: 3000
  });

  useEffect(() => {
    if (!classeurId || !userId) return;

    const handleFolderChange = (event: ChangeEvent) => {
      if (event.table === 'folders') {
        switch (event.eventType) {
          case 'UPDATE':
            if (event.new?.classeur_id === classeurId) {
              console.log('📁 Dossier modifié en temps réel:', event);
              // Ici vous pouvez déclencher une action (recharger la liste, etc.)
            }
            break;
          case 'INSERT':
            if (event.new?.classeur_id === classeurId) {
              console.log('📁 Nouveau dossier créé en temps réel:', event);
              // Ici vous pouvez déclencher une action (ajouter à la liste, etc.)
            }
            break;
          case 'DELETE':
            console.log('🗑️ Dossier supprimé en temps réel:', event);
            // Ici vous pouvez déclencher une action (retirer de la liste, etc.)
            break;
        }
      }
    };

    const handleArticleChange = (event: ChangeEvent) => {
      if (event.table === 'articles') {
        switch (event.eventType) {
          case 'UPDATE':
            if (event.new?.classeur_id === classeurId) {
              console.log('📄 Article modifié en temps réel:', event);
              // Ici vous pouvez déclencher une action (recharger la liste, etc.)
            }
            break;
          case 'INSERT':
            if (event.new?.classeur_id === classeurId) {
              console.log('📄 Nouvel article créé en temps réel:', event);
              // Ici vous pouvez déclencher une action (ajouter à la liste, etc.)
            }
            break;
          case 'DELETE':
            console.log('🗑️ Article supprimé en temps réel:', event);
            // Ici vous pouvez déclencher une action (retirer de la liste, etc.)
            break;
        }
      }
    };

    subscribe('folders', handleFolderChange);
    subscribe('articles', handleArticleChange);

    return () => {
      unsubscribe('folders', handleFolderChange);
      unsubscribe('articles', handleArticleChange);
    };
  }, [classeurId, userId, subscribe, unsubscribe]);

  return { subscribe, unsubscribe };
} 