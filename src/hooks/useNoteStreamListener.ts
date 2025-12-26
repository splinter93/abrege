/**
 * 🎧 useNoteStreamListener Hook
 * 
 * Hook React pour écouter les streams SSE d'une note
 * S'intègre avec useCanvaStore pour afficher le contenu streamé en temps réel
 * 
 * Usage:
 * ```tsx
 * const session = useCanvaStore(state => state.sessions[activeCanvaId]);
 * useNoteStreamListener(session?.noteId, true);
 * ```
 * 
 * Le hook gère automatiquement :
 * - Connexion EventSource
 * - Reconnexion automatique en cas d'erreur
 * - Cleanup à l'unmount
 * - Intégration avec streamBuffer du store
 */

import { useEffect, useRef } from 'react';
import { useCanvaStore } from '@/store/useCanvaStore';
import { logger, LogCategory } from '@/utils/logger';
import type { StreamEvent } from '@/services/streamBroadcastService';

interface UseNoteStreamListenerOptions {
  /**
   * Activer l'écoute du stream
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Callback appelé lors de la réception d'un chunk
   */
  onChunk?: (chunk: string) => void;
  
  /**
   * Callback appelé lors de la fin du stream
   */
  onEnd?: () => void;
  
  /**
   * Callback appelé en cas d'erreur
   */
  onError?: (error: Error) => void;
  
  /**
   * Mode debug (logs détaillés)
   * @default false
   */
  debug?: boolean;
}

/**
 * Hook pour écouter un stream SSE d'une note
 * 
 * @param noteId - ID de la note à écouter (null = pas d'écoute)
 * @param options - Options de configuration
 */
