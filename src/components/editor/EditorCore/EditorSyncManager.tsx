/**
 * Composant invisible gérant la synchronisation entre le store et l'éditeur
 * Extrait de Editor.tsx pour améliorer la modularité
 */

import React from 'react';
import type { FullEditorInstance } from '@/types/editor';
import type { EditorState } from '@/hooks/editor/useEditorState';
import { TIMEOUTS } from '@/utils/editorConstants';
import { simpleLogger as logger } from '@/utils/logger';
import { hashString, getEditorMarkdown } from '@/utils/editorHelpers';
import { preprocessEmbeds } from '@/utils/preprocessEmbeds';

export interface EditorSyncManagerProps {
  /** Instance de l'éditeur Tiptap */
  editor: FullEditorInstance | null;
  
  /** Contenu Markdown depuis le store */
  storeContent: string;
  
  /** État de l'éditeur */
  editorState: EditorState;
  
  /** ID de la note (pour détecter changement de note) */
  noteId: string;
  
  /** Callback quand le contenu initial est chargé */
  onInitialContentLoaded?: () => void;
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
 *   noteId={noteId}
 * />
 * ```
 */
export const EditorSyncManager: React.FC<EditorSyncManagerProps> = ({
  editor,
  storeContent,
  editorState,
  noteId,
  onInitialContentLoaded,
}) => {
  // 🔧 FIX: Ref pour tracker le chargement initial - TOUJOURS démarrer à false
  const hasLoadedInitialContentRef = React.useRef(false);
  const lastStoreSyncRef = React.useRef<string>('');
  const lastNoteIdRef = React.useRef<string>('');
  
  // ✅ CRITIQUE: Reset au premier mount si noteId change
  if (lastNoteIdRef.current !== noteId) {
    hasLoadedInitialContentRef.current = false;
    lastNoteIdRef.current = noteId;
  }
  
  // 🔄 Charger le contenu initial (ou le recharger si noteId a changé)
  React.useEffect(() => {
    // ✅ FIX: Attendre que l'éditeur ET le contenu soient prêts
    // Ne pas charger si le contenu est vide (la note n'est pas encore fetch depuis la DB)
    if (!editor || hasLoadedInitialContentRef.current || !storeContent) return;
    
    editorState.setIsUpdatingFromStore(true);
    
    // ✅ FIX React 18: Utiliser setTimeout au lieu de queueMicrotask pour plus de sécurité
    // Garantit que le setContent est complètement hors du cycle de render React
    setTimeout(() => {
      if (!editor) return;
      
      // ✅ Preprocesser {{embed:xyz}} → HTML pour que Tiptap puisse créer les nodes
      // Le serializer addStorage() reconvertira en {{embed:xyz}} à la sauvegarde
      const processedContent = preprocessEmbeds(storeContent);
      editor.commands.setContent(processedContent);
      
      hasLoadedInitialContentRef.current = true;
      lastStoreSyncRef.current = normalizeMarkdown(storeContent);
      
      // Appeler onInitialContentLoaded après un court délai pour s'assurer que tout est stable
      setTimeout(() => {
        editorState.setIsUpdatingFromStore(false);
        onInitialContentLoaded?.();
      }, 50);
    }, 0);
  }, [editor, storeContent, editorState, onInitialContentLoaded]);

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

