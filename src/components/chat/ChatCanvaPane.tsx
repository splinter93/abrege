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
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useCanvaStore } from '@/store/useCanvaStore';
import { useAuth } from '@/hooks/useAuth';
import { logger, LogCategory } from '@/utils/logger';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { SimpleLoadingState } from '@/components/DossierLoadingStates';
import type { Editor as TiptapEditor } from '@tiptap/react';
import Editor from '@/components/editor/Editor';
import { hashString } from '@/utils/editorHelpers';

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
  const editorRef = useRef<TiptapEditor | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedHashRef = useRef<number | null>(null);

  // Resize handle state
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

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

    const initialMarkdown = editorRef.current.storage.markdown?.getMarkdown?.() || '';
    const initialHash = hashString(normalizeMarkdown(initialMarkdown));
    if (lastSavedHashRef.current === null) {
      lastSavedHashRef.current = initialHash;
    }

    const interval = setInterval(async () => {
      if (!editorRef.current) return;

      try {
        const markdown = editorRef.current.storage.markdown?.getMarkdown?.() || '';
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
          { markdown_content: markdown },
          user.id
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
  // ✅ STREAMING INSERTION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * Insérer le streamBuffer dans TipTap en temps réel
   */
  useEffect(() => {
    if (!session?.streamBuffer || !editorRef.current) return;

    // Insérer le chunk dans TipTap
    editorRef.current.commands.insertContent(session.streamBuffer);
    
    logger.debug(LogCategory.EDITOR, '[ChatCanvaPane] Stream chunk inserted', {
      sessionId: session.id,
      chunkLength: session.streamBuffer.length
    });

    // Reset buffer après insertion
    // (On ne peut pas appeler updateSession directement ici car ça causerait une boucle)
    // Le buffer sera reset au prochain chunk ou à la fin du stream

  }, [session?.streamBuffer]);

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
  const handleEditorRef = useCallback((editor: TiptapEditor | null) => {
    editorRef.current = editor;
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ✅ RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (!session) {
    return null;
  }

  return (
    <section 
      ref={canvaPaneRef}
      className="chat-canva-pane" 
      aria-label="Canva TipTap"
      style={{ flexBasis: `${width}%` }}
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

      <div className="chat-canva-pane__editor">
        {/* ✅ Mémoïsation : Évite re-renders inutiles quand session.title change */}
        <EditorMemo
          sessionId={session.id}
          noteId={session.noteId}
          onClose={handleClose}
          onEditorRef={handleEditorRef}
        />
      </div>
    </section>
  );
};

/**
 * ✅ Editor mémoïsé pour éviter re-renders multiples
 * Key change = re-mount, mais props stables = pas de re-render
 */
const EditorMemo = React.memo(({ sessionId, noteId, onClose, onEditorRef }: {
  sessionId: string;
  noteId: string;
  onClose: () => void;
  onEditorRef: (editor: TiptapEditor | null) => void;
}) => {
  return (
    <Editor
      key={`canva-${sessionId}-${noteId}`}
      noteId={noteId}
      onClose={onClose}
      editorRef={onEditorRef}
    />
  );
});

export default ChatCanvaPane;
