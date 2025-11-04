/**
 * Hook pour gérer la sélection de notes avec logique textarea
 * ✅ REFACTO : Ajoute à mentions[] au lieu d'insérer marker dans texte
 * @module hooks/useNoteSelectionWithTextarea
 */

import { useCallback } from 'react';
import type { SelectedNote } from './useNotesLoader';
import type { NoteMention } from '@/types/noteMention';
import { simpleLogger as logger } from '@/utils/logger';

interface UseNoteSelectionWithTextareaOptions {
  message: string;
  setMessage: (message: string) => void;
  mentions: NoteMention[];
  setMentions: (mentions: NoteMention[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  closeMenu: () => void;
  setNoteSearchQuery: (query: string) => void;
  mode?: 'mention' | 'attach'; // ✅ Distinguer mention vs épinglage
  onAttach?: (note: SelectedNote) => void; // ✅ Callback pour épinglage
  onCloseMentionMenu?: () => void; // ✅ NOUVEAU : Fermer mention menu
}

/**
 * Hook pour gérer la sélection de notes avec manipulation textarea
 * ✅ REFACTO : Ajoute à mentions[] (mode='mention') OU épinglage (mode='attach')
 */
export function useNoteSelectionWithTextarea({
  message,
  setMessage,
  mentions,
  setMentions,
  textareaRef,
  closeMenu,
  setNoteSearchQuery,
  mode = 'mention', // ✅ Par défaut : mention légère
  onAttach,
  onCloseMentionMenu
}: UseNoteSelectionWithTextareaOptions) {
  
  /**
   * Sélectionner une note et ajouter à mentions[] OU épingler
   * ✅ REFACTO : Texte propre + state mentions[] séparé
   */
  const handleSelectNoteWithTextarea = useCallback((note: SelectedNote) => {
    // ✅ MODE MENTION : Ajouter à mentions[] (SANS toucher au texte)
    if (mode === 'mention') {
      if (!textareaRef.current) {
        logger.warn('[useNoteSelectionWithTextarea] ⚠️ Pas de textarea ref');
        return;
      }
      
      const cursorPosition = textareaRef.current.selectionStart;
      const textBeforeCursor = message.substring(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex === -1) {
        logger.warn('[useNoteSelectionWithTextarea] ⚠️ Pas de @ trouvé');
        return;
      }
      
      // ✅ Remplacer @query par @ + SLUG + espace (ex: "@architecture-systeme ")
      const before = message.substring(0, lastAtIndex);
      const after = message.substring(cursorPosition);
      const mentionText = `@${note.slug}`;
      const newMessage = before + mentionText + ' ' + after;
      
      // ✅ Ajouter à mentions[] (comme images[])
      const newMention: NoteMention = {
        id: note.id,
        slug: note.slug,
        title: note.title,
        description: note.description,
        word_count: note.word_count,
        created_at: note.created_at
      };
      
      // Éviter doublons
      if (!mentions.find(m => m.id === note.id)) {
        setMentions([...mentions, newMention]);
      }
      
      // ✅ Calculer nouvelle position curseur (AVANT setState)
      // Position APRÈS la mention + espace
      const newCursorPosition = lastAtIndex + mentionText.length + 1; // +1 pour l'espace
      
      logger.dev('[useNoteSelectionWithTextarea] 📝 Mention ajoutée:', {
        noteSlug: note.slug,
        noteId: note.id,
        insertedText: `${mentionText} `, // Avec espace
        mentionLength: mentionText.length,
        newCursor: newCursorPosition,
        totalMentions: mentions.length + 1
      });
      
      setMessage(newMessage);
      closeMenu();
      setNoteSearchQuery('');
      onCloseMentionMenu?.(); // ✅ NOUVEAU : Fermer mention menu
      
      // ✅ Repositionner curseur APRÈS @ + titre
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = newCursorPosition;
          textareaRef.current.selectionEnd = newCursorPosition;
          
          logger.dev('[useNoteSelectionWithTextarea] ✅ Curseur positionné à', newCursorPosition);
        }
      }, 20); // ✅ Timeout plus long pour stabilité
    } 
    // ✅ MODE ATTACH : Épingler la note (ancien système)
    else if (mode === 'attach') {
      if (onAttach) {
        onAttach(note);
        logger.dev('[useNoteSelectionWithTextarea] 📎 Note épinglée:', {
          noteSlug: note.slug,
          noteId: note.id
        });
      }
      closeMenu();
      setNoteSearchQuery('');
    }
  }, [mode, message, setMessage, mentions, setMentions, textareaRef, closeMenu, setNoteSearchQuery, onAttach, onCloseMentionMenu]);

  return { handleSelectNoteWithTextarea };
}
