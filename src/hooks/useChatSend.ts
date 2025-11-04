/**
 * Hook pour gérer l'envoi de messages dans le chat
 * ✅ REFACTO : Mentions en state (pas de parsing markers)
 * @module hooks/useChatSend
 */

import { useCallback, useRef } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { buildMessageContent } from '@/utils/imageUtils';
import type { ImageAttachment, MessageContent } from '@/types/image';
import type { SelectedNote, NoteWithContent, NotesLoadStats } from './useNotesLoader';
import type { NoteMention } from '@/types/noteMention';
import type { PromptMention } from '@/types/promptMention';

interface UseChatSendOptions {
  loadNotes: (notes: SelectedNote[], options: { token: string; timeoutMs?: number }) => Promise<{ notes: NoteWithContent[]; stats: NotesLoadStats }>;
  getAccessToken: () => Promise<string | null>;
  onSend: (message: string | MessageContent, images?: ImageAttachment[], notes?: NoteWithContent[], mentions?: NoteMention[]) => void;
  setUploadError: (error: string | null) => void;
}

/**
 * Hook pour gérer l'envoi de messages
 */
export function useChatSend({
  loadNotes,
  getAccessToken,
  onSend,
  setUploadError
}: UseChatSendOptions) {
  
  // Queue pour éviter les envois simultanés identiques
  const sendQueue = useRef(new Map<string, Promise<boolean>>());
  
  /**
   * Remplace les prompts /Nom par leurs templates
   * ✅ REFACTO : Utilise UNIQUEMENT usedPrompts[] (whitelist exacte)
   */
  const replacePromptsWithTemplates = useCallback((message: string, usedPrompts: PromptMention[]): string => {
    if (usedPrompts.length === 0) {
      return message;
    }
    
    let finalMessage = message;
    let replacedCount = 0;
    
    // ✅ Parcourir UNIQUEMENT les prompts utilisés (whitelist)
    for (const prompt of usedPrompts) {
      const promptPattern = `/${prompt.name}`;
      
      // Vérifier que le template existe et n'est pas vide
      if (!prompt.prompt_template || !prompt.prompt_template.trim()) {
        logger.warn('[useChatSend] ⚠️ Template vide ignoré:', {
          promptName: prompt.name,
          promptId: prompt.id
        });
        continue;
      }
      
      // Chercher et remplacer toutes les occurrences de ce prompt
      if (finalMessage.includes(promptPattern)) {
        finalMessage = finalMessage.replace(promptPattern, prompt.prompt_template + '\n\n');
        replacedCount++;
        
        logger.info('[useChatSend] ✅ Prompt remplacé:', {
          promptName: prompt.name,
          promptId: prompt.id,
          templateLength: prompt.prompt_template.length
        });
      }
    }
    
    if (replacedCount > 0) {
      logger.info('[useChatSend] ✨ Remplacement terminé:', {
        count: replacedCount,
        originalLength: message.length,
        finalLength: finalMessage.length
      });
    }
    
    return finalMessage;
  }, []);
  
  /**
   * Fonction interne d'envoi (sans déduplication)
   * ✅ REFACTO : Mentions déjà en state (pas de parsing)
   */
  const sendInternal = useCallback(async (
    message: string,
    images: ImageAttachment[],
    selectedNotes: SelectedNote[],
    mentions: NoteMention[],
    usedPrompts: PromptMention[]
  ) => {
    logger.dev('[useChatSend] 🚀 START', {
      messageLength: message.length,
      imagesCount: images.length,
      notesCount: selectedNotes.length,
      mentionsCount: mentions.length,
      promptsCount: usedPrompts.length
    });
    
    try {
      // ✅ Notes épinglées (chargement complet - ancien système)
      let notesWithContent: NoteWithContent[] | undefined;
      
      if (selectedNotes.length > 0) {
        logger.info('[useChatSend] 📥 Chargement notes épinglées...', {
          count: selectedNotes.length
        });
        
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Token non disponible');
        }
        
        // ✅ OPTIMISATION: Timeout réduit 5s → 3s (suffisant pour la plupart des cas)
        // Les notes sont déjà chargées en parallèle (Promise.all dans useNotesLoader)
        const { notes, stats } = await loadNotes(selectedNotes, { 
          token, 
          timeoutMs: 3000 
        });
        
        notesWithContent = notes;
        
        logger.info('[useChatSend] ✅ Notes épinglées chargées', stats);
        
        if (stats.failed > 0 || stats.timedOut) {
          logger.warn('[useChatSend] ⚠️ Chargement notes partiel', stats);
        }
      }
      
      // ✅ Remplacer les prompts /Nom par leurs templates (whitelist exacte)
      const messageWithPrompts = replacePromptsWithTemplates(message, usedPrompts);
      
      // ✅ Construire contenu
      const content = buildMessageContent(
        messageWithPrompts || 'Regarde cette image', 
        images
      );
      
      // ✅ Envoyer avec mentions légères + notes épinglées
      // Ne passer mentions que si vraiment présentes (éviter tableau vide)
      const mentionsToSend = mentions && mentions.length > 0 ? mentions : undefined;
      
      onSend(content, images, notesWithContent, mentionsToSend);
      
      logger.dev('[useChatSend] ✅ COMPLETE', {
        mentionsSent: mentionsToSend?.length || 0,
        hasMentions: !!mentionsToSend,
        promptsReplaced: usedPrompts.length
      });
      
      return true;
    } catch (error) {
      logger.error('[useChatSend] ❌ Erreur:', error);
      setUploadError('Erreur lors de l\'envoi du message');
      return false;
    }
  }, [loadNotes, getAccessToken, onSend, setUploadError, replacePromptsWithTemplates]);

  /**
   * Envoie un message avec notes, images et mentions (avec déduplication)
   */
  const send = useCallback(async (
    message: string,
    images: ImageAttachment[],
    selectedNotes: SelectedNote[],
    mentions: NoteMention[],
    usedPrompts: PromptMention[] // ✅ NOUVEAU : Prompts utilisés
  ) => {
    // Générer un ID unique pour cette opération
    const operationId = `${message}-${images.map(i => i.id).join(',')}-${selectedNotes.map(n => n.id).join(',')}-${mentions.map(m => m.id).join(',')}-${usedPrompts.map(p => p.id).join(',')}`;
    
    // Vérifier si cette opération est déjà en cours
    if (sendQueue.current.has(operationId)) {
      logger.dev(`[useChatSend] 🔄 Déduplication: envoi ${operationId} déjà en cours`);
      return sendQueue.current.get(operationId)!;
    }

    // Créer la promesse d'envoi
    const sendPromise = sendInternal(message, images, selectedNotes, mentions, usedPrompts);
    
    // Stocker dans la queue
    sendQueue.current.set(operationId, sendPromise);
    
    try {
      const result = await sendPromise;
      return result;
    } finally {
      // Nettoyer la queue
      sendQueue.current.delete(operationId);
    }
  }, [sendInternal]);

  return { send };
}

