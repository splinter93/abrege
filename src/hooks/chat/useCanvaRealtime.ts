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
  const maxReconnectAttempts = 10; // ✅ Limiter les tentatives pour éviter les boucles infinies
  const circuitBreakerRef = useRef(false); // ✅ Circuit breaker pour éviter les reconnexions en boucle

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

      // ✅ FIX: Utiliser un nom de canal plus simple et unique
      const channelName = `canva_sessions:chat_${chatSessionId}`;
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: session.user.id }
          }
        })
      .on<CanvaSession>(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'canva_sessions',
          // ✅ FIX: Filtrer par user_id ET chat_session_id pour respecter RLS
          // RLS peut bloquer les événements si on filtre seulement par chat_session_id
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          const typedPayload = payload as unknown as RealtimePostgresChangesPayload<CanvaSession>;
          const canvaId = typedPayload.new?.id || typedPayload.old?.id;
          const eventType = getEventType(typedPayload);
          const payloadChatSessionId = typedPayload.new?.chat_session_id || typedPayload.old?.chat_session_id;
          const payloadUserId = typedPayload.new?.user_id || typedPayload.old?.user_id;
          
          // ✅ Log TOUS les événements reçus pour debug (même ceux qu'on ignore)
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] 📨 ÉVÉNEMENT REÇU (raw)', {
            eventType,
            canvaId,
            payloadChatSessionId,
            chatSessionId,
            payloadUserId,
            userId: session.user.id,
            matchesChatSession: payloadChatSessionId === chatSessionId,
            matchesUser: payloadUserId === session.user.id
          });
          
          if (!eventType) {
            logger.warn(LogCategory.EDITOR, '[CanvaRealtime] Invalid payload: missing eventType', {
              payload: typedPayload
            });
            return;
          }

          if (!canvaId) {
            logger.warn(LogCategory.EDITOR, '[CanvaRealtime] Invalid payload: missing canvaId', {
              payload: typedPayload
            });
            return;
          }

          // ✅ Filtrer par chat_session_id côté client (car le filtre DB est maintenant sur user_id)
          if (payloadChatSessionId && payloadChatSessionId !== chatSessionId) {
            logger.info(LogCategory.EDITOR, '[CanvaRealtime] Ignoring event for different chat_session_id', {
              payloadChatSessionId,
              chatSessionId,
              canvaId
            });
            return;
          }
          
          // ✅ Vérifier aussi que c'est bien notre utilisateur (sécurité)
          if (payloadUserId && payloadUserId !== session.user.id) {
            logger.warn(LogCategory.EDITOR, '[CanvaRealtime] Ignoring event for different user_id', {
              payloadUserId,
              userId: session.user.id,
              canvaId
            });
            return;
          }
          
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] ✅✅✅ DB change detected - ÉVÉNEMENT REÇU', {
            event: eventType,
            canvaId,
            newStatus: typedPayload.new?.status,
            oldStatus: typedPayload.old?.status,
            newTitle: typedPayload.new?.title,
            oldTitle: typedPayload.old?.title,
            chatSessionId,
            payloadChatSessionId
          });

          lastEventAtRef.current = Date.now();

          const { new: newRow, old: oldRow } = typedPayload;

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
                    logger.info(LogCategory.EDITOR, '[CanvaRealtime] Ignoring closed status (canva already closed locally)', {
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
          // Vraie erreur - logger seulement si pas trop fréquent
          const errorCount = (resubscribeAttemptRef.current % 10);
          if (errorCount === 0) {
            logger.warn(LogCategory.EDITOR, '[CanvaRealtime] ⚠️ Channel system error (silencing spam)', {
              chatSessionId,
              error: payload,
              note: 'Erreurs suivantes silencieuses pendant 10 tentatives'
            });
          }
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
          circuitBreakerRef.current = false; // ✅ Réinitialiser le circuit breaker en cas de succès
          clearResubTimer();
          lastEventAtRef.current = Date.now(); // ✅ Réinitialiser le timer d'événements
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] ✅ Subscribed to canva_sessions', {
            chatSessionId,
            channelState: channel.state,
            filter: `chat_session_id=eq.${chatSessionId}`
          });
        } else if (status === 'CHANNEL_ERROR') {
          // ✅ FIX: Ne logger qu'une fois toutes les 10 erreurs pour éviter le spam
          const errorCount = (resubscribeAttemptRef.current % 10);
          if (errorCount === 0) {
            logger.warn(LogCategory.EDITOR, '[CanvaRealtime] ⚠️ Subscription error (silencing spam)', {
              chatSessionId,
              status,
              channelName: `canva_sessions:chat_${chatSessionId}`,
              attempt: resubscribeAttemptRef.current + 1,
              note: 'Erreurs suivantes silencieuses pendant 10 tentatives'
            });
          }
          
          // ✅ FIX: Gérer CHANNEL_ERROR comme CLOSED/TIMED_OUT avec reconnexion automatique
          if (!isCancelled && !resubInProgressRef.current && !circuitBreakerRef.current) {
            const nextAttempt = resubscribeAttemptRef.current + 1;
            
            // ✅ Circuit breaker : arrêter après maxReconnectAttempts
            if (nextAttempt > maxReconnectAttempts) {
              circuitBreakerRef.current = true;
              logger.error(LogCategory.EDITOR, '[CanvaRealtime] 🛑 Circuit breaker activé - trop de tentatives', {
                chatSessionId,
                attempts: nextAttempt - 1,
                maxAttempts: maxReconnectAttempts,
                note: 'Realtime désactivé pour cette session. Redémarrer la page pour réessayer.'
              });
              return;
            }
            
            // ✅ Logger seulement toutes les 5 tentatives pour éviter le spam
            if (nextAttempt % 5 === 0) {
              logger.warn(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Channel error, attempting resubscribe', {
                chatSessionId,
                status,
                attempt: nextAttempt,
                maxAttempts: maxReconnectAttempts
              });
            }

            resubscribeAttemptRef.current = nextAttempt;
            resubInProgressRef.current = true;

            // Nettoyer canal actuel puis réessayer avec backoff (cap à 10s pour les erreurs)
            const delayMs = Math.min(10000, 500 * Math.pow(2, nextAttempt - 1));
            clearResubTimer();
            resubscribeTimerRef.current = setTimeout(() => {
              if (!isCancelled && !circuitBreakerRef.current) {
                Promise.resolve()
                  .then(() => {
                    if (channelRef.current) {
                      supabase.removeChannel(channelRef.current);
                    }
                  })
                  .catch(() => {/* ignore */})
                  .then(() => {
                    channelRef.current = null;
                    return subscribe();
                  })
                  .catch((error) => {
                    logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Resubscribe failed', {
                      chatSessionId,
                      error: error instanceof Error ? error.message : String(error)
                    });
                  })
                  .finally(() => {
                    resubInProgressRef.current = false;
                  });
              }
            }, delayMs);
          }
        } else if ((status === 'CLOSED' || status === 'TIMED_OUT') && !isCancelled && !circuitBreakerRef.current) {
          const nextAttempt = resubscribeAttemptRef.current + 1;
          
          // ✅ Circuit breaker : arrêter après maxReconnectAttempts
          if (nextAttempt > maxReconnectAttempts) {
            circuitBreakerRef.current = true;
            logger.error(LogCategory.EDITOR, '[CanvaRealtime] 🛑 Circuit breaker activé - trop de tentatives', {
              chatSessionId,
              attempts: nextAttempt - 1,
              maxAttempts: maxReconnectAttempts
            });
            return;
          }
          
          logger.warn(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Channel closed, attempting resubscribe', {
            chatSessionId,
            status,
            attempt: nextAttempt,
            maxAttempts: maxReconnectAttempts
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
            if (!isCancelled && !circuitBreakerRef.current) {
              Promise.resolve()
                .then(() => {
                  if (channelRef.current) {
                    supabase.removeChannel(channelRef.current);
                  }
                })
                .catch(() => {/* ignore */})
                .then(() => {
                  channelRef.current = null;
                  return subscribe();
                })
                .catch((error) => {
                  logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Resubscribe failed', {
                    chatSessionId,
                    error: error instanceof Error ? error.message : String(error)
                  });
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

    // 🩺 Healthcheck périodique : resubscribe UNIQUEMENT si canal manquant ou état invalide
    // ❌ FIX: Ne pas se baser sur le silence (pas d'événements = normal si rien ne change)
    // ✅ Vérifier uniquement l'état du canal (SUBSCRIBED = OK, même sans événements)
    healthcheckTimerRef.current = setInterval(() => {
      if (isCancelled || circuitBreakerRef.current) return;
      
      const channel = channelRef.current;
      const channelMissing = !channel;
      
      // ✅ Vérifier l'état réel du canal au lieu du silence
      // Un canal peut être actif sans recevoir d'événements (normal si pas de changements DB)
      const channelState = channel?.state;
      // Les états valides pour Supabase Realtime sont : 'joined', 'joining', 'closed', 'errored'
      // 'joined' = canal actif et connecté
      const isChannelHealthy = channel && channelState === 'joined';
      
      if (channelMissing || !isChannelHealthy) {
        logger.warn(LogCategory.EDITOR, '[CanvaRealtime] 🩺 Healthcheck resubscribe', {
          chatSessionId,
          channelMissing,
          channelState,
          isChannelHealthy
        });
        clearResubTimer();
        resubscribeAttemptRef.current = 0; // ✅ Réinitialiser les tentatives pour le healthcheck
        circuitBreakerRef.current = false; // ✅ Réinitialiser le circuit breaker
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }
        subscribe();
      } else {
        // ✅ Canal sain (joined), pas besoin de reconnexion même sans événements
        // Le silence est normal si rien ne change dans la DB
        if (channelState === 'joined') {
          // Mettre à jour lastEventAt pour éviter les faux positifs futurs
          lastEventAtRef.current = Date.now();
        }
      }
    }, 60 * 1000);

    // ✅ Resubscribe on sign-in only, not token refresh if channel is healthy.
    // TOKEN_REFRESHED fires on every tab return; Supabase realtime handles token
    // refresh internally. Forcing a resubscribe causes channel teardown/rebuild
    // and cascading re-renders in ChatHeader.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (isCancelled) return;
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        // Ne resubscrire que si le channel est réellement déconnecté
        const channelState = channelRef.current?.state;
        if (channelState === 'joined') {
          logger.debug(LogCategory.EDITOR, '[CanvaRealtime] TOKEN_REFRESHED - channel healthy, skip resubscribe');
          return;
        }
        logger.info(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Auth change - channel not joined, resubscribing', {
          chatSessionId,
          event,
          channelState
        });
        clearResubTimer();
        resubscribeAttemptRef.current = 0;
        circuitBreakerRef.current = false;
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

