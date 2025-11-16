import { useEffect, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { logger, LogCategory } from '@/utils/logger';
import { useCanvaStore } from '@/store/useCanvaStore';
import type { CanvaSession, RealtimePostgresChangesPayload } from '@/types/canva';
import { getEventType } from '@/types/canva';

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
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const updateSession = useCanvaStore(s => s.updateSession);
  const { sessions, activeCanvaId, switchCanva, closeCanva } = useCanvaStore();

  useEffect(() => {
    if (!chatSessionId || !enabled) {
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      logger.error(LogCategory.EDITOR, '[CanvaRealtime] ⚠️ Missing Supabase env variables', {
        hasUrl: Boolean(supabaseUrl),
        hasAnonKey: Boolean(supabaseAnonKey)
      });
      return;
    }

    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey);
    }

    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`canva_sessions:chat_${chatSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'canva_sessions',
          filter: `chat_session_id=eq.${chatSessionId}`
        },
        (payload: RealtimePostgresChangesPayload<CanvaSession>) => {
          const canvaId = payload.new?.id || payload.old?.id || 'unknown';
          const eventType = getEventType(payload);
          
          if (!eventType) {
            logger.warn(LogCategory.EDITOR, '[CanvaRealtime] Invalid payload: missing eventType', {
              payload
            });
            return;
          }
          
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] DB change detected', {
            event: eventType,
            canvaId
          });

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

              // ✅ Si status='open', activer automatiquement le canva
              if (newCanva.status === 'open' && newCanva.note_id) {
                logger.info(LogCategory.EDITOR, '[CanvaRealtime] 🔄 Auto-activating canva (status=open)', {
                  canvaId,
                  noteId: newCanva.note_id
                });
                
                // Activer le canva (switchCanva charge la note et active le pane)
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

              // Mettre à jour titre si session locale existe
              if (sessions[canvaId]) {
                updateSession(canvaId, {
                  title: updatedCanva.title || sessions[canvaId].title
                });
              }

              logger.info(LogCategory.EDITOR, '[CanvaRealtime] Canva updated', {
                canvaId,
                oldStatus,
                newStatus
              });

              // ✅ Gérer les changements de status
              if (oldStatus !== newStatus) {
                if (newStatus === 'open') {
                  // Le LLM ou un autre onglet a ouvert ce canva
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
                  const { isCanvaOpen: currentIsCanvaOpen, activeCanvaId: currentActiveCanvaId } = useCanvaStore.getState();
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

              // Si c'est le canva actif, fermer le pane
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
        logger.warn(LogCategory.EDITOR, '[CanvaRealtime] 🔌 Channel closed', {
          chatSessionId,
          reason: payload
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] ✅ Subscribed to canva_sessions', {
            chatSessionId
          });
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Subscription error', {
            chatSessionId,
            status,
            channelName: `canva_sessions:chat_${chatSessionId}`
          });
        } else {
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] Channel status update', {
            status,
            chatSessionId
          });
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        logger.info(LogCategory.EDITOR, '[CanvaRealtime] 🔌 Unsubscribed from canva_sessions');
      }
    };
  }, [chatSessionId, enabled, sessions, updateSession, activeCanvaId, switchCanva, closeCanva]);
}

