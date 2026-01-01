/**
 * useEditorData - Hook pour récupérer et préparer les données de l'éditeur
 * 
 * Responsabilités:
 * - Récupération de la note depuis le store
 * - Préprocessing du markdown
 * - Génération du HTML
 */

import { useMemo, useEffect } from 'react';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import { preprocessMarkdown } from '@/utils/markdownPreprocessor';
import { logger, LogCategory } from '@/utils/logger';

export interface UseEditorDataOptions {
  noteId: string;
}

export interface UseEditorDataReturn {
  note: FileSystemState['notes'][string] | null;
  rawContent: string;
  content: string;
  html: string;
  updateNote: (id: string, updates: Record<string, unknown>) => void;
}

/**
 * Hook pour récupérer et préparer les données de l'éditeur
 */
export function useEditorData({ noteId }: UseEditorDataOptions): UseEditorDataReturn {
  const selectNote = useMemo(() => (s: FileSystemState) => s.notes[noteId], [noteId]);
  const note = useFileSystemStore(selectNote);
  const updateNote = useFileSystemStore(s => s.updateNote);
  
  // PRÉTRAITER le Markdown pour échapper les ~ dans les tables (fix LLM)
  const rawContent = note?.markdown_content || '';
  
  // Debug: Log pour diagnostiquer le contenu
  useEffect(() => {
    if (noteId && process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '[useEditorData] Note du store', {
        noteId,
        noteExists: !!note,
        noteIdFromNote: note?.id,
        hasContent: !!note?.markdown_content,
        contentLength: note?.markdown_content?.length || 0,
        rawContentLength: rawContent?.length || 0,
        matches: note?.id === noteId,
        context: { operation: 'noteLoad' }
      });
    }
  }, [noteId, note, rawContent]);
  
  const content = useMemo(() => preprocessMarkdown(rawContent), [rawContent]);
  const { html } = useMarkdownRender({ content });

  return {
    note,
    rawContent,
    content,
    html,
    updateNote
  };
}

