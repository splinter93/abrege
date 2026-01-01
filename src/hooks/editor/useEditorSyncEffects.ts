/**
 * useEditorSyncEffects - Hook pour la synchronisation avec le store
 * 
 * Responsabilités:
 * - Sync avec store (note loaded, title, header image, appearance fields)
 * - Lifecycle management
 */

import { useEffect, useMemo, useRef } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { logger, LogCategory } from '@/utils/logger';
import { debounce } from '@/utils/editorHelpers';
import { DEBOUNCE_DELAYS } from '@/utils/editorConstants';
import type { EditorState } from './useEditorState';

interface UseEditorSyncEffectsOptions {
  editor: TiptapEditor | null;
  note: {
    source_title?: string;
    header_image?: string | null;
    header_image_offset?: number;
    header_image_blur?: number;
    header_image_overlay?: number;
    header_title_in_image?: boolean;
    wide_mode?: boolean;
  } | null;
  noteId: string;
  content: string;
  editorState: EditorState;
}

/**
 * Hook pour gérer la synchronisation avec le store
 */
export function useEditorSyncEffects({
  editor,
  note,
  noteId,
  content,
  editorState
}: UseEditorSyncEffectsOptions): void {
  const { 
    setNoteLoaded, 
    updateTOC, 
    setTitle, 
    setHeaderImageUrl,
    setHeaderImageOffset,
    setHeaderImageBlur,
    setHeaderImageOverlay,
    setHeaderTitleInImage,
    setFullWidth
  } = editorState;
  
  const noteLoaded = editorState.document.noteLoaded;
  const fullWidth = editorState.ui.fullWidth;
  const title = editorState.document.title;

  const logHeaderSync = useMemo(() => {
    return (stage: string, details: Record<string, unknown>) => {
      if (process.env.NODE_ENV !== 'development') {
        return;
      }
      logger.debug(LogCategory.EDITOR, `[useEditorSyncEffects][header_image] ${stage}`, details);
    };
  }, []);

  // Effect: Forcer la mise à jour de la TOC quand la note arrive
  useEffect(() => {
    if (note && content && !noteLoaded) {
      setNoteLoaded(true);
      updateTOC();
    }
  }, [note, content, noteId, noteLoaded, setNoteLoaded, updateTOC]);

  // Effect: Synchroniser le titre avec la note
  useEffect(() => { 
    setTitle(note?.source_title || ''); 
  }, [note?.source_title, setTitle]);

  // Effect: Sync header image
  // FIX FLICKER: Utiliser une ref pour tracker la dernière valeur valide
  const lastValidHeaderImageRef = useRef<string | null | undefined>(
    editorState.headerImage.url ?? undefined
  );
  
  useEffect(() => {
    if (!note) {
      logHeaderSync('skip (note missing)', {});
      return;
    }

    const nextHeaderImage = note?.header_image;

    // FIX FLICKER: Si undefined et qu'on avait une valeur valide, ne pas synchroniser
    if (nextHeaderImage === undefined) {
      if (lastValidHeaderImageRef.current !== undefined) {
        logHeaderSync('skip (header_image undefined, preserve last valid)', {
          noteId,
          current: editorState.headerImage.url,
          lastValid: lastValidHeaderImageRef.current
        });
        return;
      }
      logHeaderSync('skip (header_image undefined, no previous value)', {
        noteId,
        current: editorState.headerImage.url
      });
      return;
    }

    // Mettre à jour la ref avec la nouvelle valeur valide
    lastValidHeaderImageRef.current = nextHeaderImage;

    if (nextHeaderImage === null) {
      if (editorState.headerImage.url !== null) {
        logHeaderSync('apply null', {
          noteId,
          previous: editorState.headerImage.url
        });
        setHeaderImageUrl(null);
      } else {
        logHeaderSync('noop null', { noteId });
      }
      return;
    }

    if (editorState.headerImage.url !== nextHeaderImage) {
      logHeaderSync('apply new value', {
        noteId,
        previous: editorState.headerImage.url,
        next: nextHeaderImage?.slice?.(0, 120)
      });
      setHeaderImageUrl(nextHeaderImage);
      return;
    }

    logHeaderSync('noop identical', { noteId });
  }, [note, editorState.headerImage.url, setHeaderImageUrl, logHeaderSync, noteId]);

  // Effect: Hydrate appearance fields from note
  useEffect(() => {
    if (typeof note?.header_image_offset === 'number') setHeaderImageOffset(note.header_image_offset);
  }, [note?.header_image_offset, setHeaderImageOffset]);
  
  useEffect(() => {
    if (typeof note?.header_image_blur === 'number') setHeaderImageBlur(note.header_image_blur);
  }, [note?.header_image_blur, setHeaderImageBlur]);
  
  useEffect(() => {
    if (typeof note?.header_image_overlay === 'number') setHeaderImageOverlay(note.header_image_overlay);
  }, [note?.header_image_overlay, setHeaderImageOverlay]);
  
  useEffect(() => {
    if (typeof note?.header_title_in_image === 'boolean') setHeaderTitleInImage(note.header_title_in_image);
  }, [note?.header_title_in_image, setHeaderTitleInImage]);

  // Effect: Initialisation du wide mode depuis la note
  useEffect(() => {
    if (typeof note?.wide_mode === 'boolean' && !fullWidth) {
      setFullWidth(note.wide_mode);
    }
  }, [note?.wide_mode, fullWidth, setFullWidth]);

  // Effect: Mettre à jour la TOC quand l'éditeur change
  useEffect(() => {
    if (!editor) return;
    
    const debouncedUpdateTOC = debounce(updateTOC, DEBOUNCE_DELAYS.TOC_UPDATE);
    editor.on('update', debouncedUpdateTOC);
    
    return () => {
      editor.off('update', debouncedUpdateTOC);
    };
  }, [editor, updateTOC]);
}

