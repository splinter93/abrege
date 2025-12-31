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
// ✅ Réactivé : écoute les chunks de editNoteContent via ops:listen
import { useNoteStreamListener } from '@/hooks/useNoteStreamListener';
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
  const eventSourceRef = useRef<EventSource | null>(null); // ✅ Ref pour EventSource

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

  // ✅ FIX: Intersection Observer pour garantir que le header reste toujours visible
  // Si le header sort du viewport du conteneur scrollable, on remet le scroll à 0
  useEffect(() => {
    if (!isEditorReady) return;

    const editorLayout = editorLayoutRef.current || 
      (document.querySelector('.chat-canva-pane .editor-layout') as HTMLElement | null);
    const editorHeader = headerRef.current || 
      (document.querySelector('.chat-canva-pane .editor-header') as HTMLElement | null);

    if (!editorLayout || !editorHeader) {
      // Réessayer après un court délai si les éléments ne sont pas encore disponibles
      const timeoutId = setTimeout(() => {
        const retryLayout = document.querySelector('.chat-canva-pane .editor-layout') as HTMLElement | null;
        const retryHeader = document.querySelector('.chat-canva-pane .editor-header') as HTMLElement | null;
        if (retryLayout && retryHeader) {
          editorLayoutRef.current = retryLayout;
          headerRef.current = retryHeader;
        }
      }, 200);
      return () => clearTimeout(timeoutId);
    }

    editorLayoutRef.current = editorLayout;
    headerRef.current = editorHeader;

    // Utiliser Intersection Observer pour détecter si le header est visible
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Si le header n'est pas visible (intersectionRatio < 1) et scrollTop > 0
          // Cela signifie que le header a été scrollé hors du viewport
          if (!entry.isIntersecting && editorLayout.scrollTop > 0) {
            // Remettre le scroll à 0 pour garder le header visible
            editorLayout.scrollTop = 0;
            logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] ✅ Header restauré via Intersection Observer', {
              scrollTop: editorLayout.scrollTop,
              isIntersecting: entry.isIntersecting,
              intersectionRatio: entry.intersectionRatio,
              timestamp: Date.now()
            });
          }
        }
      },
      {
        root: editorLayout, // Conteneur scrollable
        rootMargin: '0px',
        threshold: [0, 0.1, 0.5, 1] // Détecter à différents niveaux de visibilité
      }
    );

    observer.observe(editorHeader);

    return () => {
      observer.disconnect();
    };
  }, [isEditorReady]);

  // 🎯 Realtime édition note via RealtimeService (articles)
  useRealtime({
    userId: user?.id || '',
    noteId: session?.noteId,
    enabled: Boolean(user && session?.noteId),
    debug: false
  });


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
  
  // ✅ Callback pour insertion directe (comme Ask AI)
  const handleStreamChunk = useCallback((chunk: string) => {
    logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] handleStreamChunk called', {
      hasEditor: !!editorRef.current,
      hasSession: !!session,
      sessionId: session?.id,
      chunkLength: chunk.length,
      chunkPreview: chunk.substring(0, 50)
    });

    if (!editorRef.current || !session?.id) {
      logger.warn(LogCategory.EDITOR, '[ChatCanvaPane] handleStreamChunk skipped', {
        hasEditor: !!editorRef.current,
        hasSession: !!session,
        sessionId: session?.id
      });
      return;
    }

    // ✅ Initialiser la position d'insertion au premier chunk
    if (insertionStartPosRef.current === null) {
      const docSize = editorRef.current.state.doc.content.size;
      insertionStartPosRef.current = docSize;
      accumulatedContentRef.current = '';
      logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Initialized insertion position', {
        docSize,
        sessionId: session.id
      });
    }

    // ✅ Accumuler le contenu (comme Ask AI)
    accumulatedContentRef.current += chunk;

    // ✅ Insérer le contenu accumulé (comme Ask AI)
    // Utiliser la même logique que usePromptExecution
    const startPos = insertionStartPosRef.current;
    const currentLength = editorRef.current.state.doc.textBetween(
      startPos,
      editorRef.current.state.doc.content.size
    ).length;
    const endPos = startPos + Math.min(
      accumulatedContentRef.current.length,
      currentLength + chunk.length
    );

    try {
      editorRef.current.chain()
        .focus()
        .setTextSelection({ 
          from: startPos, 
          to: Math.min(endPos, editorRef.current.state.doc.content.size) 
        })
        .deleteSelection()
        .focus(startPos)
        .insertContent({ type: 'text', text: accumulatedContentRef.current })
        .run();
    } catch (error) {
      logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Failed to insert chunk', error);
    }
  }, [session?.id]);

  const handleStreamEnd = useCallback(() => {
    if (!editorRef.current || !session?.id) {
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
  }, [session?.id]);

  // ✅ STREAMING SSE : EventSource directement dans ChatCanvaPane
  useEffect(() => {
    // ✅ FIX: Attendre que l'éditeur soit prêt ET que la session soit disponible
    if (!session || !session.noteId || !isEditorReady) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const noteId = session.noteId;

    // ✅ FIX: Ne pas recréer si déjà connecté
    if (eventSourceRef.current && eventSourceRef.current.readyState === EventSource.OPEN) {
      return;
    }

    // Cleanup de la connexion précédente si elle existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Récupérer le token
    const getToken = () => {
      try {
        const supabaseAuth = localStorage.getItem('sb-localhost-auth-token');
        if (supabaseAuth) {
          const parsed = JSON.parse(supabaseAuth);
          return parsed.access_token;
        }
        const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        for (const key of keys) {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.access_token) return data.access_token;
        }
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Failed to get token', error);
      }
      return null;
    };

    const token = getToken();
    if (!token) {
      logger.error(LogCategory.EDITOR, '[ChatCanvaPane] No auth token available', { noteId });
      return;
    }

    // ✅ TEST: Utiliser ops-listen au lieu de ops:listen (problème de routing Next.js avec :)
    const url = `/api/v2/canvas/${noteId}/ops-listen?token=${encodeURIComponent(token)}`;
    logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Creating EventSource', { 
      noteId, 
      url: url.replace(/token=[^&]+/, 'token=***'),
      isEditorReady,
      hasSession: !!session,
      sessionId: session?.id
    });
    logger.info(LogCategory.EDITOR, '[ChatCanvaPane] Creating EventSource', { noteId, url: url.replace(/token=[^&]+/, 'token=***') });
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] EventSource created', { 
      noteId, 
      readyState: eventSource.readyState,
      url: eventSource.url.replace(/token=[^&]+/, 'token=***'),
      sessionId: session?.id
    });

    eventSource.onopen = () => {
      setIsEventSourceConnected(true);
      logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] EventSource opened', {
        noteId,
        readyState: eventSource.readyState,
        url: eventSource.url.replace(/token=[^&]+/, 'token=***'),
        sessionId: session?.id
      });
      logger.info(LogCategory.EDITOR, '[ChatCanvaPane] ✅ EventSource opened', { noteId, readyState: eventSource.readyState });
    };

    // ✅ Écouter l'événement 'start' pour confirmer que le stream démarre
    eventSource.addEventListener('start', (event: MessageEvent) => {
      logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Stream START event received', {
        noteId,
        data: event.data,
        sessionId: session?.id
      });
      logger.info(LogCategory.EDITOR, '[ChatCanvaPane] ✅ Stream START event received', { noteId });
    });

    eventSource.addEventListener('chunk', (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === 'chunk' && typeof parsed.data === 'string') {
          logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Chunk received', {
            noteId,
            chunkLength: parsed.data.length,
            chunkPreview: parsed.data.substring(0, 50),
            sessionId: session?.id
          });
          handleStreamChunk(parsed.data);
        }
      } catch (error) {
        logger.error(LogCategory.EDITOR, '[ChatCanvaPane] Failed to parse chunk', error);
      }
    });

    eventSource.addEventListener('end', () => {
      logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Stream END event received', { noteId, sessionId: session?.id });
      handleStreamEnd();
    });

    eventSource.onerror = (error) => {
      setIsEventSourceConnected(false);
      const readyStateText = eventSource.readyState === 0 ? 'CONNECTING' : eventSource.readyState === 1 ? 'OPEN' : 'CLOSED';
      logger.error(LogCategory.EDITOR, '[ChatCanvaPane] EventSource error', {
        noteId,
        readyState: eventSource.readyState,
        readyStateText,
        url: eventSource.url.replace(/token=[^&]+/, 'token=***'),
        error: error instanceof Error ? error.message : String(error),
        sessionId: session?.id
      });
      
      // Si CLOSED, l'EventSource a échoué complètement
      if (eventSource.readyState === EventSource.CLOSED) {
        logger.error(LogCategory.EDITOR, '[ChatCanvaPane] EventSource closed', {
          noteId,
          url: eventSource.url.replace(/token=[^&]+/, 'token=***'),
          sessionId: session?.id,
          reason: 'connection failed'
        });
        logger.warn(LogCategory.EDITOR, '[ChatCanvaPane] EventSource closed, will recreate', { noteId });
        eventSourceRef.current = null;
      }
    };

    return () => {
      setIsEventSourceConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [session?.noteId, activeCanvaId, isEditorReady]); // ✅ Attendre que l'éditeur soit prêt

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
   */
  const handleEditorRef = useCallback((editor: EditorWithMarkdown | null) => {
    editorRef.current = editor;

    if (!editor) {
      return;
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
  }, []);

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

      {/* Indicateur EventSource (bas à droite) */}
      <div 
        className="canva-eventsource-indicator"
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: isEventSourceConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: isEventSourceConnected ? '#22c55e' : '#ef4444',
          border: `1px solid ${isEventSourceConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
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
          {isEventSourceConnected ? 'Listener actif' : 'Listener inactif'}
        </span>
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
