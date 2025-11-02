/**
 * Composant invisible gérant la synchronisation entre le store et l'éditeur
 * Extrait de Editor.tsx pour améliorer la modularité
 */

import React from 'react';
import type { FullEditorInstance } from '@/types/editor';
import type { EditorState } from '@/hooks/editor/useEditorState';
import { TIMEOUTS } from '@/utils/editorConstants';
import { logger, LogCategory } from '@/utils/logger';
import { hashString, getEditorMarkdown } from '@/utils/editorHelpers';

export interface EditorSyncManagerProps {
  /** Instance de l'éditeur Tiptap */
  editor: FullEditorInstance | null;
  
  /** Contenu Markdown depuis le store */
  storeContent: string;
  
  /** État de l'éditeur */
  editorState: EditorState;
}

/**
 * Normalise le contenu Markdown pour la comparaison
 * Élimine les différences non-significatives (espaces, newlines)
 */
function normalizeMarkdown(content: string): string {
  return content
    .trim()
    .replace(/\r\n/g, '\n') // Normaliser les retours de ligne Windows
    .replace(/\n{3,}/g, '\n\n'); // Normaliser les sauts de ligne multiples
}

/**
 * Composant invisible gérant la synchronisation store ↔ éditeur
 * 
 * @description Ce composant encapsule toute la logique de synchronisation
 * bidirectionnelle entre le store Zustand et l'instance Tiptap.
 * Évite les boucles infinies avec un système de hash intelligent.
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
  // 🔧 FIX: Ref pour tracker le chargement initial
  const hasLoadedInitialContentRef = React.useRef(false);
  const lastStoreSyncRef = React.useRef<string>('');
  
  // 🔄 Charger le contenu initial UNE SEULE FOIS
  React.useEffect(() => {
    if (!editor || !storeContent || hasLoadedInitialContentRef.current) return;
    
    // Charger le contenu initial
    if (process.env.NODE_ENV === 'development') {
      logger.debug(LogCategory.EDITOR, '📥 Chargement initial du contenu depuis le store');
    }
    editorState.setIsUpdatingFromStore(true);
    editor.commands.setContent(storeContent);
    hasLoadedInitialContentRef.current = true;
    lastStoreSyncRef.current = normalizeMarkdown(storeContent);
    
    setTimeout(() => {
      editorState.setIsUpdatingFromStore(false);
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, '✅ Contenu initial chargé');
      }
    }, 100);
  }, [editor, storeContent, editorState]);

  // ⚠️ DÉSACTIVÉ : Sync realtime causait bugs (effacement caractères, retours auto)
  // En mode édition, pas de sync du store → éditeur
  // Le realtime fonctionne uniquement en readonly
  /*
  React.useEffect(() => {
    if (!editor || !hasLoadedInitialContentRef.current || editorState.internal.isUpdatingFromStore) return;
    
    const normalizedStoreContent = normalizeMarkdown(storeContent);
    const currentEditorContent = normalizeMarkdown(getEditorMarkdown(editor));
    
    // Si le store a changé ET est différent de l'éditeur
    if (normalizedStoreContent !== lastStoreSyncRef.current && 
        normalizedStoreContent !== currentEditorContent) {
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug(LogCategory.EDITOR, '🔄 Mise à jour realtime détectée, sync store → éditeur');
      }
      
      editorState.setIsUpdatingFromStore(true);
      editor.commands.setContent(storeContent);
      lastStoreSyncRef.current = normalizedStoreContent;
      
      setTimeout(() => {
        editorState.setIsUpdatingFromStore(false);
      }, 100);
    }
  }, [storeContent, editor, editorState]);
  */

  // Ce composant ne rend rien
  return null;
};

export default EditorSyncManager;

