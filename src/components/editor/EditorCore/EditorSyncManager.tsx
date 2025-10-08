/**
 * Composant invisible gérant la synchronisation entre le store et l'éditeur
 * Extrait de Editor.tsx pour améliorer la modularité
 */

import React from 'react';
import type { FullEditorInstance } from '@/types/editor';
import type { EditorState } from '@/hooks/editor/useEditorState';
import { TIMEOUTS } from '@/utils/editorConstants';
import { logger, LogCategory } from '@/utils/logger';

export interface EditorSyncManagerProps {
  /** Instance de l'éditeur Tiptap */
  editor: FullEditorInstance | null;
  
  /** Contenu Markdown depuis le store */
  storeContent: string;
  
  /** État de l'éditeur */
  editorState: EditorState;
}

/**
 * Composant invisible gérant la synchronisation store ↔ éditeur
 * 
 * @description Ce composant encapsule toute la logique de synchronisation
 * bidirectionnelle entre le store Zustand et l'instance Tiptap.
 * Évite les boucles infinies avec le flag isUpdatingFromStore.
 * 
 * @example
 * ```tsx
 * <EditorSyncManager
 *   editor={editor}
 *   storeContent={note?.markdown_content || ''}
 *   editorState={editorState}
 * />
 * ```
 */
export const EditorSyncManager: React.FC<EditorSyncManagerProps> = ({
  editor,
  storeContent,
  editorState,
}) => {
  // 🔧 FIX: Ref pour tracker le premier mount
  const isFirstMountRef = React.useRef(true);
  
  // 🔄 Écouter les changements du store (ex: realtime) et mettre à jour l'éditeur
  React.useEffect(() => {
    if (!editor || editorState.internal.isUpdatingFromStore) return;

    // 🔧 FIX DRAG HANDLES: Skip au premier mount pour laisser l'éditeur s'initialiser
    // Le contenu initial est déjà chargé via useEditor({ content })
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    const editorContent = editor.storage.markdown?.getMarkdown?.() || '';

    // Seulement mettre à jour si le contenu a vraiment changé
    if (storeContent !== editorContent) {
      editorState.setIsUpdatingFromStore(true);
      
      // Sauvegarder la position actuelle du curseur
      const currentPos = editor.state.selection.from;
      
      // Mettre à jour le contenu de l'éditeur
      editor.commands.setContent(storeContent);
      
      // Restaurer la position du curseur si elle est toujours valide
      if (currentPos <= editor.state.doc.content.size) {
        editor.commands.setTextSelection(currentPos);
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(
          LogCategory.EDITOR,
          'Contenu mis à jour depuis le store:',
          storeContent.substring(0, 100) + '...'
        );
      }
      
      // Réinitialiser le flag après un court délai
      setTimeout(() => {
        editorState.setIsUpdatingFromStore(false);
      }, TIMEOUTS.STORE_UPDATE_FLAG);
    }
  }, [editor, storeContent, editorState]);

  // Ce composant ne rend rien
  return null;
};

export default EditorSyncManager;

