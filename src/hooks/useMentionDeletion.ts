/**
 * Hook pour gérer la suppression atomique des mentions
 * Si user efface une lettre dans une mention, efface toute la mention
 * @module hooks/useMentionDeletion
 */

import { useCallback } from 'react';
import type { NoteMention } from '@/types/noteMention';
import { simpleLogger as logger } from '@/utils/logger';

interface UseMentionDeletionOptions {
  message: string;
  setMessage: (message: string) => void;
  mentions: NoteMention[];
  setMentions: (mentions: NoteMention[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Hook pour gérer la suppression atomique des mentions
 * Détecte quand user efface dans une mention et supprime tout
 */
export function useMentionDeletion({
  message,
  setMessage,
  mentions,
  setMentions,
  textareaRef
}: UseMentionDeletionOptions) {
  
  /**
   * Intercepte Backspace/Delete pour suppression atomique
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
      return; // Pas une touche de suppression
    }
    
    if (!textareaRef.current || mentions.length === 0) {
      return; // Pas de textarea ou pas de mentions
    }
    
    const cursorPosition = textareaRef.current.selectionStart;
    const selectionEnd = textareaRef.current.selectionEnd;
    
    // Si sélection de texte, laisser comportement natif
    if (cursorPosition !== selectionEnd) {
      return;
    }
    
    // Vérifier si le curseur est dans une mention
    for (const mention of mentions) {
      const mentionText = `@${mention.title}`;
      const mentionIndex = message.indexOf(mentionText);
      
      if (mentionIndex === -1) continue;
      
      const mentionStart = mentionIndex;
      const mentionEnd = mentionIndex + mentionText.length;
      
      // Vérifier si curseur dans ou juste après la mention
      const isInMention = cursorPosition > mentionStart && cursorPosition <= mentionEnd;
      const isJustAfter = e.key === 'Backspace' && cursorPosition === mentionEnd + 1;
      
      if (isInMention || isJustAfter) {
        e.preventDefault(); // Empêcher suppression par défaut
        
        // Supprimer toute la mention du texte
        const newMessage = message.substring(0, mentionStart) + message.substring(mentionEnd);
        
        // Supprimer de mentions[]
        const newMentions = mentions.filter(m => m.id !== mention.id);
        
        logger.dev('[useMentionDeletion] 🗑️ Mention supprimée atomiquement:', {
          mentionTitle: mention.title,
          mentionLength: mentionText.length,
          newCursor: mentionStart
        });
        
        setMessage(newMessage);
        setMentions(newMentions);
        
        // Repositionner curseur au début de la mention
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = mentionStart;
            textareaRef.current.selectionEnd = mentionStart;
          }
        }, 0);
        
        return; // Traité
      }
    }
  }, [message, mentions, setMessage, setMentions, textareaRef]);
  
  return { handleKeyDown };
}

