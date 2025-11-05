/**
 * useEditorEffects - Hook centralisé pour tous les useEffect de l'éditeur
 * Extrait de Editor.tsx pour respecter la limite de 300 lignes
 */

import { useEffect } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import { logger, LogCategory } from '@/utils/logger';
import { debounce, getEditorMarkdown } from '@/utils/editorHelpers';
import { DEBOUNCE_DELAYS, CONTEXT_MENU_CONFIG } from '@/utils/editorConstants';
import { uploadImageForNote } from '@/utils/fileUpload';
import type { EditorState } from './useEditorState';
import type { UseEditorHandlersReturn } from './useEditorHandlers';

interface UseEditorEffectsOptions {
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
  isReadonly: boolean;
  editorState: EditorState;
  kebabBtnRef: React.RefObject<HTMLButtonElement>;
  slashMenuRef: React.RefObject<EditorSlashMenuHandle | null>;
  handlers: UseEditorHandlersReturn;
}

/**
 * Hook centralisé pour tous les side effects de l'éditeur
 */
export function useEditorEffects({
  editor,
  note,
  noteId,
  content,
  isReadonly,
  editorState,
  kebabBtnRef,
  slashMenuRef,
  handlers
}: UseEditorEffectsOptions): void {
  
  // ✅ EXTRACTION: Extraire les fonctions pour éviter les dépendances circulaires
  const { 
    setNoteLoaded, 
    updateTOC, 
    setTitle, 
    setKebabPos,
    setHeaderImageUrl,
    setHeaderImageOffset,
    setHeaderImageBlur,
    setHeaderImageOverlay,
    setHeaderTitleInImage,
    setFullWidth,
    openContextMenu
  } = editorState;
  
  const noteLoaded = editorState.document.noteLoaded;
  const kebabOpen = editorState.menus.kebabOpen;
  const fullWidth = editorState.ui.fullWidth;
  const title = editorState.document.title;
  
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

  // Effect: Position menu kebab (plus besoin de scroll listener car absolute dans header sticky)
  useEffect(() => {
    if (kebabOpen && kebabBtnRef.current) {
      const rect = kebabBtnRef.current.getBoundingClientRect();
      setKebabPos({ 
        top: rect.bottom + CONTEXT_MENU_CONFIG.kebabMenuOffsetTop, 
        left: rect.right - 200
      });
    }
  }, [kebabOpen, kebabBtnRef, setKebabPos]);

  // Effect: Sync header image
  useEffect(() => {
    if (note?.header_image) setHeaderImageUrl(note.header_image);
  }, [note?.header_image, setHeaderImageUrl]);

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

  // Effect: Gestion du menu contextuel
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleContextMenu = (event: CustomEvent) => {
      if (isReadonly) return;
      
      const { coords, nodeType, hasSelection, position } = event.detail;
      openContextMenu(coords, nodeType, hasSelection, position);
    };

    document.addEventListener('tiptap-context-menu', handleContextMenu as EventListener);
    return () => document.removeEventListener('tiptap-context-menu', handleContextMenu as EventListener);
  }, [isReadonly, openContextMenu]);

  // Effect: Mettre à jour la TOC quand l'éditeur change
  useEffect(() => {
    if (!editor) return;
    
    const debouncedUpdateTOC = debounce(updateTOC, DEBOUNCE_DELAYS.TOC_UPDATE);
    editor.on('update', debouncedUpdateTOC);
    
    return () => {
      editor.off('update', debouncedUpdateTOC);
    };
  }, [editor, updateTOC]);

  // Effect: Slash menu
  useEffect(() => {
    if (!editor || isReadonly) return;
    const el = editor.view.dom as HTMLElement;
    
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        if (slashMenuRef.current) {
          slashMenuRef.current.closeMenu();
        }
        return;
      }
      
      if (e.key === '/') {
        setTimeout(() => {
          if (!editor) return;
          try {
            const coords = editor.view.coordsAtPos(editor.state.selection.from);
            slashMenuRef.current?.openMenu({ left: coords.left, top: coords.top });
          } catch (err) {
            logger.error(LogCategory.EDITOR, 'Erreur ouverture slash menu:', err);
          }
        }, 10);
      }
    };
    
    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [editor, isReadonly, slashMenuRef]);

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

  // Effect: Drag & drop d'images
  useEffect(() => {
    if (!editor || isReadonly) return;
    const el = editor.view.dom as HTMLElement;

    const onDrop = async (e: DragEvent) => {
      try {
        if (!e.dataTransfer) return;
        const files = Array.from(e.dataTransfer.files || []);
        if (!files.length) return;
        const image = files.find(f => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
        if (!image) return;
        e.preventDefault();
        const { publicUrl } = await uploadImageForNote(image, noteId);
        
        const view = editor.view;
        const coords = { left: e.clientX, top: e.clientY };
        const posAt = view.posAtCoords(coords);
        if (posAt && typeof posAt.pos === 'number') {
          const { state } = view;
          const $pos = state.doc.resolve(posAt.pos);
          const nodeHere = ($pos.nodeAfter && $pos.nodeAfter.type.name === 'image')
            ? $pos.nodeAfter
            : ($pos.nodeBefore && $pos.nodeBefore.type.name === 'image')
              ? $pos.nodeBefore
              : null;
          if (nodeHere) {
            const { NodeSelection } = require('prosemirror-state');
            const imagePos = $pos.nodeAfter && $pos.nodeAfter.type.name === 'image' ? posAt.pos : (posAt.pos - (nodeHere?.nodeSize || 1));
            const tr = state.tr.setSelection(NodeSelection.create(state.doc, imagePos));
            view.dispatch(tr);
            editor.commands.updateAttributes('image', { src: publicUrl });
            return;
          }
          const { TextSelection } = require('prosemirror-state');
          const tr = state.tr.setSelection(TextSelection.near(state.doc.resolve(posAt.pos)));
          view.dispatch(tr);
        }
        editor.chain().focus().setImage({ src: publicUrl }).run();
      } catch {}
    };

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const hasImage = Array.from(e.dataTransfer.items || []).some(it => it.kind === 'file');
      if (hasImage) e.preventDefault();
    };

    el.addEventListener('drop', onDrop);
    el.addEventListener('dragover', onDragOver);
    return () => {
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('dragover', onDragOver);
    };
  }, [editor, isReadonly, noteId]);
}

