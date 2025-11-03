/**
 * useEditorHandlers - Hook centralisé pour tous les handlers de l'éditeur
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import { useCallback } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';
import { logger, LogCategory } from '@/utils/logger';
import { getEditorMarkdown } from '@/utils/editorHelpers';
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
      await v2UnifiedApi.updateNote(noteId, {
        source_title: newTitle ?? editorState.document.title ?? 'Untitled',
        markdown_content,
        html_content,
      }, userId);
    }
  });

  // Handler: Changement d'image d'en-tête
  const handleHeaderChange = useCallback(async (url: string | null) => {
    const normalize = (u: string | null): string | null => {
      if (!u) return null;
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
    editorState.setHeaderImageUrl(normalized);
    try {
      updateNote(noteId, { header_image: normalized || undefined });
      await v2UnifiedApi.updateNote(noteId, { header_image: normalized }, userId);
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Error updating header image');
    }
  }, [noteId, updateNote, userId, editorState]);

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
    
    try {
      const nextMarkdown = getEditorMarkdown(e);
      
      if (nextMarkdown !== rawContent) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug(LogCategory.EDITOR, 'Sauvegarde (utilisateur a tapé)');
        }
        updateNote(noteId, { markdown_content: nextMarkdown });
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur lors de la mise à jour du contenu:', error);
    }
  }, [rawContent, noteId, updateNote, editorState.internal.isUpdatingFromStore]);

  // Handler: Insertion slash command  
  const handleSlashCommandInsert = useCallback((cmd: SlashCommand) => {
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
    
    // Execute command action
    logger.debug(LogCategory.EDITOR, 'Exécution slash command', { cmdId: cmd.id });
    if (typeof cmd.action === 'function') {
      try {
        cmd.action(editor); // ✅ Type safe (SlashCommand.action accepte TiptapEditor)
        logger.debug(LogCategory.EDITOR, 'Slash command réussie', { cmdId: cmd.id });
      } catch (error) {
        logger.error(LogCategory.EDITOR, 'Erreur exécution commande:', error);
      }
    }
  }, [editor]);

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

