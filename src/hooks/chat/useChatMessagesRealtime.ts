/**
 * Sync temps réel des messages d'une session (Supabase Realtime).
 * Même robustesse que useChatSessionsRealtime : backoff, circuit breaker, healthcheck.
 */

import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';
import type { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';

const MAX_RECONNECT_ATTEMPTS = 10;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

interface RealtimeMessagePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

/** Aligné sur HistoryManager.getRecentMessages (snake_case → camelCase). */
function mapDbRowToChatMessage(row: Record<string, unknown>): ChatMessage | null {
  if (!row?.id || typeof row.role !== 'string' || typeof row.content !== 'string') {
    return null;
  }
  const mapped: Record<string, unknown> = { ...row };
  if (row.attached_images != null) {
    mapped.attachedImages = row.attached_images;
  }
  if (row.attached_notes != null) {
    mapped.attachedNotes = row.attached_notes;
  }
  if (row.canvas_selections != null) {
    mapped.canvasSelections = row.canvas_selections;
  }
  return mapped as unknown as ChatMessage;
}

export function useChatMessagesRealtime(
  sessionId: string | null,
  upsertMessage: (msg: ChatMessage) => void,
  removeMessageById: (id: string) => void
): void {
  const upsertRef = useRef(upsertMessage);
  const removeRef = useRef(removeMessageById);
  upsertRef.current = upsertMessage;
  removeRef.current = removeMessageById;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const resubscribeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthcheckTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const resubscribeAttemptRef = useRef(0);
  const resubInProgressRef = useRef(false);
  const circuitBreakerRef = useRef(false);
  const circuitBreakerOpenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = getSupabaseClient();
    let isCancelled = false;

    const clearResubTimer = () => {
      if (resubscribeTimerRef.current) {
        clearTimeout(resubscribeTimerRef.current);
        resubscribeTimerRef.current = null;
      }
    };

    const handleRealtimeChange = (payload: RealtimeMessagePayload) => {
      const { eventType, new: newRow, old: oldRow } = payload;

      if (eventType === 'DELETE') {
        const id = oldRow?.id;
        if (typeof id === 'string') {
          removeRef.current(id);
          logger.info('[ChatMessagesRealtime] 🗑️ Message supprimé', { id, sessionId });
        }
        return;
      }

      if (eventType !== 'INSERT' && eventType !== 'UPDATE') return;

      const row = newRow;
      if (!row || typeof row !== 'object') return;

      const mapped = mapDbRowToChatMessage(row);
      if (!mapped) {
        logger.warn('[ChatMessagesRealtime] ⚠️ Ligne ignorée (mapping invalide)', {
          sessionId,
          eventType,
        });
        return;
      }

      upsertRef.current(mapped);
      logger.info('[ChatMessagesRealtime] 📡 Message upsert', {
        sessionId,
        eventType,
        messageId: mapped.id,
      });
    };

    const subscribe = async () => {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();

      if (isCancelled) return;

      if (authError || !session?.access_token) {
        logger.error('[ChatMessagesRealtime] ❌ Auth invalide, realtime désactivé', {
          sessionId,
          authError: authError?.message,
        });
        return;
      }

      const channelName = `chat_messages:${sessionId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${sessionId}`,
          },
          (payload) => {
            handleRealtimeChange(payload as unknown as RealtimeMessagePayload);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resubscribeAttemptRef.current = 0;
            circuitBreakerRef.current = false;
            circuitBreakerOpenAtRef.current = null;
            clearResubTimer();
            logger.info('[ChatMessagesRealtime] ✅ Abonné à chat_messages', { sessionId });
            return;
          }

          if (
            (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') &&
            !isCancelled &&
            !circuitBreakerRef.current
          ) {
            const nextAttempt = resubscribeAttemptRef.current + 1;

            if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
              circuitBreakerRef.current = true;
              circuitBreakerOpenAtRef.current = Date.now();
              logger.error('[ChatMessagesRealtime] 🛑 Circuit breaker activé', {
                sessionId,
                attempts: nextAttempt - 1,
                cooldownMs: CIRCUIT_BREAKER_COOLDOWN_MS,
              });
              return;
            }

            resubscribeAttemptRef.current = nextAttempt;
            if (resubInProgressRef.current) return;
            resubInProgressRef.current = true;

            const delayMs = Math.min(10000, 500 * Math.pow(2, nextAttempt - 1));
            logger.warn('[ChatMessagesRealtime] 🔄 Reconnexion', {
              sessionId,
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
                    logger.error('[ChatMessagesRealtime] ❌ Resubscribe échoué', {
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

    healthcheckTimerRef.current = setInterval(() => {
      if (isCancelled) return;

      if (circuitBreakerRef.current) {
        const openAt = circuitBreakerOpenAtRef.current;
        const elapsed = openAt !== null ? Date.now() - openAt : 0;
        if (elapsed < CIRCUIT_BREAKER_COOLDOWN_MS) return;
        circuitBreakerRef.current = false;
        circuitBreakerOpenAtRef.current = null;
        resubscribeAttemptRef.current = 0;
        logger.info('[ChatMessagesRealtime] 🩺 Cooldown terminé, reprise', { sessionId });
      }

      if (resubInProgressRef.current) return;

      const channelState = channelRef.current?.state;
      const isHealthy = channelRef.current && channelState === 'joined';

      if (!channelRef.current || !isHealthy) {
        logger.warn('[ChatMessagesRealtime] 🩺 Healthcheck resubscribe', {
          sessionId,
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

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (isCancelled) return;
      if (event === 'SIGNED_IN') {
        const channelState = channelRef.current?.state;
        if (channelState === 'joined') return;
        if (resubInProgressRef.current) return;
        logger.info('[ChatMessagesRealtime] 🔄 SIGNED_IN - resubscription', { sessionId });
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
        logger.info('[ChatMessagesRealtime] 🔌 Désinscrit', { sessionId });
      }
    };
  }, [sessionId]);
}
