"use client";

import { useState, useEffect, useRef } from 'react';
import { subscribeToNotes, subscribeToDossiers, subscribeToClasseurs, unsubscribeFromAll, startSubscriptionMonitoring } from '@/realtime/dispatcher';
import { supabase } from '@/supabaseClient';
// ANCIEN SYSTÈME DÉSACTIVÉ - Utilisation du nouveau système realtime
import { initRealtimeService, subscribeToTable as subscribeToPolling, unsubscribeFromTable as unsubscribeFromPolling, stopRealtimeService } from '@/services/realtimeService';
// import { initWebSocketService, subscribeToTable as subscribeToWebSocket, unsubscribeFromTable as unsubscribeFromWebSocket, stopWebSocketService } from '@/services/websocketService';
// import * as supabaseRealtimeService from '@/services/supabaseRealtimeService';
// import { initSSEService, subscribeToTable, unsubscribeFromTable, stopSSEService } from '@/services/sseService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { useAuth } from './useAuth';
import { logApi } from '@/utils/logger';
import { simpleLogger as logger } from '@/utils/logger';

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
   * Signature : (event: { type: string, payload: unknown, timestamp: number }) => void
   * L'utilisateur peut dispatcher comme il veut dans son UI ou son store.
   */
  onEvent?: (event: { type: string, payload: unknown, timestamp: number }) => void;
}

interface ChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: any;
  old: any;
  timestamp: number;
  diff?: any; // Pour les événements UPDATE avec diff
}

/**
 * Hook pour démarrer les souscriptions Supabase Realtime
 */
