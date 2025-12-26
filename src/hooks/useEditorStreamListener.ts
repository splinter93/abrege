/**
 * 🎧 useEditorStreamListener Hook
 * 
 * Hook React pour écouter les streams SSE d'une note dans l'éditeur classique
 * Insère directement dans TipTap sans passer par le store canva
 * 
 * Usage:
 * ```tsx
 * const editor = useEditor(...);
 * useEditorStreamListener(noteId, editor, { enabled: !readonly });
 * ```
 * 
 * Le hook gère automatiquement :
 * - Connexion EventSource
 * - Reconnexion automatique en cas d'erreur
 * - Cleanup à l'unmount
 * - Insertion directe dans TipTap
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger, LogCategory } from '@/utils/logger';
import type { Editor } from '@tiptap/react';
import type { StreamEvent } from '@/services/streamBroadcastService';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import { getEditorMarkdown } from '@/utils/editorHelpers';

interface UseEditorStreamListenerOptions {
  /**
   * Activer l'écoute du stream
   * @default true
   */
  enabled?: boolean;
  
  /**
   * Position d'insertion dans l'éditeur
   * @default 'end'
   */
  defaultPosition?: 'end' | 'start' | 'cursor';
  
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
 * Hook pour écouter un stream SSE d'une note et insérer dans l'éditeur
 * 
 * @param noteId - ID de la note à écouter (null = pas d'écoute)
 * @param editor - Instance TipTap editor (peut être null pendant l'init)
 * @param options - Options de configuration
 */
export function useEditorStreamListener(
  noteId: string | null | undefined,
  editor: Editor | null,
  options: UseEditorStreamListenerOptions = {}
) {
  const {
    enabled = true,
    defaultPosition = 'end',
    onChunk,
    onEnd,
    onError,
    debug = false
  } = options;

  // Logs de debug (seulement si debug=true)
  if (debug) {
    logger.debug(LogCategory.EDITOR, '[useEditorStreamListener] Hook appelé', {
      noteId,
      hasEditor: !!editor,
      enabled
    });
  }

  const eventSourceRef = useRef<EventSource | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const isStreamingRef = useRef<boolean>(false); // ✅ FIX: Ref pour suivre l'état sans déclencher de re-renders

  // Buffer pour accumuler les chunks pendant le streaming
  const streamBufferRef = useRef<string>('');

  // Store pour mettre à jour la note
  const updateNote = useFileSystemStore(s => s.updateNote);

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

  // ✅ FIX: Stocker getAuthToken dans une ref pour éviter les dépendances instables
  const getAuthTokenRef = useRef(async (): Promise<string | null> => {
    try {
      // Essayer de récupérer le token depuis le localStorage Supabase
      const supabaseAuth = localStorage.getItem('sb-localhost-auth-token');
      if (supabaseAuth) {
        const parsed = JSON.parse(supabaseAuth);
        if (parsed.access_token) {
          return parsed.access_token;
        }
      }
      // Fallback: chercher dans d'autres clés possibles
      const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      for (const key of keys) {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.access_token) {
          return data.access_token;
        }
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Failed to get auth token from localStorage', error);
    }
    return null;
  });

  useEffect(() => {
    // ✅ LOG IMMÉDIAT pour vérifier que le useEffect s'exécute
    console.log('[useEditorStreamListener] 🔄 useEffect exécuté', {
      noteId,
      hasEditor: !!editor,
      enabled,
      readyState: eventSourceRef.current?.readyState
    });

    // Skip si pas de noteId, éditeur ou désactivé
    if (!noteId || !editor || !enabled) {
      // ✅ TOUJOURS logger si désactivé (pour debug)
      logger.info(LogCategory.EDITOR, '[useEditorStreamListener] ⏭️ Skipped', { 
        noteId, 
        hasEditor: !!editor, 
        enabled,
        reason: !noteId ? 'no noteId' : !editor ? 'no editor' : 'disabled'
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
        logger.debug(LogCategory.EDITOR, '[useEditorStreamListener] Connection already open, skipping', {
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

    // ✅ TOUJOURS logger la connexion (même si debug=false)
    logger.info(LogCategory.EDITOR, '[useEditorStreamListener] 🔌 Connecting...', { noteId });

    // Fonction async pour initialiser la connexion
    const initializeConnection = async () => {
      // Créer la connexion EventSource avec le token
      const token = await getAuthTokenRef.current();
      if (!token) {
        logger.error(LogCategory.EDITOR, '[useEditorStreamListener] ❌ No auth token available', { noteId });
        return null;
      }

      const url = `/api/v2/note/${noteId}/stream:listen?token=${encodeURIComponent(token)}`;
      logger.info(LogCategory.EDITOR, '[useEditorStreamListener] 🔗 Creating EventSource', { 
        noteId, 
        url: url.replace(/token=[^&]+/, 'token=***') 
      });
      const eventSource = new EventSource(url);
      return eventSource;
    };

    // Initialiser la connexion
    initializeConnection().then(eventSource => {
      if (!eventSource) return;
      
      eventSourceRef.current = eventSource;

      // Position initiale d'insertion (sera mise à jour si le stream spécifie une position)
      let insertPosition = editor.state.selection.to;

      /**
       * Handler pour les messages SSE
       */
      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);

          // ✅ TOUJOURS logger les événements pour debug (même en prod)
          logger.info(LogCategory.EDITOR, '[useEditorStreamListener] 📨 Event received', {
            noteId,
            type: data.type,
            dataLength: data.data?.length || 0,
            hasMetadata: !!data.metadata,
            source: data.metadata?.source
          });

          switch (data.type) {
                    case 'start':
                      // Stream initialisé
                      logger.info(LogCategory.EDITOR, '[useEditorStreamListener] Stream started', {
                        noteId
                      });
                      setIsStreaming(true);
                      isStreamingRef.current = true;
                      streamBufferRef.current = '';
              reconnectAttemptsRef.current = 0;
              
              // Sauvegarder la position courante du curseur
              insertPosition = editor.state.selection.to;
              break;

            case 'chunk':
              // Réception d'un chunk de contenu
              if (data.data) {
                // Accumuler dans le buffer
                streamBufferRef.current += data.data;

                // Déterminer la position d'insertion
                const position = data.position || defaultPosition;
                
                // Insérer le chunk dans TipTap
                if (position === 'end') {
                  // Insérer à la fin du document
                  editor.commands.insertContentAt(
                    editor.state.doc.content.size,
                    data.data
                  );
                } else if (position === 'start') {
                  // Insérer au début du document
                  editor.commands.insertContentAt(0, data.data);
                } else if (position === 'cursor') {
                  // Insérer à la position du curseur/stream
                  editor.commands.insertContentAt(insertPosition, data.data);
                  insertPosition += data.data.length;
                }

                        // Callback optionnel
                        onChunkRef.current?.(data.data);

                if (debug) {
                  logger.debug(LogCategory.EDITOR, '[useEditorStreamListener] Chunk inserted', {
                    noteId,
                    chunkLength: data.data.length,
                    position,
                    totalBufferLength: streamBufferRef.current.length
                  });
                }
              }
              break;

                    case 'end':
                      // Fin du stream
                      setIsStreaming(false);
                      isStreamingRef.current = false;

                      logger.info(LogCategory.EDITOR, '[useEditorStreamListener] Stream ended', {
                        noteId,
                        totalLength: streamBufferRef.current.length
                      });

                      // Reset buffer
                      streamBufferRef.current = '';

                      onEndRef.current?.();
                      break;

            case 'content_updated':
              // 🔔 Notification que le contenu a été mis à jour (alternative au realtime)
              // ✅ FIX: Mettre à jour directement l'éditeur SANS passer par le store
              // Cela évite de déclencher EditorSyncManager qui ferait sauter le curseur
              logger.info(LogCategory.EDITOR, '[useEditorStreamListener] 🔔 Content updated notification received', {
                noteId,
                hasEditor: !!editor,
                editorFocused: editor?.isFocused,
                metadata: data.metadata,
                rawData: data.data
              });
              
              // Recharger le contenu depuis l'API et mettre à jour directement l'éditeur
              // ✅ On met à jour même si l'utilisateur tape - c'est une mise à jour externe (LLM)
              if (noteId && editor) {
                (async () => {
                  try {
                    const token = await getAuthTokenRef.current();
                    if (!token) {
                      logger.warn(LogCategory.EDITOR, '[useEditorStreamListener] No token for content reload', { noteId });
                      return;
                    }
                    
                    const res = await fetch(`/api/v2/note/${noteId}?fields=content`, {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });
                    
                    const result = await res.json();
                    if (result.success && result.note?.markdown_content) {
                      const newContent = result.note.markdown_content;
                      const currentContent = getEditorMarkdown(editor);
                      
                      // ✅ Si le contenu est identique, ne rien faire (évite les rechargements inutiles)
                      if (currentContent === newContent) {
                        logger.debug(LogCategory.EDITOR, '[useEditorStreamListener] Content unchanged, skipping update', {
                          noteId
                        });
                        return;
                      }
                      
                      // ✅ Mettre à jour DIRECTEMENT l'éditeur sans passer par le store
                      // Cela évite de déclencher EditorSyncManager qui ferait sauter le curseur
                      // On préserve la position du curseur
                      const currentSelection = editor.state.selection;
                      const wasFocused = editor.isFocused;
                      
                      editor.commands.setContent(newContent, { emitUpdate: false });
                      
                      // Essayer de restaurer la position du curseur si possible
                      try {
                        const docSize = editor.state.doc.content.size;
                        if (currentSelection.to <= docSize) {
                          editor.commands.setTextSelection(currentSelection);
                        } else {
                          // Si le curseur est au-delà de la taille du nouveau doc, le mettre à la fin
                          editor.commands.setTextSelection(docSize);
                        }
                        
                        // Restaurer le focus si l'utilisateur avait le focus
                        if (wasFocused) {
                          editor.commands.focus();
                        }
                      } catch {
                        // Si la restauration échoue, laisser le curseur où il est
                      }
                      
                      logger.info(LogCategory.EDITOR, '[useEditorStreamListener] Editor updated directly with new content', {
                        noteId,
                        contentLength: newContent.length,
                        wasFocused
                      });
                    }
                  } catch (error) {
                    logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Failed to reload content', {
                      noteId,
                      error: error instanceof Error ? error.message : 'Unknown error'
                    });
                  }
                })();
              }
              break;

            case 'error':
              // Erreur serveur
              const errorMsg = data.data || 'Unknown error';
              logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Server error', {
                noteId,
                error: errorMsg
              });

              setIsStreaming(false);
              isStreamingRef.current = false;
              streamBufferRef.current = '';

              const error = new Error(`Stream error: ${errorMsg}`);
              onErrorRef.current?.(error);
              break;

            default:
              logger.warn(LogCategory.EDITOR, '[useEditorStreamListener] Unknown event type', {
                noteId,
                type: data.type
              });
          }
        } catch (parseError) {
          logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Failed to parse event', {
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
        logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Connection error', {
          noteId,
          readyState: eventSource.readyState,
          reconnectAttempts: reconnectAttemptsRef.current
        });

        // Fermer la connexion actuelle
        eventSource.close();

        // Fin du streaming en cours si erreur
        // ✅ FIX: Utiliser isStreamingRef pour éviter les dépendances
        const wasStreaming = isStreamingRef.current;
        if (wasStreaming) {
          setIsStreaming(false);
          isStreamingRef.current = false;
          streamBufferRef.current = '';
        }

        // EventSource reconnecte automatiquement
        reconnectAttemptsRef.current += 1;

        // Callback optionnel
        const connectionError = new Error('SSE connection error');
        onErrorRef.current?.(connectionError);
      };

      /**
       * Handler pour l'ouverture de la connexion
       */
      eventSource.onopen = () => {
        logger.info(LogCategory.EDITOR, '[useEditorStreamListener] ✅ Connection opened', { 
          noteId,
          readyState: eventSource.readyState,
          url: eventSource.url
        });
        reconnectAttemptsRef.current = 0;
      };
    }).catch(error => {
      logger.error(LogCategory.EDITOR, '[useEditorStreamListener] Failed to initialize connection', error);
    });

    // Cleanup à l'unmount ou au changement de noteId/editor
    return () => {
      if (debug) {
        logger.debug(LogCategory.EDITOR, '[useEditorStreamListener] Cleanup', { noteId });
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Reset état
      setIsStreaming(false);
      isStreamingRef.current = false;
      streamBufferRef.current = '';
      eventSourceRef.current = null;
    };
  }, [noteId, editor, enabled, defaultPosition, debug]); // ✅ FIX: getAuthToken et updateNote retirés des dépendances (utilisés via refs)

  // Retourner l'état de la connexion
  return {
    isStreaming,
    isConnected: typeof window !== 'undefined' && eventSourceRef.current?.readyState === 1, // EventSource.OPEN = 1
    reconnectAttempts: reconnectAttemptsRef.current
  };
}

