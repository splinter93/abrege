/**
 * Hook pour gérer la détection des commandes spéciales dans l'input
 * Détecte les slash commands (/) et les mentions (@)
 * @module hooks/useInputDetection
 */

import { useCallback } from 'react';

interface InputDetectionOptions {
  showNoteSelector: boolean;
  showSlashMenu: boolean;
  openMenu: (menu: 'slash' | 'notes') => void;
  closeMenu: () => void;
  setSlashQuery: (query: string) => void;
  setNoteSearchQuery: (query: string) => void;
  setAtMenuPosition: (position: { top: number; left: number } | null) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Hook pour détecter les slash commands et mentions dans l'input
 */
export function useInputDetection({
  showNoteSelector,
  showSlashMenu,
  openMenu,
  closeMenu,
  setSlashQuery,
  setNoteSearchQuery,
  setAtMenuPosition,
  textareaRef
}: InputDetectionOptions) {
  
  /**
   * Handler principal pour détecter les commandes
   */
  const detectCommands = useCallback((
    value: string,
    cursorPosition: number
  ) => {
    // 🎯 Détection slash command au DÉBUT uniquement
    if (value.startsWith('/')) {
      if (value.includes(' ')) {
        closeMenu();
        setSlashQuery('');
      } else {
        const query = value.substring(1).toLowerCase();
        setSlashQuery(query);
        openMenu('slash');
      }
      
      if (showNoteSelector) {
        closeMenu();
        setNoteSearchQuery('');
      }
      return; // Skip mention detection
    } 
    
    // Fermer slash menu si on ne commence plus par "/"
    if (showSlashMenu) {
      closeMenu();
      setSlashQuery('');
    }
    
    // 🎯 Détection @ mentions PARTOUT dans le texte
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
        if (showNoteSelector) closeMenu();
        setNoteSearchQuery('');
        setAtMenuPosition(null);
      } else {
        // Calculer position du menu
        if (textareaRef.current) {
          const textBeforeAt = value.substring(0, lastAtIndex);
          const lines = textBeforeAt.split('\n');
          const charInLine = lines[lines.length - 1]?.length || 0;
          const charWidth = 7.5;
          const left = Math.min(charInLine * charWidth, 100);
          
          setAtMenuPosition({ top: 0, left });
        }
        
        setNoteSearchQuery(textAfterAt.toLowerCase());
        openMenu('notes');
      }
    } else {
      if (showNoteSelector && !value.includes('@')) {
        closeMenu();
        setNoteSearchQuery('');
        setAtMenuPosition(null);
      }
    }
  }, [
    showNoteSelector,
    showSlashMenu,
    openMenu,
    closeMenu,
    setSlashQuery,
    setNoteSearchQuery,
    setAtMenuPosition,
    textareaRef
  ]);

  return { detectCommands };
}

