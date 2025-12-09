import { useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import type { EditorState } from '@tiptap/pm/state';
import { logger, LogCategory } from '@/utils/logger';

/**
 * Hook pour gérer les interactions entre l'éditeur et ses composants périphériques
 * Centralise la logique de communication et évite les re-renders excessifs
 */
export function useEditorInteractions(editor: Editor | null) {
  const getMarkdownContent = useCallback((ed: Editor): string => {
    const storage = ed.storage as { markdown?: { getMarkdown?: () => string } };
    return storage.markdown?.getMarkdown?.() || '';
  }, []);

  const interactionRef = useRef<{
    lastSelection: EditorState['selection'] | null;
    lastContent: string;
    updateCount: number;
  }>({
    lastSelection: null,
    lastContent: '',
    updateCount: 0
  });

  // Callback optimisé pour les mises à jour de contenu
  const handleContentUpdate = useCallback((content: string) => {
    if (!editor) return;
    
    try {
      const currentContent = getMarkdownContent(editor);
      if (currentContent !== content) {
        interactionRef.current.lastContent = currentContent;
        interactionRef.current.updateCount++;
        
        // Déclencher les événements personnalisés pour les composants
        const event = new CustomEvent('editor-content-updated', {
          detail: {
            content: currentContent,
            updateCount: interactionRef.current.updateCount
          }
        });
        document.dispatchEvent(event);
      }
    } catch (error) {
      logger.warn(LogCategory.EDITOR, 'Erreur lors de la mise à jour du contenu:', error);
    }
  }, [editor]);

  // Callback optimisé pour les changements de sélection
  const handleSelectionChange = useCallback(() => {
    if (!editor) return;
    
    try {
      const selection = editor.state.selection;
      const hasChanged = JSON.stringify(selection) !== JSON.stringify(interactionRef.current.lastSelection);
      
      if (hasChanged) {
        interactionRef.current.lastSelection = selection;
        
        // Déclencher les événements personnalisés pour les composants
        const event = new CustomEvent('editor-selection-changed', {
          detail: {
            selection,
            hasSelection: !selection.empty,
            from: selection.from,
            to: selection.to
          }
        });
        document.dispatchEvent(event);
      }
    } catch (error) {
      logger.warn(LogCategory.EDITOR, 'Erreur lors du changement de sélection:', error);
    }
  }, [editor]);

  // Callback pour les changements de focus
  const handleFocusChange = useCallback((isFocused: boolean) => {
    if (!editor) return;
    
    try {
      const event = new CustomEvent('editor-focus-changed', {
        detail: { isFocused }
      });
      document.dispatchEvent(event);
    } catch (error) {
      logger.warn(LogCategory.EDITOR, 'Erreur lors du changement de focus:', error);
    }
  }, [editor]);

  // Configuration des listeners d'éditeur
  useEffect(() => {
    if (!editor) return;

    // Écouter les changements de contenu
    editor.on('update', () => {
      const content = getMarkdownContent(editor);
      handleContentUpdate(content);
    });

    // Écouter les changements de sélection
    editor.on('selectionUpdate', handleSelectionChange);

    // Écouter les changements de focus
    editor.on('focus', () => handleFocusChange(true));
    editor.on('blur', () => handleFocusChange(false));

    return () => {
      editor.off('update');
      editor.off('selectionUpdate');
      editor.off('focus');
      editor.off('blur');
    };
  }, [editor, handleContentUpdate, handleSelectionChange, handleFocusChange]);

  // Fonction utilitaire pour obtenir l'état actuel
  const getCurrentState = useCallback(() => {
    if (!editor) return null;
    
    return {
      content: getMarkdownContent(editor),
      selection: editor.state.selection,
      isFocused: editor.isFocused,
      updateCount: interactionRef.current.updateCount
    };
  }, [editor, getMarkdownContent]);

  // Fonction utilitaire pour forcer une mise à jour
  const forceUpdate = useCallback(() => {
    if (!editor) return;
    
    const content = getMarkdownContent(editor);
    handleContentUpdate(content);
    handleSelectionChange();
  }, [editor, handleContentUpdate, handleSelectionChange, getMarkdownContent]);

  return {
    getCurrentState,
    forceUpdate,
    // Exposer les callbacks pour usage externe si nécessaire
    handleContentUpdate,
    handleSelectionChange,
    handleFocusChange
  };
}
