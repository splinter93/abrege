/**
 * Hook pour gérer la sélection de notes avec logique textarea
 * Gère l'effacement du @query et repositionnement du curseur
 * @module hooks/useNoteSelectionWithTextarea
 */

import { useCallback } from 'react';
import type { SelectedNote } from './useNotesLoader';

interface UseNoteSelectionWithTextareaOptions {
  handleSelectNote: (note: SelectedNote) => void;
  message: string;
  setMessage: (message: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  closeMenu: () => void;
  setNoteSearchQuery: (query: string) => void;
}

/**
 * Hook pour gérer la sélection de notes avec manipulation textarea
 */
export function useNoteSelectionWithTextarea({
  handleSelectNote,
  message,
  setMessage,
  textareaRef,
  closeMenu,
  setNoteSearchQuery
}: UseNoteSelectionWithTextareaOptions) {
  
  /**
   * Sélectionner une note et nettoyer le textarea
   */
  const handleSelectNoteWithTextarea = useCallback((note: SelectedNote) => {
    handleSelectNote(note);
    
    // Logique spécifique: effacer @query du textarea
    if (textareaRef.current) {
      const cursorPosition = textareaRef.current.selectionStart;
      const textBeforeCursor = message.substring(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const newMessage = message.substring(0, lastAtIndex) + message.substring(cursorPosition);
        setMessage(newMessage); // Mettre à jour le message
        
        closeMenu();
        setNoteSearchQuery('');
        
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = lastAtIndex;
            textareaRef.current.selectionEnd = lastAtIndex;
          }
        }, 0);
      }
    }
  }, [handleSelectNote, message, setMessage, textareaRef, closeMenu, setNoteSearchQuery]);

  return { handleSelectNoteWithTextarea };
}
