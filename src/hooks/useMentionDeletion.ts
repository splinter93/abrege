/**
 * Hook pour gérer la suppression atomique des mentions ET prompts
 * Si user efface une lettre dans une mention/prompt, efface tout d'un bloc
 * @module hooks/useMentionDeletion
 */

import { useCallback } from 'react';
import type { NoteMention } from '@/types/noteMention';
import type { PromptMention } from '@/types/promptMention';
import { simpleLogger as logger } from '@/utils/logger';

interface UseMentionDeletionOptions {
  message: string;
  setMessage: (message: string) => void;
  mentions: NoteMention[];
  setMentions: (mentions: NoteMention[]) => void;
  usedPrompts: PromptMention[];
  setUsedPrompts: (prompts: PromptMention[]) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Hook pour gérer la suppression atomique des mentions ET prompts
 * Détecte quand user efface dans une mention/prompt et supprime tout
 */
export function useMentionDeletion({
  message,
  setMessage,
  mentions,
  setMentions,
  usedPrompts,
  setUsedPrompts,
  textareaRef
}: UseMentionDeletionOptions) {
  
  /**
   * Intercepte Backspace/Delete pour suppression atomique
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') {
      return; // Pas une touche de suppression
    }
    
    if (!textareaRef.current) {
      return; // Pas de textarea
    }
    
    const cursorPosition = textareaRef.current.selectionStart;
    const selectionEnd = textareaRef.current.selectionEnd;
    
    // Si sélection de texte, laisser comportement natif
    if (cursorPosition !== selectionEnd) {
      return;
    }
    
    // 1️⃣ Vérifier mentions (format: @slug)
    if (mentions.length > 0) {
      for (const mention of mentions) {
        const mentionText = `@${mention.slug}`;
        const mentionIndex = message.indexOf(mentionText);
        
        if (mentionIndex === -1) continue;
        
        const mentionStart = mentionIndex;
        const mentionEnd = mentionIndex + mentionText.length;
        
        // Vérifier si curseur dans ou juste après la mention
        const isInMention = cursorPosition > mentionStart && cursorPosition <= mentionEnd;
        const isJustAfter = e.key === 'Backspace' && cursorPosition === mentionEnd + 1;
        
        if (isInMention || isJustAfter) {
          e.preventDefault(); // Empêcher suppression par défaut
          
          // Supprimer toute la mention du texte (+ espace si présent)
          let endPosition = mentionEnd;
          if (message[mentionEnd] === ' ') {
            endPosition++; // Supprimer l'espace aussi
          }
          const newMessage = message.substring(0, mentionStart) + message.substring(endPosition);
          
          // Supprimer de mentions[]
          const newMentions = mentions.filter(m => m.id !== mention.id);
          
          logger.dev('[useMentionDeletion] 🗑️ Mention supprimée atomiquement:', {
            mentionSlug: mention.slug,
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
    }
    
    // 2️⃣ Vérifier prompts (format: /Nom du prompt)
    // ✅ Utiliser UNIQUEMENT les prompts stockés dans usedPrompts[] (comme mentions)
    for (const prompt of usedPrompts) {
      const promptText = `/${prompt.name}`;
      const promptIndex = message.indexOf(promptText);
      
      if (promptIndex === -1) continue;
      
      const promptStart = promptIndex;
      const promptEnd = promptIndex + promptText.length;
      
      // Vérifier si curseur dans ou juste après le prompt
      const isInPrompt = cursorPosition > promptStart && cursorPosition <= promptEnd;
      const isJustAfter = e.key === 'Backspace' && cursorPosition === promptEnd + 1;
      
      if (isInPrompt || isJustAfter) {
        e.preventDefault(); // Empêcher suppression par défaut
        
        // Supprimer tout le prompt du texte (+ espace si présent)
        let endPosition = promptEnd;
        if (message[promptEnd] === ' ') {
          endPosition++; // Supprimer l'espace aussi
        }
        const newMessage = message.substring(0, promptStart) + message.substring(endPosition);
        
        // Supprimer de usedPrompts[]
        const newPrompts = usedPrompts.filter(p => p.id !== prompt.id);
        
        logger.dev('[useMentionDeletion] 🗑️ Prompt supprimé atomiquement:', {
          promptName: prompt.name,
          promptLength: promptText.length,
          newCursor: promptStart
        });
        
        setMessage(newMessage);
        setUsedPrompts(newPrompts);
        
        // Repositionner curseur au début du prompt
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = promptStart;
            textareaRef.current.selectionEnd = promptStart;
          }
        }, 0);
        
        return; // Traité
      }
    }
  }, [message, mentions, setMessage, setMentions, usedPrompts, setUsedPrompts, textareaRef]);
  
  return { handleKeyDown };
}

