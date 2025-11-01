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
  
  // Effect: Forcer la mise à jour de la TOC quand la note arrive
  useEffect(() => {
    if (note && content && !editorState.document.noteLoaded) {
      editorState.setNoteLoaded(true);
      editorState.updateTOC();
    }
  }, [note, content, noteId, editorState.document.noteLoaded, editorState]);

  // Effect: Synchroniser le titre avec la note
  useEffect(() => { 
    editorState.setTitle(note?.source_title || ''); 
  }, [note?.source_title, editorState]);

  // Effect: Position menu kebab
  useEffect(() => {
    if (editorState.menus.kebabOpen && kebabBtnRef.current) {
      const rect = kebabBtnRef.current.getBoundingClientRect();
      editorState.setKebabPos({ 
        top: rect.bottom + CONTEXT_MENU_CONFIG.kebabMenuOffsetTop, 
        left: rect.right
      });
    }
  }, [editorState.menus.kebabOpen, editorState, kebabBtnRef]);

  // Effect: Sync header image
  useEffect(() => {
    if (note?.header_image) editorState.setHeaderImageUrl(note.header_image);
  }, [note?.header_image, editorState]);

  // Effect: Hydrate appearance fields from note
  useEffect(() => {
    if (typeof note?.header_image_offset === 'number') editorState.setHeaderImageOffset(note.header_image_offset);
  }, [note?.header_image_offset, editorState]);
  
  useEffect(() => {
    if (typeof note?.header_image_blur === 'number') editorState.setHeaderImageBlur(note.header_image_blur);
  }, [note?.header_image_blur, editorState]);
  
  useEffect(() => {
    if (typeof note?.header_image_overlay === 'number') editorState.setHeaderImageOverlay(note.header_image_overlay);
  }, [note?.header_image_overlay, editorState]);
  
  useEffect(() => {
    if (typeof note?.header_title_in_image === 'boolean') editorState.setHeaderTitleInImage(note.header_title_in_image);
  }, [note?.header_title_in_image, editorState]);

  // Effect: Initialisation du wide mode depuis la note
  useEffect(() => {
    if (typeof note?.wide_mode === 'boolean' && !editorState.ui.fullWidth) {
      editorState.setFullWidth(note.wide_mode);
    }
  }, [note?.wide_mode, editorState.ui.fullWidth, editorState]);

  // Effect: Gestion du menu contextuel
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleContextMenu = (event: CustomEvent) => {
      if (isReadonly) return;
      
      const { coords, nodeType, hasSelection, position } = event.detail;
      editorState.openContextMenu(coords, nodeType, hasSelection, position);
    };

    document.addEventListener('tiptap-context-menu', handleContextMenu as EventListener);
    return () => document.removeEventListener('tiptap-context-menu', handleContextMenu as EventListener);
  }, [isReadonly, editorState]);

  // Effect: Mettre à jour la TOC quand l'éditeur change
  useEffect(() => {
    if (!editor) return;
    
    const debouncedUpdateTOC = debounce(editorState.updateTOC, DEBOUNCE_DELAYS.TOC_UPDATE);
    editor.on('update', debouncedUpdateTOC);
    
    return () => {
      editor.off('update', debouncedUpdateTOC);
    };
  }, [editor, editorState]);

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
        handlers.handleSave(editorState.document.title || 'Untitled', content); 
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers, editorState.document.title, content]);

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

