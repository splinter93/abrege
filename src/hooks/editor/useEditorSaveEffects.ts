/**
 * useEditorSaveEffects - Hook pour la logique de sauvegarde
 * 
 * Responsabilités:
 * - Debouncing save
 * - Auto-save logic
 * - Ctrl/Cmd+S handler
 */

import { useEffect } from 'react';
import type { UseEditorHandlersReturn } from './useEditorHandlers';
import type { EditorState } from './useEditorState';

interface UseEditorSaveEffectsOptions {
  editorState: EditorState;
  content: string;
  handlers: UseEditorHandlersReturn;
}

/**
 * Hook pour gérer la logique de sauvegarde
 */
export function useEditorSaveEffects({
  editorState,
  content,
  handlers
}: UseEditorSaveEffectsOptions): void {
  const title = editorState.document.title;

  // Effect: Ctrl/Cmd+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { 
        e.preventDefault(); 
        handlers.handleSave(title || 'Untitled', content); 
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers, title, content]);
}

