/**
 * useEditorHandlers - Hook centralisé pour tous les handlers de l'éditeur
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import { useCallback, useMemo } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { logger, LogCategory } from '@/utils/logger';
import { getEditorMarkdown, isTemporaryCanvaNote } from '@/utils/editorHelpers';
import useEditorSave from '@/hooks/useEditorSave';
import type { EditorState } from './useEditorState';
import type { SlashCommand } from '@/types/editor';
import { useEditorUpdateFunctions, type UseEditorUpdateFunctionsReturn } from './useEditorUpdateFunctions';

interface NoteUpdate {
  a4_mode?: boolean;
  slash_lang?: 'fr' | 'en';
  wide_mode?: boolean;
  font_family?: string;
  markdown_content?: string;
  header_image?: string | undefined; // Pas de null explicite, utiliser undefined pour supprimer
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  [key: string]: unknown;
}

interface UseEditorHandlersOptions {
  noteId: string;
  userId: string;
  isReadonly: boolean;
  editor: TiptapEditor | null;
  editorState: EditorState;
  updateNote: (id: string, updates: NoteUpdate) => void;
  content: string;
  rawContent: string;
  note: {
    font_family?: string | null;
    wide_mode?: boolean;
    a4_mode?: boolean;
    slash_lang?: 'fr' | 'en';
    header_image_offset?: number;
    header_image_blur?: number;
    header_image_overlay?: number;
    header_title_in_image?: boolean;
  } | null;
}

export interface UseEditorHandlersReturn extends UseEditorUpdateFunctionsReturn {
  handleHeaderChange: (url: string | null) => Promise<void>;
  handlePreviewClick: () => void;
  handleTitleBlur: () => void;
  handleTranscriptionComplete: (text: string) => void;
  handleEditorUpdate: ({ editor }: { editor: TiptapEditor }) => void;
  handleSave: (title: string, content: string) => Promise<void>;
  handleSlashCommandInsert: (cmd: SlashCommand) => void;
  handleImageInsert: (src: string, target: 'header' | 'content') => void;
}

/**
 * Hook centralisé pour tous les event handlers de l'éditeur
 */
