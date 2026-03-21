/**
 * Hook de synchronisation temps-réel des sessions chat via Supabase Realtime.
 *
 * Corrections v2 :
 * - Stale closure corrigé : lecture du store via getState() dans le handler
 * - Reconnexion robuste : backoff exponentiel sur CHANNEL_ERROR / TIMED_OUT
 * - Circuit breaker avec cooldown 5min (évite la boucle reconnexion infinie)
 * - Cleanup propre : supabase.removeChannel() au lieu de unsubscribe() seul
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

const MAX_RECONNECT_ATTEMPTS = 10;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function useChatSessionsRealtime(userId: string | null | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const resubscribeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const healthcheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const resubscribeAttemptRef = useRef(0);
  const resubInProgressRef = useRef(false);
  const circuitBreakerRef = useRef(false);
  const circuitBreakerOpenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    const supabase = getSupabaseClient();
    let isCancelled = false;

    const clearResubTimer = () => {
      if (resubscribeTimerRef.current) {
        clearTimeout(resubscribeTimerRef.current);
        resubscribeTimerRef.current = null;
      }
    };

    const handleRealtimeChange = (payload: RealtimeSessionPayload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      logger.info('[ChatSessionsRealtime] 📡 Changement détecté', {
        eventType,
        sessionId: newRecord?.id || oldRecord?.id,
      });

      // Lecture fraîche du store à chaque événement (évite stale closure)
      const {
        sessions,
        setSessions,
        currentSession,
        setCurrentSession,
        deletingSessions: deletingIds,
      } = useChatStore.getState();

      switch (eventType) {
        case 'INSERT': {
          if (!deletingIds.has(newRecord.id)) {
            setSessions([newRecord, ...sessions]);
            logger.info('[ChatSessionsRealtime] ➕ Session ajoutée', {
              sessionId: newRecord.id,
              name: newRecord.name,
            });
          }
          break;
        }

        case 'UPDATE': {
          if (deletingIds.has(newRecord.id)) break;

          setSessions(sessions.map((s) =>
            s.id === newRecord.id ? { ...s, ...newRecord } : s
          ));

          if (currentSession?.id === newRecord.id) {
            setCurrentSession({ ...currentSession, ...newRecord });
          }

          logger.info('[ChatSessionsRealtime] ✏️ Session mise à jour', {
            sessionId: newRecord.id,
            nameChange:
              oldRecord?.name !== newRecord.name
                ? `${oldRecord?.name} → ${newRecord.name}`
                : undefined,
          });
          break;
        }

        case 'DELETE': {
          const updated = sessions.filter((s) => s.id !== oldRecord.id);
          setSessions(updated);

          if (currentSession?.id === oldRecord.id) {
            setCurrentSession(updated[0] ?? null);
          }

          logger.info('[ChatSessionsRealtime] 🗑️ Session supprimée', {
            sessionId: oldRecord.id,
          });
          break;
        }
      }
    };

    const subscribe = async () => {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (isCancelled) return;

      if (authError || !session?.access_token || !session?.user?.id) {
        logger.error('[ChatSessionsRealtime] ❌ Auth invalide, realtime désactivé', {
          userId,
          authError: authError?.message,
        });
        return;
      }

      const channelName = `chat_sessions:${userId}`;
      const channel = supabase
        .channel(channelName)
        .on<ChatSession>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_sessions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            handleRealtimeChange(payload as unknown as RealtimeSessionPayload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resubscribeAttemptRef.current = 0;
            circuitBreakerRef.current = false;
            circuitBreakerOpenAtRef.current = null;
            clearResubTimer();
            logger.info('[ChatSessionsRealtime] ✅ Abonné à chat_sessions', { userId });
            return;
          }

          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !isCancelled && !circuitBreakerRef.current) {
            const nextAttempt = resubscribeAttemptRef.current + 1;

            if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
              circuitBreakerRef.current = true;
              circuitBreakerOpenAtRef.current = Date.now();
              logger.error('[ChatSessionsRealtime] 🛑 Circuit breaker activé', {
                userId,
                attempts: nextAttempt - 1,
                cooldownMs: CIRCUIT_BREAKER_COOLDOWN_MS,
              });
              return;
            }

            resubscribeAttemptRef.current = nextAttempt;
            if (resubInProgressRef.current) return;
            resubInProgressRef.current = true;

            const delayMs = Math.min(10000, 500 * Math.pow(2, nextAttempt - 1));
            logger.warn('[ChatSessionsRealtime] 🔄 Reconnexion', {
              userId,
              status,
              attempt: nextAttempt,
              delayMs,
            });
            clearResubTimer();
            resubscribeTimerRef.current = setTimeout(() => {
              if (!isCancelled && !circuitBreakerRef.current) {
                Promise.resolve()
                  .then(() => {
                    if (channelRef.current) supabase.removeChannel(channelRef.current);
                  })
                  .catch(() => undefined)
                  .then(() => {
                    channelRef.current = null;
                    return subscribe();
                  })
                  .catch((err) => {
                    logger.error('[ChatSessionsRealtime] ❌ Resubscribe échoué', {
                      error: err instanceof Error ? err.message : String(err),
                    });
                  })
                  .finally(() => {
                    resubInProgressRef.current = false;
                  });
              }
            }, delayMs);
          }
        });

      if (!isCancelled) {
        channelRef.current = channel;
      } else {
        supabase.removeChannel(channel);
      }
    };

    subscribe();

    // Healthcheck : resubscribe si canal absent ou non connecté.
    // Respecte le circuit breaker avec cooldown CIRCUIT_BREAKER_COOLDOWN_MS.
    healthcheckTimerRef.current = setInterval(() => {
      if (isCancelled) return;

      if (circuitBreakerRef.current) {
        const openAt = circuitBreakerOpenAtRef.current;
        const elapsed = openAt !== null ? Date.now() - openAt : 0;
        if (elapsed < CIRCUIT_BREAKER_COOLDOWN_MS) return;
        circuitBreakerRef.current = false;
        circuitBreakerOpenAtRef.current = null;
        resubscribeAttemptRef.current = 0;
        logger.info('[ChatSessionsRealtime] 🩺 Cooldown terminé, reprise', { userId });
      }

      if (resubInProgressRef.current) return;

      const channelState = channelRef.current?.state;
      const isHealthy = channelRef.current && channelState === 'joined';

      if (!channelRef.current || !isHealthy) {
        logger.warn('[ChatSessionsRealtime] 🩺 Healthcheck resubscribe', {
          userId,
          channelState,
        });
        clearResubTimer();
        resubscribeAttemptRef.current = 0;
        resubInProgressRef.current = true;
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        subscribe().finally(() => {
          resubInProgressRef.current = false;
        });
      }
    }, 60 * 1000);

    // Resubscribe sur SIGNED_IN si le canal n'est pas connecté.
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (isCancelled) return;
      if (event === 'SIGNED_IN') {
        const channelState = channelRef.current?.state;
        if (channelState === 'joined') return;
        if (resubInProgressRef.current) return;
        logger.info('[ChatSessionsRealtime] 🔄 SIGNED_IN - resubscription', { userId });
        resubscribeAttemptRef.current = 0;
        circuitBreakerRef.current = false;
        circuitBreakerOpenAtRef.current = null;
        resubInProgressRef.current = true;
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        subscribe().finally(() => {
          resubInProgressRef.current = false;
        });
      }
    });
    authUnsubscribeRef.current = authListener?.subscription.unsubscribe ?? null;

    return () => {
      isCancelled = true;
      clearResubTimer();
      resubInProgressRef.current = false;
      if (healthcheckTimerRef.current) {
        clearInterval(healthcheckTimerRef.current);
        healthcheckTimerRef.current = null;
      }
      if (authUnsubscribeRef.current) {
        authUnsubscribeRef.current();
        authUnsubscribeRef.current = null;
      }
      if (channelRef.current) {
        const toRemove = channelRef.current;
        channelRef.current = null;
        supabase.removeChannel(toRemove);
        logger.info('[ChatSessionsRealtime] 🔌 Désinscrit', { userId });
      }
    };
  }, [userId]);

  return {
    isConnected: channelRef.current?.state === 'joined',
  };
}
