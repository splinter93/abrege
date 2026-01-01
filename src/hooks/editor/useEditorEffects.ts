/**
 * useEditorEffects - Hook centralisé pour tous les useEffect de l'éditeur
 * Orchestrateur combinant useEditorSyncEffects et useEditorSaveEffects
 */

import { useEffect } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import type { EditorSlashMenuHandle } from '@/components/EditorSlashMenu';
import { logger, LogCategory } from '@/utils/logger';
import { uploadImageForNote } from '@/utils/fileUpload';
import type { EditorState } from './useEditorState';
import type { UseEditorHandlersReturn } from './useEditorHandlers';
import { useEditorSyncEffects } from './useEditorSyncEffects';
import { useEditorSaveEffects } from './useEditorSaveEffects';

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
  
  // Utiliser les hooks spécialisés
  useEditorSyncEffects({
    editor,
    note,
    noteId,
    content,
    editorState
  });

  useEditorSaveEffects({
    editorState,
    content,
    handlers
  });

  const { 
    setKebabPos,
    openContextMenu
  } = editorState;
  
  const kebabOpen = editorState.menus.kebabOpen;

  // Debug: tracer l'insertion de taskItem (checkbox) pour reproduire le bug
  useEffect(() => {
    if (!editor) return;
    const enableDebug =
      process.env.NEXT_PUBLIC_EDITOR_DEBUG_CHECKBOX === 'true' ||
      process.env.NODE_ENV !== 'production';

    if (!enableDebug) return;

    const countTaskItems = (doc: ProseMirrorNode): number => {
      let count = 0;
      doc.descendants(node => {
        if (node.type.name === 'taskItem') {
          count += 1;
        }
      });
      return count;
    };

    let prevCount = countTaskItems(editor.state.doc);

    const handler = ({ transaction }: { transaction: Transaction }) => {
      if (!transaction.docChanged) return;

      const nextCount = countTaskItems(transaction.doc);
      if (nextCount > prevCount) {
        const sel = transaction.selection;
        const parentType = sel.$from.parent.type.name;
        const parentText = sel.$from.parent.textContent || '';
        const preview = parentText.slice(Math.max(0, parentText.length - 80));

        logger.debug(LogCategory.EDITOR, '[DebugCheckbox] taskItem inserted', {
          prevCount,
          nextCount,
          pos: sel.from,
          parentType,
          preview,
        });
      }

      prevCount = nextCount;
    };

    editor.on('transaction', handler);
    return () => {
      editor.off('transaction', handler);
    };
  }, [editor]);

  // Effect: Position menu kebab (plus besoin de scroll listener car absolute dans header sticky)
  useEffect(() => {
    if (kebabOpen && kebabBtnRef.current) {
      const rect = kebabBtnRef.current.getBoundingClientRect();
      setKebabPos({ 
        top: rect.bottom + 8, // CONTEXT_MENU_CONFIG.kebabMenuOffsetTop
        left: rect.right - 200
      });
    }
  }, [kebabOpen, kebabBtnRef, setKebabPos]);

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

  // Effect: Drag & drop d'images et fichiers
  // ✅ NOTE: Le drop des fichiers depuis la sidebar est maintenant géré par SidebarFileDropExtension
  // Ce handler ne gère que les fichiers locaux (upload)
  useEffect(() => {
    if (!editor || isReadonly) return;
    const el = editor.view.dom as HTMLElement;

    const onDrop = async (e: DragEvent) => {
      try {
        if (!e.dataTransfer) return;
        
        // ✅ 1. Vérifier si c'est un fichier depuis la sidebar (type personnalisé)
        const imageUrl = e.dataTransfer.getData('application/x-scrivia-image-url');
        const fileUrl = e.dataTransfer.getData('application/x-scrivia-file-link');
        const textPlain = e.dataTransfer.getData('text/plain');
        
        if (imageUrl || (fileUrl && textPlain)) {
          e.preventDefault();
          
          // Positionner le curseur à la position du drop
          const view = editor.view;
          const coords = { left: e.clientX, top: e.clientY };
          const posAt = view.posAtCoords(coords);
          
          if (posAt && typeof posAt.pos === 'number') {
            const { TextSelection } = require('prosemirror-state');
            const tr = view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(posAt.pos)));
            view.dispatch(tr);
          }
          
          // Insérer le contenu (image directement ou lien markdown)
          if (imageUrl) {
            // ✅ FIX: Insérer directement l'image, pas le markdown (évite le texte ![filename](url))
            editor.chain().focus().setImage({ src: imageUrl }).run();
            logger.info(LogCategory.EDITOR, '[useEditorEffects] ✅ Image insérée directement:', { imageUrl });
          } else if (fileUrl && textPlain && textPlain.startsWith('[')) {
            // C'est un fichier avec lien markdown
            editor.chain().focus().insertContent(textPlain).run();
            logger.info(LogCategory.EDITOR, '[useEditorEffects] ✅ Lien fichier inséré:', { fileUrl, markdown: textPlain });
          }
          
          return;
        }
        
        // ✅ 3. Vérifier si c'est un fichier local (upload)
        const files = Array.from(e.dataTransfer.files || []);
        if (files.length) {
          const image = files.find(f => /^image\/(jpeg|png|webp|gif)$/.test(f.type));
          if (image) {
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
          }
        }
      } catch {}
    };

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      // Autoriser le drop si c'est un fichier, une URL, ou un type personnalisé
      const hasFile = Array.from(e.dataTransfer.items || []).some(it => it.kind === 'file');
      const hasUrl = e.dataTransfer.types.includes('text/uri-list') || e.dataTransfer.types.includes('text/plain');
      const hasCustomType = e.dataTransfer.types.includes('application/x-scrivia-image-url') || 
                           e.dataTransfer.types.includes('application/x-scrivia-file-link');
      if (hasFile || hasUrl || hasCustomType) e.preventDefault();
    };

    el.addEventListener('drop', onDrop);
    el.addEventListener('dragover', onDragOver);
    return () => {
      el.removeEventListener('drop', onDrop);
      el.removeEventListener('dragover', onDragOver);
    };
  }, [editor, isReadonly, noteId]);
}
