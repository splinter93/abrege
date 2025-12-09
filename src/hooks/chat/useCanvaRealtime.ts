import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger, LogCategory } from '@/utils/logger';
import { useCanvaStore } from '@/store/useCanvaStore';
import type { CanvaSession, RealtimePostgresChangesPayload } from '@/types/canva';
import { getEventType } from '@/types/canva';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';

/**
 * ✅ Hook Supabase Realtime pour canva_sessions
 * 
 * Écoute les changements DB (INSERT/UPDATE/DELETE) et synchronise le store local
 * Pattern identique à useRealtime pour l'éditeur
 * 
 * @param chatSessionId - ID de la session chat pour filtrer les canvases
 * @param enabled - Activer/désactiver l'écoute (défaut: true)
 */
export function useCanvaRealtime(chatSessionId: string | null, enabled = true) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sessionsRef = useRef(useCanvaStore.getState().sessions);
  const resubscribeAttemptRef = useRef(0);
  const resubscribeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const authUnsubscribeRef = useRef<(() => void) | null>(null);
  const healthcheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventAtRef = useRef<number>(Date.now());
  const resubInProgressRef = useRef(false);

  // ✅ DEBUG: Log immédiat pour vérifier que le hook est bien appelé
  useEffect(() => {
    logger.info(LogCategory.EDITOR, '[CanvaRealtime] Hook monté', {
      chatSessionId,
      enabled,
      hasChatSessionId: !!chatSessionId
    });
  }, [chatSessionId, enabled]);

  // Garder une ref du store sessions pour éviter de resouscrire quand il change
  useEffect(() => {
    const unsubscribe = useCanvaStore.subscribe((state) => {
      sessionsRef.current = state.sessions;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!chatSessionId || !enabled) {
      return;
    }

    const supabase = getSupabaseClient();

    // Wrap async logic to avoid top-level await in effect
    let isCancelled = false;

    const clearResubTimer = () => {
      if (resubscribeTimerRef.current) {
        clearTimeout(resubscribeTimerRef.current);
        resubscribeTimerRef.current = null;
      }
    };

    const subscribe = async () => {
      const { data: { session }, error: authError } = await supabase.auth.getSession();

      if (isCancelled) return;

      if (authError) {
        logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Auth error before subscribe', { 
          error: authError.message,
          chatSessionId 
        });
        return;
      }

      if (!session?.access_token || !session?.user?.id) {
        logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ No valid auth session - realtime disabled', { 
          chatSessionId,
          hasToken: !!session?.access_token,
          hasUser: !!session?.user?.id
        });
        return;
      }

      // ✅ Le client singleton est déjà authentifié, pas besoin de setSession
      // (setSession causerait un re-render et fermerait le canal)
      logger.info(LogCategory.EDITOR, '[CanvaRealtime] ✅ Auth verified, subscribing to Realtime', { 
        chatSessionId,
        userId: session.user.id
      });

      if (isCancelled) return;

      const channel = supabase
        .channel(`canva_sessions:chat_${chatSessionId}`)
      .on(
        'postgres_changes' as any,
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'canva_sessions',
          filter: `chat_session_id=eq.${chatSessionId}`
        },
        (payload: RealtimePostgresChangesPayload<CanvaSession>) => {
          const canvaId = payload.new?.id || payload.old?.id;
          const eventType = getEventType(payload);
          const payloadChatSessionId = payload.new?.chat_session_id || payload.old?.chat_session_id;
          
          if (!eventType) {
            logger.warn(LogCategory.EDITOR, '[CanvaRealtime] Invalid payload: missing eventType', {
              payload
            });
            return;
          }

          if (!canvaId) {
            logger.warn(LogCategory.EDITOR, '[CanvaRealtime] Invalid payload: missing canvaId', {
              payload
            });
            return;
          }

          if (payloadChatSessionId && payloadChatSessionId !== chatSessionId) {
            logger.debug(LogCategory.EDITOR, '[CanvaRealtime] Ignoring event for different chat_session_id', {
              payloadChatSessionId,
              chatSessionId,
              canvaId
            });
            return;
          }
          
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] DB change detected', {
            event: eventType,
            canvaId,
            newStatus: payload.new?.status,
            oldStatus: payload.old?.status,
            newTitle: payload.new?.title,
            oldTitle: payload.old?.title
          });

          lastEventAtRef.current = Date.now();

          const { new: newRow, old: oldRow } = payload;

          switch (eventType) {
            case 'INSERT': {
              // Nouveau canva créé (par un autre onglet ou le LLM)
              if (!newRow) {
                logger.warn(LogCategory.EDITOR, '[CanvaRealtime] INSERT event without new row');
                break;
              }
              
              const canvaId = newRow.id;
              const newCanva: CanvaSession = newRow;
              
              logger.info(LogCategory.EDITOR, '[CanvaRealtime] New canva created', {
                canvaId,
                status: newCanva.status
              });

              // ✅ Déclencher un événement personnalisé pour notifier le dropdown
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('canva-session-created', {
                  detail: { canvaId, chatSessionId }
                }));
              }

              // ✅ Si status='open', activer automatiquement le canva
              if (newCanva.status === 'open' && newCanva.note_id) {
                logger.info(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Auto-activating canva (status=open)', {
                  canvaId,
                  noteId: newCanva.note_id
                });
                
                // Activer le canva (switchCanva charge la note et active le pane)
                const { switchCanva } = useCanvaStore.getState();
                switchCanva(canvaId, newCanva.note_id).catch((error) => {
                  logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Failed to auto-activate canva', {
                    canvaId,
                    error: error instanceof Error ? error.message : String(error)
                  });
                });
              }
              break;
            }

            case 'UPDATE': {
              // Mise à jour d'un canva (status, title, etc.)
              if (!newRow) {
                logger.warn(LogCategory.EDITOR, '[CanvaRealtime] UPDATE event without new row');
                break;
              }
              
              const canvaId = newRow.id;
              const updatedCanva: CanvaSession = newRow;
              const oldStatus = oldRow?.status;
              const newStatus = updatedCanva.status;
              const oldTitle = oldRow?.title;
              const newTitle = updatedCanva.title;

              // Mettre à jour titre si session locale existe
              const currentSessions = sessionsRef.current;
              if (currentSessions[canvaId]) {
                const { updateSession } = useCanvaStore.getState();
                updateSession(canvaId, {
                  title: updatedCanva.title || currentSessions[canvaId].title
                });
              }

              logger.info(LogCategory.EDITOR, '[CanvaRealtime] Canva updated', {
                canvaId,
                oldStatus,
                newStatus
              });

              // ✅ Déclencher un événement personnalisé si le titre a changé (pour mettre à jour le dropdown)
              if (oldTitle !== newTitle && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('canva-session-updated', {
                  detail: { canvaId, chatSessionId }
                }));
              }

              // ✅ Gérer les changements de status
              if (oldStatus !== newStatus) {
                if (newStatus === 'open') {
                  // Le LLM ou un autre onglet a ouvert ce canva
                  const { activeCanvaId, switchCanva } = useCanvaStore.getState();
                  if (activeCanvaId !== canvaId && updatedCanva.note_id) {
                    logger.info(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Auto-activating canva (status changed to open)', {
                      canvaId,
                      noteId: updatedCanva.note_id,
                      currentActive: activeCanvaId
                    });
                    
                    // Activer ce canva (ferme automatiquement l'autre s'il est actif)
                    switchCanva(canvaId, updatedCanva.note_id).catch((error) => {
                      logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Failed to auto-activate canva', {
                        canvaId,
                        error: error instanceof Error ? error.message : String(error)
                      });
                    });
                  }
                } else if (newStatus === 'closed') {
                  // Le canva a été fermé (LLM ou autre onglet)
                  // ✅ Ne fermer que si le canevas est actif ET ouvert dans le pane UI
                  const { isCanvaOpen: currentIsCanvaOpen, activeCanvaId: currentActiveCanvaId, closeCanva } = useCanvaStore.getState();
                  if (currentActiveCanvaId === canvaId && currentIsCanvaOpen) {
                    logger.info(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Auto-closing canva (status changed to closed)', {
                      canvaId
                    });
                    
                    // Fermer le pane UI (ne supprime pas la session)
                    closeCanva(canvaId, { delete: false }).catch((error) => {
                      logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Failed to auto-close canva', {
                        canvaId,
                        error: error instanceof Error ? error.message : String(error)
                      });
                    });
                  } else {
                    // Le canevas est déjà fermé localement, ignorer l'événement
                    logger.debug(LogCategory.EDITOR, '[CanvaRealtime] Ignoring closed status (canva already closed locally)', {
                      canvaId,
                      currentActiveCanvaId,
                      currentIsCanvaOpen
                    });
                  }
                }
              }
              break;
            }

            case 'DELETE': {
              // Canva supprimé (fermeture depuis autre onglet)
              if (!oldRow) {
                logger.warn(LogCategory.EDITOR, '[CanvaRealtime] DELETE event without old row');
                break;
              }
              
              const canvaId = oldRow.id;
              
              logger.info(LogCategory.EDITOR, '[CanvaRealtime] Canva deleted', {
                canvaId
              });

              // ✅ Déclencher un événement personnalisé pour notifier le dropdown
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('canva-session-deleted', {
                  detail: { canvaId, chatSessionId }
                }));
              }

              // Si c'est le canva actif, fermer le pane
              const { activeCanvaId, closeCanva } = useCanvaStore.getState();
              if (activeCanvaId === canvaId) {
                closeCanva(canvaId, { delete: true }).catch((error) => {
                  logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Failed to handle deleted canva', {
                    canvaId,
                    error: error instanceof Error ? error.message : String(error)
                  });
                });
              }

              // Le dropdown se rechargera et filtrera automatiquement
              break;
            }
          }
        }
      )
      .on('system', { event: 'channel_error' }, (payload) => {
        // ✅ Vérifier si c'est vraiment une erreur ou un message de succès
        // Supabase envoie parfois "Subscribed to PostgreSQL" avec status: "ok" comme "erreur"
        const checkStatus = (obj: unknown): boolean => {
          if (typeof obj !== 'object' || obj === null) return false;
          if ('status' in obj && obj.status === 'ok') return true;
          if ('error' in obj && typeof obj.error === 'object' && obj.error !== null) {
            return 'status' in obj.error && obj.error.status === 'ok';
          }
          return false;
        };
        
        if (checkStatus(payload)) {
          // Message de confirmation de souscription, pas une erreur
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] ✅ Channel subscribed successfully', {
            chatSessionId,
            payload
          });
        } else {
          // Vraie erreur
        logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Channel system error', {
          chatSessionId,
          error: payload
        });
        }
      })
      .on('system', { event: 'channel_close' }, (payload) => {
        const isOkClose = typeof payload === 'object' && payload !== null && ('status' in payload) && (payload as { status?: unknown }).status === 'ok';
        if (isOkClose) {
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] ℹ️ Channel close ack (status ok)', {
            chatSessionId,
            reason: payload
          });
          return;
        }

        logger.warn(LogCategory.EDITOR, '[CanvaRealtime] 🔌 Channel closed', {
          chatSessionId,
          reason: payload
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resubscribeAttemptRef.current = 0;
          clearResubTimer();
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] ✅ Subscribed to canva_sessions', {
            chatSessionId
          });
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Subscription error', {
            chatSessionId,
            status,
            channelName: `canva_sessions:chat_${chatSessionId}`
          });
        } else if ((status === 'CLOSED' || status === 'TIMED_OUT') && !isCancelled) {
          const nextAttempt = resubscribeAttemptRef.current + 1;
          logger.warn(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Channel closed, attempting resubscribe', {
            chatSessionId,
            status,
            attempt: nextAttempt
          });

          resubscribeAttemptRef.current = nextAttempt;
          if (resubInProgressRef.current) {
            return;
          }
          resubInProgressRef.current = true;

          // Nettoyer canal actuel puis réessayer avec backoff (cap à 5s), async pour éviter recursion
          const delayMs = Math.min(5000, 300 * Math.pow(2, nextAttempt - 1));
          clearResubTimer();
          resubscribeTimerRef.current = setTimeout(() => {
            if (!isCancelled) {
              Promise.resolve()
                .then(() => supabase.removeChannel(channel))
                .catch(() => {/* ignore */})
                .then(() => {
                  channelRef.current = null;
                  return subscribe();
                })
                .finally(() => {
                  resubInProgressRef.current = false;
                });
            }
          }, delayMs);
        } else {
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] Channel status update', {
            status,
            chatSessionId
          });
        }
      });

      // ✅ Ne pas assigner si déjà annulé (race condition cleanup)
      if (!isCancelled) {
        channelRef.current = channel;
      } else {
        // Annulé pendant l'async, fermer immédiatement le canal créé
        supabase.removeChannel(channel);
      }
    };

    subscribe();

    // 🩺 Healthcheck périodique : resubscribe si silence ou canal manquant
    healthcheckTimerRef.current = setInterval(() => {
      if (isCancelled) return;
      const now = Date.now();
      const silenceMs = now - lastEventAtRef.current;
      const channelMissing = !channelRef.current;
      if (channelMissing || silenceMs > 3 * 60 * 1000) {
        logger.warn(LogCategory.EDITOR, '[CanvaRealtime] 🩺 Healthcheck resubscribe', {
          chatSessionId,
          channelMissing,
          silenceMs
        });
        clearResubTimer();
        resubscribeAttemptRef.current = 0;
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        subscribe();
      }
    }, 60 * 1000);

    // ✅ Resubscribe on token refresh / sign-in
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isCancelled) return;
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        logger.info(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Auth change detected, resubscribing', {
          chatSessionId,
          event
        });
        clearResubTimer();
        resubscribeAttemptRef.current = 0;
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        subscribe();
      } else if (event === 'SIGNED_OUT' || !session?.access_token) {
        logger.warn(LogCategory.EDITOR, '[CanvaRealtime] ⚠️ Signed out - realtime disabled', {
          chatSessionId
        });
      }
    });
    authUnsubscribeRef.current = authListener?.subscription.unsubscribe ?? null;

    // Cleanup on unmount
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
        const channelToRemove = channelRef.current;
        channelRef.current = null;
        supabase.removeChannel(channelToRemove);
        logger.info(LogCategory.EDITOR, '[CanvaRealtime] 🔌 Unsubscribed from canva_sessions');
      }
    };
  }, [chatSessionId, enabled]);
}

