/**
 * useEditorUpdateFunctions - Fonctions de mise à jour DB pour l'éditeur
 * Extrait de useEditorHandlers pour respecter la limite de 300 lignes
 */

import { useCallback } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { useFontManager } from '@/hooks/useFontManager';
import { useWideModeManager } from '@/hooks/useWideModeManager';
import { useNoteUpdate, useHeaderImageUpdate } from '@/hooks/editor/useNoteUpdate';
import { ERROR_MESSAGES } from '@/utils/editorConstants';
import type { EditorState } from './useEditorState';

interface NoteUpdate {
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  [key: string]: unknown;
}

interface UseEditorUpdateFunctionsOptions {
  noteId: string;
  userId: string;
  editorState: EditorState;
  updateNote: (id: string, updates: NoteUpdate) => void;
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

export interface UseEditorUpdateFunctionsReturn {
  updateFontInDb: (value: string) => Promise<void>;
  handleFontChange: (fontName: string, scope?: 'all' | 'headings' | 'body') => Promise<void>;
  handleA4ModeChange: (value: boolean) => Promise<void>;
  handleSlashLangChange: (value: 'fr' | 'en') => Promise<void>;
  handleFullWidthChange: (value: boolean) => Promise<void>;
  updateHeaderOffset: (value: number) => Promise<void>;
  updateHeaderBlur: (value: number) => Promise<void>;
  updateHeaderOverlay: (value: number) => Promise<void>;
  updateTitleInImage: (value: boolean) => Promise<void>;
}

export function useEditorUpdateFunctions(options: UseEditorUpdateFunctionsOptions): UseEditorUpdateFunctionsReturn {
  const {
    noteId,
    userId,
    editorState,
    updateNote,
    note
  } = options;

  // Gestionnaire de police avec changement CSS automatique
  const { changeFont } = useFontManager(note?.font_family || 'Figtree');
  
  // Gestionnaire de mode large avec changement CSS automatique
  const { changeWideMode } = useWideModeManager(editorState.ui.fullWidth);

  // Update functions
  const updateFontInDb = useNoteUpdate({
    noteId,
    userId,
    field: 'font_family',
    currentValue: note?.font_family || 'Figtree',
    errorMessage: ERROR_MESSAGES.SAVE_FONT,
  });

  const updateWideMode = useNoteUpdate({
    noteId,
    userId,
    field: 'wide_mode',
    currentValue: editorState.ui.fullWidth,
    onSuccess: (value) => {
      editorState.setFullWidth(value);
      changeWideMode(value);
    },
    onError: (error, oldValue) => {
      editorState.setFullWidth(oldValue);
      changeWideMode(oldValue);
    },
    errorMessage: ERROR_MESSAGES.SAVE_WIDE_MODE,
  });

  const updateA4Mode = useNoteUpdate({
    noteId,
    userId,
    field: 'a4_mode',
    currentValue: editorState.ui.a4Mode,
    onSuccess: editorState.setA4Mode,
    onError: (error, oldValue) => editorState.setA4Mode(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_A4_MODE,
  });

  const updateSlashLang = useNoteUpdate({
    noteId,
    userId,
    field: 'slash_lang',
    currentValue: editorState.ui.slashLang,
    onSuccess: editorState.setSlashLang,
    onError: (error, oldValue) => editorState.setSlashLang(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_SLASH_LANG,
  });

  const updateHeaderOffset = useHeaderImageUpdate({
    noteId,
    userId,
    field: 'header_image_offset',
    currentValue: editorState.headerImage.offset,
    onSuccess: (value) => {
      editorState.setHeaderImageOffset(value);
      updateNote(noteId, { header_image_offset: value });
    },
    onError: (error, oldValue) => editorState.setHeaderImageOffset(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_HEADER_IMAGE_OFFSET,
  });

  const updateHeaderBlur = useHeaderImageUpdate({
    noteId,
    userId,
    field: 'header_image_blur',
    currentValue: editorState.headerImage.blur,
    onSuccess: (value) => {
      editorState.setHeaderImageBlur(value);
      updateNote(noteId, { header_image_blur: value });
    },
    onError: (error, oldValue) => editorState.setHeaderImageBlur(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_HEADER_IMAGE_BLUR,
  });

  const updateHeaderOverlay = useHeaderImageUpdate({
    noteId,
    userId,
    field: 'header_image_overlay',
    currentValue: editorState.headerImage.overlay,
    onSuccess: (value) => {
      editorState.setHeaderImageOverlay(value);
      updateNote(noteId, { header_image_overlay: value });
    },
    onError: (error, oldValue) => editorState.setHeaderImageOverlay(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_HEADER_IMAGE_OVERLAY,
  });

  const updateTitleInImage = useNoteUpdate({
    noteId,
    userId,
    field: 'header_title_in_image',
    currentValue: editorState.headerImage.titleInImage,
    onSuccess: (value) => {
      editorState.setHeaderTitleInImage(value);
      updateNote(noteId, { header_title_in_image: value });
    },
    onError: (error, oldValue) => editorState.setHeaderTitleInImage(oldValue),
    errorMessage: ERROR_MESSAGES.SAVE_HEADER_TITLE_IN_IMAGE,
  });

  // Handlers qui utilisent les update functions
  const handleFontChange = useCallback(async (fontName: string, scope?: 'all' | 'headings' | 'body') => {
    changeFont(fontName, scope || 'all');
    await updateFontInDb(fontName);
  }, [changeFont, updateFontInDb]);

  const handleA4ModeChange = useCallback(async (value: boolean) => {
    await updateA4Mode(value);
  }, [updateA4Mode]);

  const handleSlashLangChange = useCallback(async (value: 'fr' | 'en') => {
    await updateSlashLang(value);
  }, [updateSlashLang]);

  const handleFullWidthChange = useCallback(async (value: boolean) => {
    await updateWideMode(value);
  }, [updateWideMode]);

  return {
    updateFontInDb,
    handleFontChange,
    handleA4ModeChange,
    handleSlashLangChange,
    handleFullWidthChange,
    updateHeaderOffset,
    updateHeaderBlur,
    updateHeaderOverlay,
    updateTitleInImage,
  };
}