export function useNoteStreamListener(
  noteId: string | null | undefined,
  options: UseNoteStreamListenerOptions = {}
) {
  const {
    enabled = true,
    onChunk,
    onEnd,
    onError,
    debug = false
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const isStreamingRef = useRef<boolean>(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // ✅ FIX: Stocker les callbacks dans des refs pour éviter les re-renders
  const onChunkRef = useRef(onChunk);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  
  // Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onChunkRef.current = onChunk;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onChunk, onEnd, onError]);

  const { startStreaming, appendStreamChunk, endStreaming } = useCanvaStore();

  useEffect(() => {
    // Skip si pas de noteId ou désactivé
    if (!noteId || !enabled) {
      if (debug) {
        logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] Skipped', { noteId, enabled });
      }
      // Cleanup si désactivé
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // ✅ FIX: Éviter de recréer la connexion si elle est déjà ouverte
    // EventSource.OPEN = 1 (valeur numérique pour éviter les problèmes SSR)
    if (eventSourceRef.current && eventSourceRef.current.readyState === 1) {
      if (debug) {
        logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] Connection already open, skipping', {
          noteId
        });
      }
      return;
    }

    // Cleanup de la connexion précédente (si fermée ou en erreur)
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (debug) {
      logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] Connecting...', { noteId });
    }

    // Fonction async pour initialiser la connexion
    const initializeConnection = async () => {
      // Récupérer le token d'authentification
      const getToken = () => {
        try {
          // Essayer de récupérer le token depuis le localStorage Supabase
          const supabaseAuth = localStorage.getItem('sb-localhost-auth-token');
          if (supabaseAuth) {
            const parsed = JSON.parse(supabaseAuth);
            return parsed.access_token;
          }
          // Fallback: chercher dans d'autres clés possibles
          const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
          for (const key of keys) {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.access_token) return data.access_token;
          }
        } catch (error) {
          logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Failed to get token', error);
        }
        return null;
      };

      // Créer la connexion EventSource avec le token
      const token = getToken();
      if (!token) {
        logger.error(LogCategory.EDITOR, '[useNoteStreamListener] No auth token available', { noteId });
        return null;
      }

      const eventSource = new EventSource(`/api/v2/note/${noteId}/stream:listen?token=${encodeURIComponent(token)}`);
      return eventSource;
    };

    // Initialiser la connexion
    initializeConnection().then(eventSource => {
      if (!eventSource) return;
      
      eventSourceRef.current = eventSource;

      /**
       * Handler pour les messages SSE
       */
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);

          if (debug) {
            logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] Event received', {
              noteId,
              type: data.type,
              dataLength: data.data?.length || 0
            });
          }

          switch (data.type) {
            case 'start':
              // Stream initialisé
              logger.info(LogCategory.EDITOR, '[useNoteStreamListener] Stream started', {
                noteId
              });
              reconnectAttemptsRef.current = 0; // Reset reconnect counter
              break;

            case 'chunk':
              // Réception d'un chunk de contenu
              if (data.data) {
                // Démarrer le streaming si pas déjà fait
                if (!isStreamingRef.current) {
                  startStreaming(noteId);
                  isStreamingRef.current = true;
                }

                // Ajouter le chunk au buffer
                appendStreamChunk(noteId, data.data);

                // Callback optionnel
                onChunkRef.current?.(data.data);

                if (debug) {
                  logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] Chunk added', {
                    noteId,
                    chunkLength: data.data.length
                  });
                }
              }
              break;

            case 'end':
              // Fin du stream
              if (isStreamingRef.current) {
                endStreaming(noteId);
                isStreamingRef.current = false;
              }

              logger.info(LogCategory.EDITOR, '[useNoteStreamListener] Stream ended', {
                noteId
              });

              onEndRef.current?.();
              break;

            case 'error':
              // Erreur serveur
              const errorMsg = data.data || 'Unknown error';
              logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Server error', {
                noteId,
                error: errorMsg
              });

              const error = new Error(`Stream error: ${errorMsg}`);
              onErrorRef.current?.(error);
              break;

            default:
              logger.warn(LogCategory.EDITOR, '[useNoteStreamListener] Unknown event type', {
                noteId,
                type: data.type
              });
          }
        } catch (parseError) {
          logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Failed to parse event', {
            noteId,
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            rawData: event.data
          });
        }
      };

      /**
       * Handler pour les erreurs de connexion
       */
      eventSource.onerror = (error) => {
        logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Connection error', {
          noteId,
          readyState: eventSource.readyState,
          reconnectAttempts: reconnectAttemptsRef.current
        });

        // Fermer la connexion actuelle
        eventSource.close();

        // Fin du streaming en cours si erreur
        if (isStreamingRef.current) {
          endStreaming(noteId);
          isStreamingRef.current = false;
        }

        // EventSource reconnecte automatiquement, mais on peut ajouter un backoff
        reconnectAttemptsRef.current += 1;

        // Callback optionnel
        const connectionError = new Error('SSE connection error');
        onErrorRef.current?.(connectionError);
      };

      /**
       * Handler pour l'ouverture de la connexion
       */
      eventSource.onopen = () => {
        if (debug) {
          logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] Connection opened', { noteId });
        }
        reconnectAttemptsRef.current = 0;
      };
    }).catch(error => {
      logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Failed to initialize connection', error);
    });

    // Cleanup à l'unmount ou au changement de noteId
    return () => {
      if (debug) {
        logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] Cleanup', { noteId });
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Fin du streaming si en cours
      if (isStreamingRef.current && noteId) {
        endStreaming(noteId);
        isStreamingRef.current = false;
      }

      eventSourceRef.current = null;
    };
  }, [noteId, enabled, debug, startStreaming, appendStreamChunk, endStreaming]); // ✅ FIX: Callbacks retirés des dépendances (utilisés via refs)

  // Retourner l'état de la connexion (optionnel, pour debugging)
  return {
    isConnected: typeof window !== 'undefined' && eventSourceRef.current?.readyState === 1, // 1 = OPEN
    reconnectAttempts: reconnectAttemptsRef.current
  };
}

