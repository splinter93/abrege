/**
 * Composant invisible gérant la synchronisation entre le store et l'éditeur
 * Extrait de Editor.tsx pour améliorer la modularité
 */

import React from 'react';
import type { FullEditorInstance } from '@/types/editor';
import type { EditorState } from '@/hooks/editor/useEditorState';
import { simpleLogger, LogCategory } from '@/utils/logger';
import { preprocessEmbeds } from '@/utils/preprocessEmbeds';
import { prepareMarkdownForEditor } from '@/utils/markdownSanitizer.client';

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
    lastStoreSyncRef.current = '';
    lastNoteIdRef.current = noteId;
  }
  
  // 🔄 Charger UNIQUEMENT le contenu initial (jamais après)
  // ⚠️ CRITIQUE: Une fois chargé, on ignore TOUS les changements de storeContent
  // SAUF si le contenu passe de vide à non-vide (Phase 2 du chargement)
  // pour éviter les bugs du curseur (effacement, retours auto, etc.)
  React.useEffect(() => {
    // ✅ FIX: Attendre que l'éditeur ET le contenu soient prêts
    // Ne pas charger si le contenu est vide (la note n'est pas encore fetch depuis la DB)
    if (storeContent === undefined || storeContent === null) return;
    if (!editor) return;

    // ✅ Normaliser le contenu une seule fois au début
    const normalizedStoreContent = normalizeMarkdown(storeContent || '');
    const contentChanged = normalizedStoreContent !== lastStoreSyncRef.current;
    
    // ✅ LOG pour diagnostiquer
    simpleLogger.dev(LogCategory.EDITOR, '[EditorSyncManager] 🔍 useEffect déclenché', {
      hasLoadedInitial: hasLoadedInitialContentRef.current,
      storeContentLength: normalizedStoreContent.length,
      lastSyncLength: lastStoreSyncRef.current.length,
      contentChanged,
      editorFocused: editor.isFocused
    });

    // ✅ EXCEPTION UNIQUE : Si le chargement initial a été fait avec un contenu vide,
    // et que le contenu arrive maintenant (Phase 2), on doit le charger
    const wasEmptyContent = !lastStoreSyncRef.current || !lastStoreSyncRef.current.trim();
    const isNewContent = storeContent && storeContent.trim().length > 0;
    const shouldReloadFromEmpty = hasLoadedInitialContentRef.current && wasEmptyContent && isNewContent;

    // ⚠️ CRITIQUE: Si le chargement initial est déjà fait ET que ce n'est pas le cas d'exception ci-dessus
    // On peut recharger MAIS UNIQUEMENT si l'utilisateur n'est PAS en train de taper
    // Cela permet d'afficher les mises à jour LLM (applyContentOperations) sans perturber la frappe
    if (hasLoadedInitialContentRef.current && !shouldReloadFromEmpty) {
        // ✅ SOLUTION SIMPLE : Recharger seulement si l'utilisateur n'est pas en train de taper
        
        if (!contentChanged) {
          // Contenu identique, pas besoin de recharger
          return;
        }
        
        if (editor.isFocused) {
          // L'utilisateur est en train de taper, on ignore pour éviter le saut de curseur
          simpleLogger.dev(LogCategory.EDITOR, '[EditorSyncManager] ⏭️ Contenu changé mais utilisateur en train de taper, skip', {
            storeContentLength: normalizedStoreContent.length,
            lastSyncLength: lastStoreSyncRef.current.length
          });
          return;
        }
        
        // L'utilisateur n'est pas en train de taper, on peut recharger (mise à jour LLM)
        simpleLogger.info(LogCategory.EDITOR, '[EditorSyncManager] 🔄 Rechargement depuis store (mise à jour LLM)', {
          storeContentLength: normalizedStoreContent.length,
          lastSyncLength: lastStoreSyncRef.current.length
        });
      }

    // ⚠️ CRITIQUE: Ne pas charger si déjà en cours de mise à jour
      if (editorState.internal.isUpdatingFromStore) {
        return;
    }
    
    editorState.setIsUpdatingFromStore(true);
    
    // ✅ FIX React 18: Utiliser setTimeout au lieu de queueMicrotask pour plus de sécurité
    // normalizedStoreContent est déjà déclaré au début du useEffect
    // Garantit que le setContent est complètement hors du cycle de render React
    setTimeout(() => {
      if (!editor) return;
      
      // Dé-échapper les entités HTML (ex: -&gt; → ->) pour l’affichage, puis preprocess embeds
      const forEditor = prepareMarkdownForEditor(storeContent || '');
      const processedContent = preprocessEmbeds(forEditor);

      // 🔄 Si le contenu est vide mais Tiptap garde un paragraphe vide, le nettoyer
      if (!processedContent.trim()) {
        editor.commands.clearContent(true);
        editor.commands.insertContent({
          type: 'paragraph',
          attrs: { 'data-placeholder': 'Écrivez quelque chose d\'incroyable...' },
          content: []
        });
        hasLoadedInitialContentRef.current = true;
        lastStoreSyncRef.current = '';
        setTimeout(() => {
          editorState.setIsUpdatingFromStore(false);
          onInitialContentLoaded?.();
        }, 50);
        return;
      }
      editor.commands.setContent(processedContent);
      
      // ✅ Si on recharge depuis un contenu vide, réinitialiser le flag
      if (shouldReloadFromEmpty) {
        simpleLogger.dev(LogCategory.EDITOR, '[EditorSyncManager] 🔄 Rechargement depuis contenu vide (Phase 2)', {
          previousContentLength: lastStoreSyncRef.current?.length || 0,
          newContentLength: processedContent?.length || 0,
          normalizedContentLength: normalizedStoreContent?.length || 0
        });
      }
      
      hasLoadedInitialContentRef.current = true;
      lastStoreSyncRef.current = normalizedStoreContent;
      
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
        simpleLogger.dev('🔄 Mise à jour realtime détectée, sync store → éditeur');
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

