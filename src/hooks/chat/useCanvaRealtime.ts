import { useEffect, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { logger, LogCategory } from '@/utils/logger';
import { useCanvaStore } from '@/store/useCanvaStore';

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
  const { sessions } = useCanvaStore();

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
        (payload) => {
          logger.info(LogCategory.EDITOR, '[CanvaRealtime] DB change detected', {
            event: payload.eventType,
            canvaId: (payload.new as any)?.id || (payload.old as any)?.id
          });

          const { eventType, new: newRow, old: oldRow } = payload;

          switch (eventType) {
            case 'INSERT': {
              // Nouveau canva créé (par un autre onglet ou le LLM)
              // On ne fait rien ici, le dropdown rechargera via polling ou on ajoutera manuellement
              logger.info(LogCategory.EDITOR, '[CanvaRealtime] New canva created', {
                canvaId: (newRow as any).id
              });
              break;
            }

            case 'UPDATE': {
              // Mise à jour d'un canva (status, title, etc.)
              const canvaId = (newRow as any).id;
              const updatedCanva = newRow as any;

              // Si la session est chargée localement, update
              if (sessions[canvaId]) {
                updateSession(canvaId, {
                  title: updatedCanva.title || sessions[canvaId].title
                });

                logger.info(LogCategory.EDITOR, '[CanvaRealtime] Canva updated', {
                  canvaId,
                  status: updatedCanva.status
                });
              }
              break;
            }

            case 'DELETE': {
              // Canva supprimé (fermeture depuis autre onglet)
              const canvaId = (oldRow as any).id;
              
              logger.info(LogCategory.EDITOR, '[CanvaRealtime] Canva deleted', {
                canvaId
              });

              // Le dropdown se rechargera et filtrera automatiquement
              break;
            }
          }
        }
      )
      .on('system', { event: 'channel_error' }, (payload) => {
        logger.error(LogCategory.EDITOR, '[CanvaRealtime] ❌ Channel system error', {
          chatSessionId,
          error: payload
        });
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
  }, [chatSessionId, enabled, sessions, updateSession]);
}

