import { useEffect, useRef } from 'react';
import { initRealtimeService, subscribeToTable, unsubscribeFromTable, stopRealtimeService } from '@/services/realtimeService';
// import { initWebSocketService, subscribeToTable, unsubscribeFromTable, stopWebSocketService } from '@/services/websocketService';
// import { initSSEService, subscribeToTable, unsubscribeFromTable, stopSSEService } from '@/services/sseService';

interface RealtimeConfig {
  userId: string;
  type: 'polling' | 'websocket' | 'sse';
  interval?: number; // pour polling
  wsUrl?: string; // pour websocket
  sseUrl?: string; // pour sse
}

interface ChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: number;
}

/**
 * Hook pour remplacer Supabase Realtime
 * Supporte polling, WebSocket et SSE
 */
export function useRealtime(config: RealtimeConfig) {
  const initialized = useRef(false);
  const listeners = useRef<Map<string, (event: ChangeEvent) => void>>(new Map());

  // Initialiser le service
  useEffect(() => {
    if (initialized.current) return;

    try {
      switch (config.type) {
        case 'polling':
          initRealtimeService(config.userId);
          break;
        case 'websocket':
          if (!config.wsUrl) throw new Error('wsUrl requis pour WebSocket');
          // initWebSocketService(config.wsUrl, config.userId);
          break;
        case 'sse':
          if (!config.sseUrl) throw new Error('sseUrl requis pour SSE');
          // initSSEService(config.sseUrl, config.userId);
          break;
        default:
          throw new Error(`Type de realtime non supporté: ${config.type}`);
      }
      
      initialized.current = true;
      console.log(`🔄 Service realtime initialisé (${config.type})`);
    } catch (error) {
      console.error('❌ Erreur initialisation realtime:', error);
    }

    // Cleanup
    return () => {
      try {
        switch (config.type) {
          case 'polling':
            stopRealtimeService();
            break;
          case 'websocket':
            // stopWebSocketService();
            break;
          case 'sse':
            // stopSSEService();
            break;
        }
        initialized.current = false;
      } catch (error) {
        console.error('❌ Erreur cleanup realtime:', error);
      }
    };
  }, [config.userId, config.type, config.wsUrl, config.sseUrl]);

  /**
   * S'abonner aux changements d'une table
   */
  const subscribe = (table: string, callback: (event: ChangeEvent) => void) => {
    // Stocker le listener pour cleanup
    listeners.current.set(table, callback);
    
    // S'abonner via le service
    subscribeToTable(table, callback);
  };

  /**
   * Se désabonner des changements
   */
  const unsubscribe = (table: string) => {
    const callback = listeners.current.get(table);
    if (callback) {
      unsubscribeFromTable(table, callback);
      listeners.current.delete(table);
    }
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
  const unsubscribeFromTables = (tables: string[]) => {
    tables.forEach(table => {
      unsubscribe(table);
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
      unsubscribe('articles');
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
      unsubscribe('folders');
      unsubscribe('articles');
    };
  }, [classeurId, userId, subscribe, unsubscribe]);

  return { subscribe, unsubscribe };
} 