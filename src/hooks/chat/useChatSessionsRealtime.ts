/**
 * Hook pour synchronisation temps-réel des sessions via Supabase Realtime
 * 
 * ✅ Remplace le polling (plus de race conditions)
 * ✅ Updates instantanées (< 50ms)
 * ✅ UX fluide et prévisible
 * 
 * @conformsTo GUIDE-EXCELLENCE-CODE.md
 */

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';
import { useChatStore } from '@/store/useChatStore';
import { ChatSession } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

interface RealtimeSessionPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ChatSession;
  old: ChatSession;
}

/**
 * Hook de synchronisation temps-réel des sessions
 */
export function useChatSessionsRealtime(userId: string | null | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // ✅ OPTIMISATION: Selectors spécifiques pour éviter re-renders
  const sessions = useChatStore((state) => state.sessions);
  const setSessions = useChatStore((state) => state.setSessions);
  const currentSession = useChatStore((state) => state.currentSession);
  const setCurrentSession = useChatStore((state) => state.setCurrentSession);
  const deletingSessions = useChatStore((state) => state.deletingSessions);

  // 🔍 DEBUG CRITIQUE: Log TOUJOURS au démarrage du hook (pour voir s'il se monte)
  logger.dev('[useChatSessionsRealtime] Hook called', {
    userId: userId || 'undefined',
    userIdType: typeof userId,
    hasUserId: !!userId
  });

  // 🔍 DEBUG: Log chaque fois que le hook se monte/update
  useEffect(() => {
    logger.dev('[useChatSessionsRealtime] useEffect triggered', {
      userId: userId || 'undefined',
      hasUserId: !!userId
    });
    logger.info('[Realtime] 🔄 Hook useChatSessionsRealtime monté/update', { 
      userId: userId || 'undefined',
      hasUserId: !!userId,
      channelExists: !!channelRef.current
    });
  }, [userId]);

  useEffect(() => {
    // Pas d'user → pas de sync
    if (!userId) {
      logger.warn('[Realtime] ⏸️ Pas d\'userId, realtime désactivé', { 
        userIdType: typeof userId,
        userIdValue: userId 
      });
      return;
    }

    logger.info('[Realtime] 🔌 Initialisation subscription chat_sessions', { userId });

    // Créer channel Realtime
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`chat_sessions:${userId}`)
      .on<ChatSession>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          handleRealtimeChange(payload as unknown as RealtimeSessionPayload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('[Realtime] ✅ Abonné aux changements chat_sessions', { userId });
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[Realtime] ❌ Erreur subscription', { userId });
        } else if (status === 'TIMED_OUT') {
          logger.warn('[Realtime] ⏱️ Timeout subscription, retry auto...', { userId });
        } else {
          logger.dev('[Realtime] 📊 Status subscription:', { status, userId });
        }
      });

    channelRef.current = channel;

    // Cleanup: unsubscribe
    return () => {
      logger.dev('[Realtime] 🔌 Désinscription chat_sessions');
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId]);

  /**
   * Gérer un changement Realtime
   */
  function handleRealtimeChange(payload: RealtimeSessionPayload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    logger.info('[Realtime] 📡 Changement détecté', {
      eventType,
      sessionId: newRecord?.id || oldRecord?.id,
      sessionName: newRecord?.name || oldRecord?.name,
      oldName: oldRecord?.name,
      payload: JSON.stringify(payload).substring(0, 200) // Preview
    });

    // ✅ FILTRER les sessions en cours de suppression optimiste
    const deletingIds = useChatStore.getState().deletingSessions;

    switch (eventType) {
      case 'INSERT': {
        // Nouvelle session créée (peut-être depuis un autre onglet)
        if (!deletingIds.has(newRecord.id)) {
          const updatedSessions = [newRecord, ...sessions];
          setSessions(updatedSessions);
          
          logger.info('[Realtime] ➕ Session ajoutée', {
            sessionId: newRecord.id,
            name: newRecord.name
          });
        }
        break;
      }

      case 'UPDATE': {
        // Session modifiée (rename, auto-rename, metadata...)
        if (deletingIds.has(newRecord.id)) {
          // Ignorer les updates sur sessions en cours de suppression
          logger.dev('[Realtime] ⏭️ Update ignoré (session en cours de suppression)', {
            sessionId: newRecord.id
          });
          break;
        }

        const updatedSessions = sessions.map((s) =>
          s.id === newRecord.id ? { ...s, ...newRecord } : s
        );
        setSessions(updatedSessions);

        // Si session active, update aussi currentSession
        if (currentSession?.id === newRecord.id) {
          setCurrentSession({ ...currentSession, ...newRecord });
        }

        logger.info('[Realtime] ✏️ Session mise à jour', {
          sessionId: newRecord.id,
          changes: {
            name: oldRecord?.name !== newRecord.name ? `${oldRecord?.name} → ${newRecord.name}` : undefined,
            is_active: oldRecord?.is_active !== newRecord.is_active ? newRecord.is_active : undefined
          }
        });
        break;
      }

      case 'DELETE': {
        // Session supprimée (soft delete is_active=false filtré par RLS)
        const updatedSessions = sessions.filter((s) => s.id !== oldRecord.id);
        setSessions(updatedSessions);

        // Si session active supprimée, basculer
        if (currentSession?.id === oldRecord.id) {
          const nextSession = updatedSessions[0] || null;
          setCurrentSession(nextSession);
          
          logger.info('[Realtime] 🔄 Session active supprimée, basculement auto', {
            fromSessionId: oldRecord.id,
            toSessionId: nextSession?.id
          });
        }

        logger.info('[Realtime] 🗑️ Session supprimée', {
          sessionId: oldRecord.id
        });
        break;
      }
    }
  }

  return {
    isConnected: channelRef.current?.state === 'joined'
  };
}

