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

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

  // ✅ FIX: Ne pas extraire les fonctions pour éviter les dépendances instables
  // On utilisera useCanvaStore.getState() directement dans le useEffect
  
  /**
   * Trouver le sessionId (canva session ID) à partir du noteId
   * Utilise useCanvaStore.getState() pour obtenir la dernière valeur sans dépendances
   */
  const findSessionIdByNoteId = (noteId: string): string | null => {
    const currentSessions = useCanvaStore.getState().sessions;
    const session = Object.values(currentSessions).find(s => s.noteId === noteId);
    if (!session) {
      logger.warn(LogCategory.EDITOR, '[useNoteStreamListener] ⚠️ Session not found', {
        noteId,
        availableSessions: Object.keys(currentSessions).map(id => ({
          id,
          noteId: currentSessions[id].noteId
        }))
      });
    }
    return session?.id || null;
  };

  // ✅ LOG AVANT useEffect pour confirmer que le hook s'exécute
  logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] 🔍 Hook function called (BEFORE useEffect)', {
    noteId,
    enabled,
    debug,
    hasOnChunk: typeof onChunk === 'function',
    hasOnEnd: typeof onEnd === 'function',
    hasOnError: typeof onError === 'function',
    timestamp: Date.now()
  });

  // ✅ FORCER un log juste avant useEffect pour confirmer qu'on arrive ici
  logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] 🔍 About to call useEffect', {
    noteId,
    enabled,
    debug,
    timestamp: Date.now()
  });

  // ✅ TEST: Utiliser useEffect (pas useLayoutEffect car il ne s'exécute pas)
  useEffect(() => {
    // ✅ FORCER un log SYNCHRONE au tout début (pas de await, pas de condition)
    logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] 🔍 ⚡⚡⚡ useEffect STARTED ⚡⚡⚡', {
      noteId,
      enabled,
      debug,
      timestamp: Date.now()
    });
    
    // ✅ LOG IMMÉDIAT pour vérifier que le hook s'exécute
    const currentSessions = useCanvaStore.getState().sessions;
    logger.info(LogCategory.EDITOR, '[useNoteStreamListener] 🔍 Hook executed', {
      noteId,
      enabled,
      sessionsCount: Object.keys(currentSessions).length,
      availableNoteIds: Object.values(currentSessions).map(s => s.noteId),
      sessions: Object.keys(currentSessions).map(id => ({
        id,
        noteId: currentSessions[id].noteId
      }))
    });

    // Skip si pas de noteId ou désactivé
    if (!noteId || !enabled) {
      logger.warn(LogCategory.EDITOR, '[useNoteStreamListener] ⚠️ Skipped', { 
        noteId, 
        enabled,
        reason: !noteId ? 'no noteId' : 'disabled'
      });
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

      // ✅ Utiliser ops:listen qui écoute streamBroadcastService (utilisé par editNoteContent)
      const url = `/api/v2/canvas/${noteId}/ops:listen?token=${encodeURIComponent(token)}`;
      logger.info(LogCategory.EDITOR, '[useNoteStreamListener] 🔍 Creating EventSource', {
        noteId,
        url: url.replace(/token=[^&]+/, 'token=***'), // Masquer le token dans les logs
        hasToken: Boolean(token)
      });
      const eventSource = new EventSource(url);
      
      // Log quand la connexion est ouverte
      eventSource.onopen = () => {
        logger.info(LogCategory.EDITOR, '[useNoteStreamListener] ✅ EventSource opened', {
          noteId,
          readyState: eventSource.readyState,
          url: eventSource.url.replace(/token=[^&]+/, 'token=***')
        });
      };
      
      // Log les erreurs de connexion
      eventSource.onerror = (error) => {
        logger.error(LogCategory.EDITOR, '[useNoteStreamListener] ❌ EventSource error', {
          noteId,
          readyState: eventSource.readyState,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      };
      
      return eventSource;
    };

      // Initialiser la connexion
      initializeConnection().then(eventSource => {
        if (!eventSource) {
          logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Failed to create EventSource', { noteId });
          return;
        }
        
        eventSourceRef.current = eventSource;

        logger.info(LogCategory.EDITOR, '[useNoteStreamListener] ✅ EventSource created', {
          noteId,
          readyState: eventSource.readyState,
          url: eventSource.url
        });

        /**
         * Handler pour traiter un événement StreamEvent
         */
        const handleStreamEvent = (data: StreamEvent) => {
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
              // Trouver le sessionId (canva session) à partir du noteId
              const sessionId = findSessionIdByNoteId(noteId);
              
              if (!sessionId) {
                const currentSessions = useCanvaStore.getState().sessions;
                logger.warn(LogCategory.EDITOR, '[useNoteStreamListener] ⚠️ No canva session found for noteId', {
                  noteId,
                  availableSessions: Object.keys(currentSessions).length
                });
                break;
              }

              // Démarrer le streaming si pas déjà fait
              if (!isStreamingRef.current) {
                logger.info(LogCategory.EDITOR, '[useNoteStreamListener] 🌊 Starting stream', {
                  noteId,
                  sessionId
                });
                useCanvaStore.getState().startStreaming(sessionId);
                isStreamingRef.current = true;
              }

              // Ajouter le chunk au buffer (utiliser sessionId, pas noteId)
              useCanvaStore.getState().appendStreamChunk(sessionId, data.data);

              // ✅ Callback optionnel (insertion directe)
              logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] 🔍 Calling onChunk callback', {
                noteId,
                sessionId,
                chunkLength: data.data.length,
                hasCallback: typeof onChunkRef.current === 'function'
              });
              
              if (onChunkRef.current) {
                try {
                  onChunkRef.current(data.data);
                  logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] ✅ onChunk callback executed successfully');
                } catch (error) {
                  logger.error(LogCategory.EDITOR, '[useNoteStreamListener] ❌ onChunk callback failed', {
                    noteId,
                    sessionId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  }, error instanceof Error ? error : undefined);
                }
              } else {
                logger.warn(LogCategory.EDITOR, '[useNoteStreamListener] ⚠️ No onChunk callback provided', {
                  noteId,
                  sessionId
                });
              }

              // ✅ Toujours logger les chunks pour debug (même sans debug mode)
              logger.info(LogCategory.EDITOR, '[useNoteStreamListener] 📝 Chunk received', {
                noteId,
                sessionId,
                chunkLength: data.data.length,
                chunkPreview: data.data.substring(0, 50) + (data.data.length > 50 ? '...' : '')
              });
            }
            break;

          case 'end':
            // Fin du stream
            if (isStreamingRef.current) {
              const sessionId = findSessionIdByNoteId(noteId);
              if (sessionId) {
                useCanvaStore.getState().endStreaming(sessionId);
              }
              isStreamingRef.current = false;
            }

            logger.info(LogCategory.EDITOR, '[useNoteStreamListener] Stream ended', {
              noteId
            });

            // ✅ Callback optionnel (conversion markdown)
            logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] 🔍 Calling onEnd callback', {
              noteId,
              hasCallback: typeof onEndRef.current === 'function'
            });
            
            if (onEndRef.current) {
              try {
                onEndRef.current();
                logger.debug(LogCategory.EDITOR, '[useNoteStreamListener] ✅ onEnd callback executed successfully', {
                  noteId
                });
              } catch (error) {
                logger.error(LogCategory.EDITOR, '[useNoteStreamListener] ❌ onEnd callback failed', {
                  noteId,
                  error: error instanceof Error ? error.message : 'Unknown error'
                }, error instanceof Error ? error : undefined);
              }
            } else {
              logger.warn(LogCategory.EDITOR, '[useNoteStreamListener] ⚠️ No onEnd callback provided', {
                noteId
              });
            }
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
      };

      /**
       * Handler pour les événements nommés (event: chunk, event: start, etc.)
       * Utilisé par ops:listen qui envoie des événements nommés
       */
      eventSource.addEventListener('chunk', (event: MessageEvent) => {
        try {
          // Parser le JSON de l'événement SSE
          const parsed: StreamEvent = JSON.parse(event.data);
          
          // Si c'est un chunk, traiter directement (pas via handleStreamEvent qui attend un format différent)
          if (parsed.type === 'chunk' && parsed.data && typeof parsed.data === 'string') {
            const chunkData = parsed.data;
            
            // Trouver le sessionId (canva session) à partir du noteId
            const sessionId = findSessionIdByNoteId(noteId);
            
            if (!sessionId) {
              const currentSessions = useCanvaStore.getState().sessions;
              logger.warn(LogCategory.EDITOR, '[useNoteStreamListener] ⚠️ No canva session found for noteId', {
                noteId,
                availableSessions: Object.keys(currentSessions).length
              });
              return;
            }

            // Démarrer le streaming si pas déjà fait
            if (!isStreamingRef.current) {
              logger.info(LogCategory.EDITOR, '[useNoteStreamListener] 🌊 Starting stream', {
                noteId,
                sessionId
              });
              useCanvaStore.getState().startStreaming(sessionId);
              isStreamingRef.current = true;
            }

            // Ajouter le chunk au buffer (utiliser sessionId, pas noteId)
            useCanvaStore.getState().appendStreamChunk(sessionId, chunkData);

            // Callback optionnel
            onChunkRef.current?.(chunkData);

            // ✅ Toujours logger les chunks pour debug
            logger.info(LogCategory.EDITOR, '[useNoteStreamListener] 📝 Chunk received', {
              noteId,
              sessionId,
              chunkLength: chunkData.length,
              chunkPreview: chunkData.substring(0, 50) + (chunkData.length > 50 ? '...' : '')
            });
          } else {
            // Autres types d'événements, utiliser handleStreamEvent
            handleStreamEvent(parsed);
          }
        } catch (parseError) {
          logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Failed to parse chunk event', {
            noteId,
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            rawData: event.data
          });
        }
      });

      eventSource.addEventListener('start', (event: MessageEvent) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);
          handleStreamEvent(data);
        } catch (parseError) {
          logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Failed to parse start event', {
            noteId,
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            rawData: event.data
          });
        }
      });

      eventSource.addEventListener('end', (event: MessageEvent) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);
          handleStreamEvent(data);
        } catch (parseError) {
          logger.error(LogCategory.EDITOR, '[useNoteStreamListener] Failed to parse end event', {
            noteId,
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
            rawData: event.data
          });
        }
      });

      /**
       * Handler pour les messages SSE (événements sans nom - fallback)
       */
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);
          handleStreamEvent(data);
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
          const sessionId = findSessionIdByNoteId(noteId);
          if (sessionId) {
            useCanvaStore.getState().endStreaming(sessionId);
          }
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
        const sessionId = findSessionIdByNoteId(noteId);
        if (sessionId) {
          useCanvaStore.getState().endStreaming(sessionId);
        }
        isStreamingRef.current = false;
      }

      eventSourceRef.current = null;
    };
  }, [noteId, enabled, debug]); // ✅ Dépendances minimales : seulement noteId, enabled, debug

  // Retourner l'état de la connexion (optionnel, pour debugging)
  return {
    isConnected: typeof window !== 'undefined' && eventSourceRef.current?.readyState === 1, // 1 = OPEN
    reconnectAttempts: reconnectAttemptsRef.current
  };
}

