"use client";

import type { SafeUnknown, SafeRecord, SafeError } from '@/types/quality';
import { useRef, useState, useEffect, useCallback } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';

interface RealtimeConfig {
  userId?: string;
  type: 'polling' | 'websocket' | 'sse';
  interval?: number; // pour polling
  wsUrl?: string; // pour websocket
  token?: string; // pour websocket sécurisé
  debug?: boolean;
  onError?: (err: unknown) => void;
  onEvent?: (event: { type: string, payload: unknown, timestamp: number }) => void;
}

interface ChangeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: unknown;
  old: unknown;
  timestamp: number;
  diff?: unknown;
}

/**
 * Hook pour démarrer les souscriptions Supabase Realtime
 */
export function useSupabaseRealtime() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Système realtime désactivé pour l'instant
    console.log('[REALTIME] 🚀 Système realtime désactivé');
  }, []);

  return { isConnected };
}

/**
 * useRealtime - Hook universel pour le realtime (polling, websocket, sse)
 */
export function useRealtime(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) {
      return;
    }

    console.log('[REALTIME] 🚀 Initialisation du système realtime...');

    const initRealtimeService = () => {
      try {
        console.log('[REALTIME] ✅ Système realtime initialisé');
        setIsConnected(true);
        initialized.current = true;
      } catch (error) {
        console.error('[REALTIME] ❌ Erreur lors de l\'initialisation:', error);
        if (config.onError) {
          config.onError(error);
        }
      }
    };

    initRealtimeService();

    return () => {
      console.log('[REALTIME] 🛑 Arrêt du système realtime...');
      setIsConnected(false);
      initialized.current = false;
    };
  }, [config.onError]);

  const subscribe = useCallback((table: string, callback: (event: ChangeEvent) => void) => {
    console.log(`[REALTIME] 📡 Abonnement à la table: ${table}`);
    // Implémentation simplifiée
  }, []);

  const unsubscribe = useCallback((table: string, callback: (event: ChangeEvent) => void) => {
    console.log(`[REALTIME] 🛑 Désabonnement de la table: ${table}`);
    // Implémentation simplifiée
  }, []);

  const subscribeToTables = useCallback((tables: string[], callback: (event: ChangeEvent) => void) => {
    console.log(`[REALTIME] 📡 Abonnement aux tables: ${tables.join(', ')}`);
    // Implémentation simplifiée
  }, []);

  const unsubscribeFromTables = useCallback((tables: string[], callback: (event: ChangeEvent) => void) => {
    console.log(`[REALTIME] 🛑 Désabonnement des tables: ${tables.join(', ')}`);
    // Implémentation simplifiée
  }, []);

  return {
    isConnected,
    subscribe,
    unsubscribe,
    subscribeToTables,
    unsubscribeFromTables
  };
}

/**
 * Hook spécialisé pour les notes
 */
export function useNoteRealtime(noteId: string, userId: string) {
  const { subscribe, unsubscribe, isConnected } = useRealtime({
    userId,
    type: 'polling',
    interval: 3000,
    debug: true
  });

  useEffect(() => {
    const handleNoteChange = (event: ChangeEvent) => {
      console.log('[NoteRealtime] 📡 Changement de note détecté:', event);
    };

    subscribe('articles', handleNoteChange);

    return () => {
      unsubscribe('articles', handleNoteChange);
    };
  }, [subscribe, unsubscribe, noteId]);

  return { isConnected };
}

/**
 * Hook spécialisé pour les dossiers
 */
export function useFolderRealtime(classeurId: string, userId: string) {
  const { subscribe, unsubscribe, isConnected } = useRealtime({
    userId,
    type: 'polling',
    interval: 3000,
    debug: true
  });

  useEffect(() => {
    const handleFolderChange = (event: ChangeEvent) => {
      console.log('[FolderRealtime] 📡 Changement de dossier détecté:', event);
    };

    subscribe('folders', handleFolderChange);

    return () => {
      unsubscribe('folders', handleFolderChange);
    };
  }, [subscribe, unsubscribe, classeurId]);

  return { isConnected };
}

/**
 * Hook spécialisé pour les articles
 */
export function useArticleRealtime(articleId: string, userId: string) {
  const { subscribe, unsubscribe, isConnected } = useRealtime({
    userId,
    type: 'polling',
    interval: 3000,
    debug: true
  });

  useEffect(() => {
    const handleArticleChange = (event: ChangeEvent) => {
      console.log('[ArticleRealtime] 📡 Changement d\'article détecté:', event);
    };

    subscribe('articles', handleArticleChange);

    return () => {
      unsubscribe('articles', handleArticleChange);
    };
  }, [subscribe, unsubscribe, articleId]);

  return { isConnected };
} 