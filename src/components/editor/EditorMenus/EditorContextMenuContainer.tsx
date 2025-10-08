/**
 * Container pour le menu contextuel de l'éditeur
 * Extrait de Editor.tsx pour améliorer la modularité
 */

import React from 'react';
import type { FullEditorInstance } from '@/types/editor';
import type { EditorState } from '@/hooks/editor/useEditorState';
import ContextMenu from '../ContextMenu';
import { logger, LogCategory } from '@/utils/logger';

export interface EditorContextMenuContainerProps {
  /** Instance de l'éditeur Tiptap */
  editor: FullEditorInstance | null;
  
  /** État de l'éditeur */
  editorState: EditorState;
  
  /** Callback pour ouvrir le menu image */
  onOpenImageMenu: () => void;
}

/**
 * Container pour le menu contextuel
 * Gère les événements et les actions du menu contextuel
 * 
 * @example
 * ```tsx
 * <EditorContextMenuContainer
 *   editor={editor}
 *   editorState={editorState}
 *   onOpenImageMenu={() => openImageMenu()}
 * />
 * ```
 */
export const EditorContextMenuContainer: React.FC<EditorContextMenuContainerProps> = ({
  editor,
  editorState,
  onOpenImageMenu,
}) => {
  // Gestion des actions du menu contextuel
  const handleContextMenuAction = React.useCallback((action: string) => {
    if (!editor) return;

    try {
      switch (action) {
        case 'duplicate':
          // Dupliquer le bloc actuel
          const { state } = editor.view;
          const { from, to } = state.selection;
          const selectedContent = state.doc.slice(from, to);
          editor.chain().focus().insertContent(selectedContent.content).run();
          break;

        case 'delete':
          // Supprimer le contenu sélectionné ou le bloc
          if (editorState.contextMenu.hasSelection) {
            editor.chain().focus().deleteSelection().run();
          } else {
            // Supprimer le bloc entier
            const pos = editorState.contextMenu.nodePosition;
            const $pos = editor.state.doc.resolve(pos);
            const start = $pos.before();
            const end = $pos.after();
            editor.chain().focus().deleteRange({ from: start, to: end }).run();
          }
          break;

        case 'turn-into-h1':
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'turn-into-h2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'turn-into-h3':
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'turn-into-bullet-list':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'turn-into-ordered-list':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'turn-into-blockquote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'turn-into-code-block':
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case 'turn-into-image':
          onOpenImageMenu();
          break;
        case 'turn-into-table':
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;
        case 'turn-into-divider':
          editor.chain().focus().setHorizontalRule().run();
          break;
      }
    } catch (error) {
      logger.error(LogCategory.EDITOR, 'Erreur action menu contextuel:', error);
    }

    editorState.closeContextMenu();
  }, [editor, editorState, onOpenImageMenu]);

  return (
    <ContextMenu
      isOpen={editorState.contextMenu.isOpen}
      position={editorState.contextMenu.position}
      onClose={editorState.closeContextMenu}
      onAction={handleContextMenuAction}
      nodeType={editorState.contextMenu.nodeType}
      hasSelection={editorState.contextMenu.hasSelection}
    />
  );
};

export default EditorContextMenuContainer;