export function useSupabaseRealtime() {
  const [isConnected, setIsConnected] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    // TOUT EST COMMENTÉ POUR DÉSACTIVER LE REALTIME
    // if (initialized.current) {
    //   return;
    // }
    // logger.dev('[REALTIME] 🚀 Démarrage des souscriptions Supabase Realtime...');
    // const setupRealtime = async () => {
    //   try {
    //     logger.dev('[REALTIME] 🔐 Authentification anonyme...');
    //     const { data: { user }, error: authError } = await supabase.auth.getUser();
    //     if (!user) {
    //       logger.dev('[REALTIME] 🔐 Création session anonyme...');
    //       const { data, error } = await supabase.auth.signInAnonymously();
    //       if (error) {
    //         logger.dev('[REALTIME] ⚠️ Erreur auth anonyme:', error.message);
    //       } else {
    //         logger.dev('[REALTIME] ✅ Session anonyme créée');
    //       }
    //     } else {
    //       logger.dev('[REALTIME] ✅ Utilisateur déjà authentifié:', user.id);
    //     }
    //     initialized.current = true;
    //     logger.dev('[REALTIME] 🚀 Démarrage des souscriptions...');
    //     subscribeToNotes();
    //     subscribeToDossiers();
    //     subscribeToClasseurs();
    //     startSubscriptionMonitoring();
    //     setIsConnected(true);
    //   } catch (error) {
    //     logger.error('[REALTIME] ❌ Erreur lors de l\'activation des souscriptions realtime:', error);
    //     setTimeout(setupRealtime, 3000);
    //   }
    // };
    // setTimeout(setupRealtime, 2000);
    // return () => {
    //   logger.dev('[REALTIME] 🛑 Arrêt des souscriptions...');
    //   unsubscribeFromAll();
    //   setIsConnected(false);
    //   initialized.current = false;
    // };
  }, []);

  return { isConnected };
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

  const REALTIME_PROVIDER = process.env.NEXT_PUBLIC_REALTIME_PROVIDER || 'websocket';
  const isSupabase = REALTIME_PROVIDER === 'supabase';
  // 🚧 Temp: Authentification non implémentée
  // TODO: Remplacer USER_ID par l'authentification Supabase

  // Handler générique pour tous les events WebSocket/Supabase
  useEffect(() => {
    if (config.type !== 'websocket' || !config.onEvent) return;
    
    // 🚧 Temp: Authentification non implémentée
    // TODO: Remplacer USER_ID par l'authentification Supabase
    // TODO: Affiner le typage de subscribeToWebSocket pour gérer le cas spécifique de la table 'all'
    if (isSupabase) {
      // Supabase realtime service does not have a direct subscribe method for tables
      // This is a placeholder for future implementation if needed
      logger.warn('Supabase realtime service does not support direct table subscription. Consider using a different provider or implementing a custom solution.');
    } else {
      // WebSocket realtime service does not have a direct subscribe method for tables
      // This is a placeholder for future implementation if needed
      logger.warn('WebSocket realtime service does not support direct table subscription. Consider using a different provider or implementing a custom solution.');
    }
  }, [config.type, config.token, config.onEvent, config.debug]);

  useEffect(() => {
    if (initialized.current) return;
    try {
      switch (config.type) {
        case 'polling':
          if (!config.userId) {
            const fallbackUserId = process.env.NEXT_PUBLIC_FALLBACK_USER_ID;
            if (!fallbackUserId) {
              logApi('realtime', 'Aucun userId fourni et aucun fallback configuré');
              throw new Error('userId requis pour le polling');
            }
            logApi('realtime', `Utilisation du fallback userId: ${fallbackUserId}`);
            initRealtimeService(fallbackUserId);
          } else {
            logApi('realtime', `Initialisation polling avec userId: ${config.userId}`);
            initRealtimeService(config.userId);
          }
          break;
        case 'websocket':
          if (isSupabase) {
            // Pas d'init requis pour supabaseRealtimeService
          } else {
            if (!config.wsUrl || !config.token) throw new Error('wsUrl et token requis pour WebSocket');
            // initWebSocketService(config.wsUrl, config.token, !!config.debug, config.onError); // ANCIEN SYSTÈME DÉSACTIVÉ
          }
          break;
        case 'sse':
          // À implémenter si besoin
          break;
        default:
          throw new Error(`Type de realtime non supporté: ${config.type}`);
      }
      initialized.current = true;
      if (config.debug) logger.dev(`🔄 Service realtime initialisé (${config.type})`);
    } catch (error) {
      if (config.debug) logger.error('❌ Erreur initialisation realtime:', error);
      if (config.onError) config.onError(error);
    }
    // Cleanup
    return () => {
      try {
        switch (config.type) {
          case 'polling':
            stopRealtimeService(); // ANCIEN SYSTÈME DÉSACTIVÉ
            break;
          case 'websocket':
            if (isSupabase) {
              // Pas de stop pour supabaseRealtimeService
            } else {
              // stopWebSocketService(); // ANCIEN SYSTÈME DÉSACTIVÉ
            }
            break;
          case 'sse':
            // À implémenter si besoin
            break;
        }
        initialized.current = false;
      } catch (error) {
        if (config.debug) logger.error('❌ Erreur cleanup realtime:', error);
        if (config.onError) config.onError(error);
      }
    };
  }, [config.type, config.userId, config.wsUrl, config.token, config.debug, config.onError]);

  /**
   * S'abonner aux changements d'une table
   */
  const subscribe = (table: string, callback: (event: ChangeEvent) => void) => {
    listeners.current.set(table, callback);
    // ANCIEN SYSTÈME DÉSACTIVÉ - Utilisation du nouveau système realtime
    // logger.dev(`[useRealtime] 🚫 Ancien système realtime désactivé pour ${table} - Utilisation du nouveau système`);
    
    if (config.type === 'polling') {
      subscribeToPolling(table, callback);
    }
  };

  /**
   * Se désabonner des changements
   */
  const unsubscribe = (table: string, callback: (event: ChangeEvent) => void) => {
    listeners.current.delete(table);
    // ANCIEN SYSTÈME DÉSACTIVÉ - Utilisation du nouveau système realtime
    // logger.dev(`[useRealtime] 🚫 Ancien système realtime désactivé pour ${table} - Utilisation du nouveau système`);
    
    if (config.type === 'polling') {
      unsubscribeFromPolling(table, callback);
    }
  };

  /**
   * S'abonner à plusieurs tables
   */
  const subscribeToTables = (tables: string[], _callback: (event: ChangeEvent) => void) => {
    tables.forEach(table => {
              subscribe(table, _callback);
    });
  };

  /**
   * Se désabonner de plusieurs tables
   */
  const unsubscribeFromTables = (tables: string[], _callback: (event: ChangeEvent) => void) => {
    tables.forEach(table => {
              unsubscribe(table, _callback);
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
              if (event.diff) {
                useFileSystemStore.getState().applyDiff(noteId, event.diff);
              } else {
                useFileSystemStore.getState().updateNote(noteId, event.new);
              }
            }
            break;
          case 'DELETE':
            if (event.old?.id === noteId) {
              logger.dev('🗑️ Note supprimée en temps réel:', event);
              // Ici vous pouvez déclencher une action (rediriger, etc.)
            }
            break;
          case 'INSERT':
            logger.dev('➕ Nouvelle note créée en temps réel:', event);
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
              logger.dev('📁 Dossier modifié en temps réel:', event);
              // Ici vous pouvez déclencher une action (recharger la liste, etc.)
            }
            break;
          case 'INSERT':
            if (event.new?.classeur_id === classeurId) {
              logger.dev('📁 Nouveau dossier créé en temps réel:', event);
              // Ici vous pouvez déclencher une action (ajouter à la liste, etc.)
            }
            break;
          case 'DELETE':
            logger.dev('🗑️ Dossier supprimé en temps réel:', event);
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
              if (event.diff) {
                useFileSystemStore.getState().applyDiff(event.new.id, event.diff);
              } else {
                useFileSystemStore.getState().updateNote(event.new.id, event.new);
              }
            }
            break;
          case 'INSERT':
            if (event.new?.classeur_id === classeurId) {
              logger.dev('📄 Nouvel article créé en temps réel:', event);
              // Ici vous pouvez déclencher une action (ajouter à la liste, etc.)
            }
            break;
          case 'DELETE':
            logger.dev('🗑️ Article supprimé en temps réel:', event);
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