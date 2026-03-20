/**
 * 🎨 CHAT CANVA PANE - Solution Hybride
 * 
 * Affiche un éditeur TipTap dans le chat avec:
 * - Note DB réelle (orpheline) créée dès l'ouverture
 * - Streaming LLM local (state Zustand) sans write DB
 * - Auto-save différé (toutes les 2s après stream)
 * - Resize manuel via handle
 * 
 * @module ChatCanvaPane
 */

'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvaStore } from '@/store/useCanvaStore';
import { useAuth } from '@/hooks/useAuth';
import { logger, LogCategory } from '@/utils/logger';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorWithMarkdown } from '@/types/editor';
import { hasMarkdownStorage } from '@/types/editor';
import Editor from '@/components/editor/Editor';
import { hashString } from '@/utils/editorHelpers';
import { useRealtime } from '@/hooks/useRealtime';
import { supabase } from '@/supabaseClient';
import { useCanvasStreamOps } from '@/hooks/useCanvasStreamOps';

interface ChatCanvaPaneProps {
  onRequestClose?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

const ChatCanvaPane: React.FC<ChatCanvaPaneProps> = ({ 
  onRequestClose, 
  width = 66, 
  onWidthChange 
}) => {
  const { user } = useAuth();
  const { sessions, activeCanvaId, closeCanva, startStreaming, appendStreamChunk, endStreaming } = useCanvaStore();
  const session = activeCanvaId ? sessions[activeCanvaId] : null;

  // Refs
  const canvaPaneRef = useRef<HTMLElement>(null);
  const editorRef = useRef<EditorWithMarkdown | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedHashRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Resize handle state
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isEventSourceConnected, setIsEventSourceConnected] = useState(false);
  const editorLayoutRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  
  const handleEditorReady = useCallback(() => {
    setIsEditorReady(true);
    
    // ✅ FIX: Scroll automatique vers le top pour s'assurer que le header est visible
    // Le header sticky nécessite que le conteneur scrollable soit au top
    setTimeout(() => {
      const editorLayout = document.querySelector('.chat-canva-pane .editor-layout') as HTMLElement | null;
      const editorHeader = document.querySelector('.chat-canva-pane .editor-header') as HTMLElement | null;
      
      if (editorLayout) {
        editorLayoutRef.current = editorLayout;
        editorLayout.scrollTop = 0;
        logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] ✅ Scroll vers top après chargement', {
          scrollTop: editorLayout.scrollTop,
          timestamp: Date.now()
        });
      }
      
      if (editorHeader) {
        headerRef.current = editorHeader;
      }
    }, 100); // Petit délai pour laisser le DOM se stabiliser
  }, []);

  // ✅ FIX: S'assurer que le scroll commence au top uniquement au refresh/chargement initial
  // Le header sticky reste visible naturellement lors du scroll normal
  useEffect(() => {
    if (!isEditorReady) return;

    const findElements = (): { layout: HTMLElement | null; header: HTMLElement | null } => {
      const layout = editorLayoutRef.current || 
      (document.querySelector('.chat-canva-pane .editor-layout') as HTMLElement | null);
      const header = headerRef.current || 
      (document.querySelector('.chat-canva-pane .editor-header') as HTMLElement | null);

      if (layout) editorLayoutRef.current = layout;
      if (header) headerRef.current = header;
      
      return { layout, header };
    };

    // ✅ Vérification initiale UNIQUEMENT au chargement (refresh)
      const timeoutId = setTimeout(() => {
      const { layout } = findElements();
      
      if (layout) {
        // S'assurer que le scroll est au top au chargement initial uniquement
        layout.scrollTop = 0;
        logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] ✅ Scroll initialisé au top au chargement', {
          scrollTop: layout.scrollTop,
              timestamp: Date.now()
            });
          }
    }, 100); // Petit délai pour laisser le DOM se stabiliser

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isEditorReady, session?.id]); // ✅ Réinitialiser au changement de session

  // 🎯 Realtime édition note via RealtimeService (articles)
  const realtimeState = useRealtime({
    userId: user?.id || '',
    noteId: session?.noteId,
    enabled: Boolean(user && session?.noteId),
    debug: true // ✅ DEBUG: Activer pour diagnostiquer
  });

  // ✅ DEBUG: Log l'état realtime pour diagnostiquer
  React.useEffect(() => {
    if (session?.noteId) {
      logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Realtime state', {
        isConnected: realtimeState.isConnected,
        isConnecting: realtimeState.isConnecting,
        channels: realtimeState.channels.length,
        error: realtimeState.error,
        noteId: session.noteId,
        userId: user?.id
      });
    }
  }, [realtimeState.isConnected, realtimeState.isConnecting, realtimeState.channels.length, realtimeState.error, session?.noteId, user?.id]);


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ STREAMING INSERTION (comme Ask AI)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * ✅ FIX: Insertion directe dans le callback (comme Ask AI)
   * Au lieu de passer par streamBuffer + useEffect, on insère directement
   * dans le callback onChunk de useNoteStreamListener
   */
  const accumulatedContentRef = useRef<string>('');
  const insertionStartPosRef = useRef<number | null>(null);
  // ✅ Buffer des chunks reçus avant que l'éditeur soit prêt (flush à l'arrivée de l'éditeur)
  const streamBufferBeforeReadyRef = useRef<string>('');
  // ✅ Mode du stream en cours : 'full_replace' = vider le doc, puis reconstruire
  const streamModeRef = useRef<'full_replace' | null>(null);

  // ✅ Callback pour insertion directe — supporte full_replace et buffer pre-ready
  const handleStreamChunk = useCallback((chunk: string) => {
    logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] handleStreamChunk called', {
      hasEditor: !!editorRef.current,
      hasSession: !!session,
      sessionId: session?.id,
      chunkLength: chunk.length,
      chunkPreview: chunk.substring(0, 50)
    });

    if (!session?.id) {
      logger.warn(LogCategory.EDITOR, '[ChatCanvaPane] handleStreamChunk skipped (no session)', { sessionId: session?.id });
      return;
    }

    // ✅ Éditeur pas encore prêt : mettre en buffer et ne pas insérer
    if (!editorRef.current) {
      streamBufferBeforeReadyRef.current += chunk;
      logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Chunk buffered (editor not ready)', {
        bufferedLength: streamBufferBeforeReadyRef.current.length
      });
      return;
    }

    // ✅ Flush le buffer éventuel au premier chunk avec éditeur prêt
    if (streamBufferBeforeReadyRef.current.length > 0) {
      chunk = streamBufferBeforeReadyRef.current + chunk;
      streamBufferBeforeReadyRef.current = '';
      logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Flushed buffered chunks', { chunkLength: chunk.length });
    }

    // ✅ Initialiser la position d'insertion au premier chunk
    if (insertionStartPosRef.current === null) {
      if (streamModeRef.current === 'full_replace') {
        // full_replace : on reconstruit depuis le début
        insertionStartPosRef.current = 0;
      } else {
        // Mode legacy (append) : insérer à la fin du document
        insertionStartPosRef.current = editorRef.current.state.doc.content.size;
      }
      accumulatedContentRef.current = '';
      logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Initialized insertion position', {
        pos: insertionStartPosRef.current,
        mode: streamModeRef.current,
        sessionId: session.id
      });
    }

    accumulatedContentRef.current += chunk;

    const startPos = insertionStartPosRef.current;
    const docSize = editorRef.current.state.doc.content.size;
    const toPos = Math.min(startPos + accumulatedContentRef.current.length, docSize);

    try {
      editorRef.current.chain()
        .focus()
        .setTextSelection({ from: startPos, to: toPos })
        .deleteSelection()
        .focus(startPos)
        .insertContent({ type: 'text', text: accumulatedContentRef.current })
        .run();
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Failed to insert chunk', error);
    }
  }, [session?.id]);

  const handleStreamEnd = useCallback(() => {
    if (!session?.id) return;

    // ✅ Si éditeur pas encore prêt, le buffer sera perdu (stream terminé) ; endStreaming appelé par le callback du canal
    if (!editorRef.current) {
      if (streamBufferBeforeReadyRef.current.length > 0) {
        logger.warn(LogCategory.EDITOR, '[ChatCanvaPane] Stream end with buffered chunks but no editor', {
          bufferedLength: streamBufferBeforeReadyRef.current.length
        });
        streamBufferBeforeReadyRef.current = '';
      }
      streamModeRef.current = null;
      return;
    }

    if (accumulatedContentRef.current && insertionStartPosRef.current !== null) {
      const startPos = insertionStartPosRef.current;
      const endPos = startPos + accumulatedContentRef.current.length;

      try {
        editorRef.current.chain()
          .focus()
          .setTextSelection({ 
            from: startPos, 
            to: Math.min(endPos, editorRef.current.state.doc.content.size) 
          })
          .deleteSelection()
          .focus(startPos)
          .insertContent(accumulatedContentRef.current)
          .run();

        logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Markdown converted at stream end', {
          sessionId: session.id,
          contentLength: accumulatedContentRef.current.length
        });
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Failed to convert markdown', error);
      }
    }

    accumulatedContentRef.current = '';
    insertionStartPosRef.current = null;
    streamModeRef.current = null;
  }, [session?.id]);

  // ✅ STREAMING : Supabase Realtime Broadcast (editNoteContent chunks)
  // S'abonner dès qu'on a noteId (sans attendre isEditorReady) pour ne pas manquer start/chunk/end
  // Les chunks reçus avant éditeur prêt sont mis en buffer (streamBufferBeforeReadyRef) et flush au premier chunk avec éditeur
  useEffect(() => {
    if (!session || !session.noteId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const noteId = session.noteId;
    const channelName = `note-stream:${noteId}`;

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'start' }, (payload: { payload?: { mode?: string } }) => {
        const mode = payload?.payload?.mode;
        logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Stream START received', { noteId, mode });

        // ✅ full_replace : on vide l'éditeur avant de reconstruire chunk par chunk
        streamModeRef.current = mode === 'full_replace' ? 'full_replace' : null;
        accumulatedContentRef.current = '';
        insertionStartPosRef.current = null;
        streamBufferBeforeReadyRef.current = '';

        if (streamModeRef.current === 'full_replace' && editorRef.current) {
          try {
            editorRef.current.commands.clearContent();
            logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Editor cleared for full_replace', { noteId });
          } catch (error) {
            logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Failed to clear editor on start', error);
          }
        }

        setIsEventSourceConnected(true);
        if (session?.id) {
          startStreaming(session.id);
        }
      })
      .on('broadcast', { event: 'chunk' }, (payload: { payload?: { data?: string } }) => {
        const data = payload?.payload?.data;
        if (typeof data === 'string') {
          logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Chunk received', {
            noteId,
            chunkLength: data.length,
            sessionId: session?.id
          });
          handleStreamChunk(data);
        }
      })
      .on('broadcast', { event: 'end' }, () => {
        logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Stream END received', { noteId, sessionId: session?.id });
        handleStreamEnd();
        if (session?.id) {
          endStreaming(session.id);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsEventSourceConnected(true);
          logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Supabase channel subscribed', { noteId, channelName });
        } else if (status === 'CHANNEL_ERROR') {
          setIsEventSourceConnected(false);
          logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Supabase channel error', { noteId });
        } else {
          logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Channel status', { status, noteId });
        }
      });

    channelRef.current = channel;
    const sessionIdForCleanup = session?.id;

    return () => {
      setIsEventSourceConnected(false);
      if (sessionIdForCleanup) {
        endStreaming(sessionIdForCleanup);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session?.noteId, session?.id, activeCanvaId, endStreaming]);

  // 🔄 Canvas streaming ops (local-first)
  const { sendOp, isConnected: isOpsConnected, lastServerVersion } = useCanvasStreamOps(
    session?.noteId || null,
    {
      enabled: Boolean(session?.noteId),
      debug: false,
      onAck: (result) => {
        logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Op ACK', {
          op_id: result.op_id,
          server_version: result.server_version
        });
      },
      onConflict: (result) => {
        logger.warn(LogCategory.EDITOR, '[ChatCanvaPane] Op CONFLICT', {
          op_id: result.op_id,
          reason: result.reason,
          expected_version: result.expected_version
        });
        // TODO: Gérer les conflits (rechargement, merge, etc.)
      },
      onError: (error) => {
        logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Op ERROR', {
          error: error.message
        });
      }
    }
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ AUTO-SAVE (Skip si streaming)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Auto-save toutes les 2s (si pas de streaming)
   */
  useEffect(() => {
    if (!session || !user) {
      lastSavedHashRef.current = null;
      return;
    }

    if (!editorRef.current) {
      return;
    }

    // ⚠️ Skip auto-save si streaming actif
    if (session.isStreaming) {
      logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Auto-save suspended (streaming active)', {
        sessionId: session.id
      });
      return;
    }

    const normalizeMarkdown = (value: string): string => value.replace(/\r\n/g, '\n').trim();

    const editor = editorRef.current;
    let initialMarkdown = '';
    if (hasMarkdownStorage(editor) && editor.storage.markdown?.getMarkdown) {
      initialMarkdown = editor.storage.markdown.getMarkdown() || '';
    }
    const initialHash = hashString(normalizeMarkdown(initialMarkdown));
    if (lastSavedHashRef.current === null) {
      lastSavedHashRef.current = initialHash;
    }

    const interval = setInterval(async () => {
      if (!editorRef.current) return;

      try {
        const currentEditor = editorRef.current;
        let markdown = '';
        if (hasMarkdownStorage(currentEditor) && currentEditor.storage.markdown?.getMarkdown) {
          markdown = currentEditor.storage.markdown.getMarkdown() || '';
        }
        const normalizedMarkdown = normalizeMarkdown(markdown);
        
        if (!normalizedMarkdown) {
          logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] No content to save');
          return;
        }

        const currentHash = hashString(normalizedMarkdown);
        if (lastSavedHashRef.current === currentHash) {
          return;
        }

        const result = await v2UnifiedApi.updateNote(
          session.noteId,
          { markdown_content: markdown }
        );

        if (!result.success) {
          logger.error(LogCategory.EDITOR, '[ChatCanvaPane] ❌ Auto-save failed', {
            noteId: session.noteId,
            error: result.error
          });
          return;
        }

        lastSavedHashRef.current = currentHash;

        logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] ✅ Auto-saved', {
          noteId: session.noteId,
          contentLength: markdown.length,
          duration: result.duration
        });

      } catch (error) {
        logger.error(LogCategory.EDITOR, '[ChatCanvaPane] ❌ Auto-save failed', error);
      }
    }, 2000); // 2s

    return () => {
      clearInterval(interval);
      lastSavedHashRef.current = null;
    };
  }, [session, session?.noteId, session?.isStreaming, user]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ HANDLERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Fermer le canva
   */
  const handleClose = useCallback(() => {
    if (!activeCanvaId) return;
    closeCanva(activeCanvaId);
    onRequestClose?.();
  }, [activeCanvaId, closeCanva, onRequestClose]);

  /**
   * Sauvegarder = Attacher à un classeur
   * TODO: Implémenter modal picker classeur
   */
  const handleSave = useCallback(async () => {
    if (!session || !user) return;

    // Pour l'instant, juste logger
    // Phase 2: Ajouter modal classeur picker
    logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Save requested (not implemented yet)', {
      noteId: session.noteId
    });

    // Exemple futur:
    // const { classeurId, folderId } = await openClasseurPickerModal();
    // await CanvaNoteService.attachToClasseur(session.noteId, classeurId, folderId, user.id);
    // closeCanva(session.id);

  }, [session, user]);

  /**
   * Récupérer ref de l'éditeur TipTap
   * Si des chunks ont été mis en buffer avant que l'éditeur soit prêt, on les insère à la fin du doc.
   */
  const handleEditorRef = useCallback((editor: EditorWithMarkdown | null) => {
    editorRef.current = editor;

    if (!editor) {
      return;
    }

    // ✅ Flush du buffer de stream (chunks reçus avant que l'éditeur soit disponible)
    const buffered = streamBufferBeforeReadyRef.current;
    if (buffered.length > 0) {
      streamBufferBeforeReadyRef.current = '';
      try {
        const docSize = editor.state.doc.content.size;
        editor.chain().focus(docSize).insertContent({ type: 'text', text: buffered }).run();
        logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Flushed buffered stream on editor ref', {
          length: buffered.length,
          sessionId: session?.id
        });
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Failed to flush buffered stream', error);
      }
    }

    let hasText = false;
    if (hasMarkdownStorage(editor) && editor.storage.markdown?.getMarkdown) {
      const markdown = editor.storage.markdown.getMarkdown() || '';
      hasText = markdown.replace(/\s+/g, '').length > 0;
    }
    if (hasText) {
      return;
    }

    requestAnimationFrame(() => {
      if (!editorRef.current) return;
      editorRef.current.commands.focus('start');
    });
  }, [session?.id]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ RESIZE HANDLE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerWidth = window.innerWidth;
      const deltaX = startXRef.current - e.clientX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newWidth = Math.min(Math.max(startWidthRef.current + deltaPercent, 40), 80);
      
      if (onWidthChange) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onWidthChange]);

  useEffect(() => {
    setIsEditorReady(false);
  }, [session?.id]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━

  if (!session) {
    return null;
  }

  return (
    <section 
      ref={canvaPaneRef}
      className="chat-canva-pane" 
      aria-label="Canva TipTap"
      style={{ flexBasis: `${width}%`, position: 'relative' }}
    >
      <div 
        className="chat-canva-pane__resize-handle"
        onMouseDown={handleMouseDown}
        aria-label="Redimensionner le canva"
      />

      {/* TODO Phase 2: Ajouter toolbar avec bouton Save */}
      {/* <div className="canva-toolbar">
        <button onClick={handleSave} disabled={session.isStreaming}>
          💾 Sauvegarder
        </button>
        <button onClick={handleClose}>
          ✕ Fermer
        </button>
      </div> */}

      {/* Indicateur streaming */}
      {session.isStreaming && (
        <div className="canva-streaming-indicator">
          ✨ L'IA rédige...
        </div>
      )}

      {/* Indicateurs de statut (bas à droite) */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000
      }}>
        {/* Indicateur EventSource (Streaming) */}
      <div 
        className="canva-eventsource-indicator"
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: isEventSourceConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isEventSourceConnected ? '#22c55e' : '#ef4444',
          border: `1px solid ${isEventSourceConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)'
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isEventSourceConnected ? '#22c55e' : '#ef4444',
            boxShadow: isEventSourceConnected 
              ? '0 0 8px rgba(34, 197, 94, 0.5)' 
              : '0 0 8px rgba(239, 68, 68, 0.5)'
          }}
        />
        <span>
            {isEventSourceConnected ? 'Stream actif' : 'Stream inactif'}
          </span>
        </div>

        {/* Indicateur Realtime */}
        <div 
          className="canva-realtime-indicator"
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            backgroundColor: realtimeState.isConnected 
              ? 'rgba(59, 130, 246, 0.15)' 
              : realtimeState.isConnecting 
                ? 'rgba(251, 191, 36, 0.15)' 
                : 'rgba(239, 68, 68, 0.15)',
            color: realtimeState.isConnected 
              ? '#3b82f6' 
              : realtimeState.isConnecting 
                ? '#fbbf24' 
                : '#ef4444',
            border: `1px solid ${
              realtimeState.isConnected 
                ? 'rgba(59, 130, 246, 0.3)' 
                : realtimeState.isConnecting 
                  ? 'rgba(251, 191, 36, 0.3)' 
                  : 'rgba(239, 68, 68, 0.3)'
            }`,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: realtimeState.isConnected 
                ? '#3b82f6' 
                : realtimeState.isConnecting 
                  ? '#fbbf24' 
                  : '#ef4444',
              boxShadow: realtimeState.isConnected 
                ? '0 0 8px rgba(59, 130, 246, 0.5)' 
                : realtimeState.isConnecting 
                  ? '0 0 8px rgba(251, 191, 36, 0.5)' 
                  : '0 0 8px rgba(239, 68, 68, 0.5)',
              animation: realtimeState.isConnecting ? 'pulse 2s infinite' : 'none'
            }}
          />
          <span>
            {realtimeState.isConnected 
              ? `Realtime (${realtimeState.channels.length})` 
              : realtimeState.isConnecting 
                ? 'Realtime...' 
                : realtimeState.error 
                  ? `Realtime: ${realtimeState.error.substring(0, 20)}...` 
                  : 'Realtime inactif'}
        </span>
        </div>
      </div>

      <div className="chat-canva-pane__editor">
        <div className={`chat-canva-pane__editor-content ${isEditorReady ? 'is-ready' : ''}`}>
          <EditorMemo
            sessionId={session.id}
            noteId={session.noteId}
            onClose={handleClose}
            onEditorRef={handleEditorRef}
            onReady={handleEditorReady}
          />
        </div>
        <div className={`chat-canva-pane__loader ${isEditorReady ? 'is-hidden' : ''}`}>
          <div className="chat-canva-pane__loader-spinner" />
          <p>Ouverture du canva…</p>
        </div>
      </div>
    </section>
  );
};

/**
 * ✅ Editor mémoïsé pour éviter re-renders multiples
 * Key change = re-mount, mais props stables = pas de re-render
 * 
 * ⚠️ ATTENTION: React.memo peut cacher les props si elles ne changent pas
 * On utilise une fonction de comparaison personnalisée pour forcer le re-render
 * si forceShowToolbar ou toolbarContext changent
 */
const EditorMemo = React.memo(({ sessionId, noteId, onClose, onEditorRef, onReady }: {
  sessionId: string;
  noteId: string;
  onClose: () => void;
  onEditorRef: (editor: EditorWithMarkdown | null) => void;
  onReady?: () => void;
}) => {
  // ✅ DEBUG: Log pour diagnostiquer
  React.useEffect(() => {
    logger.info(LogCategory.EDITOR, '[EditorMemo] Canvas Editor monté', {
      sessionId,
      noteId,
      forceShowToolbar: true,
      toolbarContext: 'canvas',
      timestamp: Date.now()
    });
  }, [sessionId, noteId]);

  return (
    <Editor
      key={`canva-${sessionId}-${noteId}`}
      noteId={noteId}
      onClose={onClose}
      onEditorRef={onEditorRef}
      onReady={onReady}
      forceShowToolbar={true} // ✅ Force la toolbar toujours visible dans le canvas
      toolbarContext="canvas" // ✅ Contexte séparé pour localStorage
    />
  );
}, (prevProps, nextProps) => {
  // ✅ Comparaison personnalisée : toujours re-render si sessionId ou noteId change
  // Cela garantit que forceShowToolbar est toujours appliqué
  return prevProps.sessionId === nextProps.sessionId && 
         prevProps.noteId === nextProps.noteId;
});

export default ChatCanvaPane;
