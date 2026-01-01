/**
 * useEditorInitialization - Hook pour l'initialisation de l'éditeur Tiptap
 * 
 * Responsabilités:
 * - Création de l'instance Tiptap
 * - Gestion du contenu initial
 * - Callbacks onEditorRef, onReady
 */

import { useEditor } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { createEditorExtensions, PRODUCTION_EXTENSIONS_CONFIG } from '@/config/editor-extensions';
import lowlight from '@/utils/lowlightInstance';
import { logger, LogCategory } from '@/utils/logger';

export interface UseEditorInitializationOptions {
  noteId: string;
  isReadonly: boolean;
  onEditorUpdate: ({ editor }: { editor: TiptapEditor }) => void;
  onEditorRef?: (editor: TiptapEditor | null) => void;
  onReady?: () => void;
}

export interface UseEditorInitializationReturn {
  editor: TiptapEditor | null;
  isContentReady: boolean;
  setIsContentReady: (ready: boolean) => void;
}

/**
 * Hook pour initialiser l'éditeur Tiptap
 */
export function useEditorInitialization({
  noteId,
  isReadonly,
  onEditorUpdate,
  onEditorRef,
  onReady
}: UseEditorInitializationOptions): UseEditorInitializationReturn {
  const [isContentReady, setIsContentReady] = useState(false);
  const autoFocusRef = useRef(false);
  const readyNotifiedRef = useRef(false);

  // Reset isContentReady quand noteId change
  useEffect(() => {
    setIsContentReady(false);
    autoFocusRef.current = false;
    readyNotifiedRef.current = false;
  }, [noteId]);

  useEffect(() => {
    if (isContentReady && !readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      onReady?.();
    }
  }, [isContentReady, onReady]);

  // Real Tiptap editor instance
  // FIX React 18: Ne pas passer le contenu initial pour éviter création synchrone des NodeViews
  // Le contenu sera chargé par EditorSyncManager dans queueMicrotask
  const editor = useEditor({
    editable: !isReadonly,
    immediatelyRender: false,
    extensions: createEditorExtensions(PRODUCTION_EXTENSIONS_CONFIG, lowlight),
    content: '', // Vide au départ, EditorSyncManager chargera le contenu
    onUpdate: onEditorUpdate,
  }); // SANS dépendance - EditorSyncManager gère le rechargement si noteId change

  // DEBUG: Log pour vérifier si editor est créé
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.info(LogCategory.EDITOR, '[useEditorInitialization] Editor instance status', {
        noteId,
        hasEditor: !!editor,
        editorReady: editor ? 'ready' : 'not-ready',
        timestamp: Date.now()
      });
    }
  }, [editor, noteId]);

  useEffect(() => {
    onEditorRef?.(editor as TiptapEditor | null);
    return () => {
      onEditorRef?.(null);
    };
  }, [editor, onEditorRef]);

  return {
    editor,
    isContentReady,
    setIsContentReady
  };
}