export function useEditorHandlers(options: UseEditorHandlersOptions): UseEditorHandlersReturn {
  const {
    noteId,
    userId,
    isReadonly,
    editor,
    editorState,
    updateNote,
    content,
    rawContent,
    note
  } = options;
  const isTemporaryNote = isTemporaryCanvaNote(noteId);
  
  // ✅ REFACTO: Déléguer les update functions à un hook dédié
  const updateFunctions = useEditorUpdateFunctions({
    noteId,
    userId,
    editorState,
    updateNote,
    note
  });

  // Save hook
  const { handleSave } = useEditorSave({
    editor: editor ? {
      getHTML: () => editor.getHTML(),
      storage: { 
        markdown: { 
          getMarkdown: () => getEditorMarkdown(editor)
        } 
      }
    } : undefined,
    onSave: async ({ title: newTitle, markdown_content, html_content }) => {
      const resolvedTitle = newTitle ?? editorState.document.title ?? 'Untitled';
      updateNote(noteId, {
        source_title: resolvedTitle,
        markdown_content,
        html_content,
      });

      if (isTemporaryNote) {
        return;
      }

      await v2UnifiedApi.updateNote(noteId, {
        source_title: resolvedTitle,
        markdown_content,
        html_content,
      });
    }
  });

  // Handler: Changement d'image d'en-tête
  const handleHeaderChange = useCallback(async (url: string | null) => {
    const normalize = (u: string | null): string | null => {
      if (!u) return null;
      if (u.startsWith('data:')) {
        return u;
      }
      try {
        if (u.startsWith('/')) {
          const abs = new URL(u, window.location.origin).toString();
          return abs;
        }
        new URL(u);
        return u;
      } catch {
        return u;
      }
    };
    const normalized = normalize(url);
    
    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, `[handleHeaderChange] noteId=${noteId}, isTemp=${isTemporaryNote}, urlLength=${normalized?.length || 0}`);
    }
    
    editorState.setHeaderImageUrl(normalized);
    updateNote(noteId, { header_image: normalized || undefined });

    if (isTemporaryNote) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, `[handleHeaderChange] Temporary note, skipping API call`);
      }
      return;
    }

    try {
      await v2UnifiedApi.updateNote(noteId, { header_image: normalized });
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Error updating header image');
    }
  }, [noteId, updateNote, userId, editorState, isTemporaryNote]);

  // Handler: Toggle preview
  const handlePreviewClick = useCallback(() => {
    editorState.togglePreviewMode();
  }, [editorState]);

  // Handler: Blur du titre (sauvegarde)
  const handleTitleBlur = useCallback(() => {
    handleSave(editorState.document.title || 'Untitled', content);
  }, [handleSave, editorState.document.title, content]);

  // Handler: Transcription audio complétée
  const handleTranscriptionComplete = useCallback((text: string) => {
    if (!editor) return;
    
    try {
      const { state, dispatch } = editor.view;
      const from = state.selection.from;
      const insertText = from > 0 && state.doc.textBetween(from - 1, from) !== ' ' ? ` ${text}` : text;
      
      dispatch(state.tr.insertText(insertText, from));
      editor.commands.focus();
      editor.commands.setTextSelection(from + insertText.length);
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, `Texte transcrit inséré: "${text}"`);
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur lors de l\'insertion du texte transcrit:', error);
    }
  }, [editor]);

  // Handler: Mise à jour de l'éditeur
  const handleEditorUpdate = useCallback(({ editor: e }: { editor: TiptapEditor }) => {
    if (!e || editorState.internal.isUpdatingFromStore) return;
    
    // Protection : Ne sauvegarder QUE si l'utilisateur a le focus
    if (!e.isFocused) {
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, 'Éditeur sans focus, skip update (évite boucle au chargement)');
      }
      return;
    }
    
    const normalize = (value: string) =>
      value.replace(/\r\n/g, '\n').replace(/\s+$/g, '').replace(/^\s+/g, '');

    // ✅ FIX: Déclarer les variables avant le try pour qu'elles soient accessibles dans le catch
    let nextMarkdown: string | null = null;
    let sanitizedNext: string = '';
    let sanitizedRaw: string = '';

    try {
      // ✅ FIX: Vérifier que l'éditeur est dans un état valide avant d'extraire le markdown
      if (!e || e.isDestroyed) {
        logger.warn(LogCategory.EDITOR, 'Éditeur invalide ou détruit, skip update');
        return;
      }

      nextMarkdown = getEditorMarkdown(e);
      sanitizedNext = normalize(nextMarkdown || '');
      sanitizedRaw = normalize(rawContent || '');

      if (!sanitizedNext && !sanitizedRaw) {
        return;
      }

      if (sanitizedNext === sanitizedRaw) {
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, 'Sauvegarde (utilisateur a tapé)');
      }

      updateNote(noteId, { markdown_content: sanitizedNext || '' });
    } catch (error) {
      // ✅ FIX: Logger l'erreur avec plus de détails pour diagnostiquer
      logger.error(LogCategory.EDITOR, 'Erreur lors de la mise à jour du contenu:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        noteId,
        hasNextMarkdown: !!nextMarkdown,
        nextMarkdownLength: nextMarkdown?.length || 0,
        sanitizedNextLength: sanitizedNext?.length || 0,
        sanitizedRawLength: sanitizedRaw?.length || 0
      });
    }
  }, [rawContent, noteId, updateNote, editorState.internal.isUpdatingFromStore]);

  // Handler: Insertion slash command  
  const fallbackMarkdownByCommand: Record<string, string> = useMemo(() => ({
    h1: '# ',
    heading1: '# ',
    h2: '## ',
    heading2: '## ',
    h3: '### ',
    heading3: '### ',
    text: '',
    paragraph: '',
    ul: '- ',
    bulletList: '- ',
    ol: '1. ',
    orderedList: '1. ',
    quote: '> ',
    code: '```\n\n```',
    divider: '---\n',
    separator: '---\n'
  }), []);

  const handleSlashCommandInsert = useCallback((cmd: SlashCommand) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[handleSlashCommandInsert] called with cmd:', cmd.id, 'editor:', !!editor, 'isTemp:', isTemporaryNote);
    }
    
    if (!editor) {
      logger.error(LogCategory.EDITOR, 'Editor non disponible pour slash command');
      return;
    }
    
    // Vérifier que l'action existe
    if (!cmd.action) {
      logger.error(LogCategory.EDITOR, 'Action non définie pour la commande:', cmd.id);
      return;
    }
    
    try {
      // Remove any preceding slash token if present
      const { state, dispatch } = editor.view;
      const from = state.selection.from;
      const $pos = state.doc.resolve(from);
      const start = $pos.start();
      const textBefore = $pos.parent.textBetween(0, $pos.parentOffset, undefined, '\uFFFC');
      const match = textBefore.match(/\/?[\w-]*$/);
      if (match) {
        const deleteFrom = start + $pos.parentOffset - match[0].length;
        dispatch(state.tr.delete(deleteFrom, from));
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur suppression slash:', error);
    }
    
    let executed = false;
    if (typeof cmd.action === 'function') {
      try {
        const result = cmd.action(editor);
        executed = typeof result === 'boolean' ? result : true;
        if (process.env.NODE_ENV === 'development') {
          console.log('[handleSlashCommandInsert] action executed:', cmd.id, 'result:', executed);
        }
        logger.debug(LogCategory.EDITOR, 'Slash command exécutée', { cmdId: cmd.id, executed });
      } catch (error) {
        logger.error(LogCategory.EDITOR, 'Erreur exécution commande:', error);
        if (process.env.NODE_ENV === 'development') {
          console.error('[handleSlashCommandInsert] error:', error);
        }
      }
    }

    if (!executed) {
      const fallback = fallbackMarkdownByCommand[cmd.id];
      if (process.env.NODE_ENV === 'development') {
        console.log('[handleSlashCommandInsert] using fallback for:', cmd.id, 'fallback:', fallback);
      }
      if (fallback !== undefined) {
        editor.chain().focus().insertContent(fallback).run();
      }
    }
  }, [editor, isTemporaryNote]);

  // Handler: Insertion d'image (header ou content)
  const handleImageInsert = useCallback((src: string, target: 'header' | 'content') => {
    if (target === 'header') {
      return handleHeaderChange(src);
    }
    if (editor) {
      try { 
        editor.chain().focus().setImage({ src }).run(); 
      } catch (error) {
        logger.error(LogCategory.EDITOR, 'Erreur insertion image:', error);
      }
    }
  }, [editor, handleHeaderChange]);

  return {
    ...updateFunctions, // Spread des fonctions d'update
    handleHeaderChange,
    handlePreviewClick,
    handleTitleBlur,
    handleTranscriptionComplete,
    handleEditorUpdate,
    handleSave,
    handleSlashCommandInsert,
    handleImageInsert,
  } as UseEditorHandlersReturn;
}

