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
import type { CanvasSelection } from '@/types/canvasSelection';
import { filterPromptsInMessage } from '@/utils/promptPlaceholders';

interface UseChatSendOptions {
  loadNotes: (notes: SelectedNote[], options: { token: string; timeoutMs?: number }) => Promise<{ notes: NoteWithContent[]; stats: NotesLoadStats }>;
  getAccessToken: () => Promise<string | null>;
  onSend: (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: NoteWithContent[],
    mentions?: NoteMention[],
    prompts?: PromptMention[],
    canvasSelections?: CanvasSelection[], // ✅ NOUVEAU : Sélections du canvas
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => void;
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
   * Fonction interne d'envoi (sans déduplication)
   * ✅ REFACTO : Mentions déjà en state (pas de parsing)
   */
  const sendInternal = useCallback(async (
    message: string,
    images: ImageAttachment[],
    selectedNotes: SelectedNote[],
    mentions: NoteMention[],
    usedPrompts: PromptMention[],
    canvasSelections: CanvasSelection[], // ✅ NOUVEAU : Sélections du canvas
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => {
      logger.dev('[useChatSend] 🚀 START', {
        messageLength: message.length,
        imagesCount: images.length,
        notesCount: selectedNotes.length,
        mentionsCount: mentions.length,
        promptsCount: usedPrompts.length,
        canvasSelectionsCount: canvasSelections.length,
        messageContent: message.substring(0, 100) // Preview pour debug
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
      
      // ✅ Construire contenu (garde /slug tel quel - remplacement au backend)
      const content = buildMessageContent(
        message || 'Regarde cette image',
        images
      );

      const promptsToSendRaw = usedPrompts && usedPrompts.length > 0 ? usedPrompts : undefined;
      const promptsToSend = promptsToSendRaw
        ? filterPromptsInMessage(message, promptsToSendRaw)
        : undefined;
      
      // ✅ Envoyer avec mentions légères + prompts metadata + notes épinglées + canvas selections + reasoning override
      // Ne passer mentions/prompts/selections que si vraiment présents (éviter tableau vide)
      const mentionsToSend = mentions && mentions.length > 0 ? mentions : undefined;
      const canvasSelectionsToSend = canvasSelections && canvasSelections.length > 0 ? canvasSelections : undefined;

      onSend(content, images, notesWithContent, mentionsToSend, promptsToSend, canvasSelectionsToSend, reasoningOverride);
      
      logger.dev('[useChatSend] ✅ COMPLETE', {
        mentionsSent: mentionsToSend?.length || 0,
        promptsSent: promptsToSend?.length || 0,
        canvasSelectionsSent: canvasSelectionsToSend?.length || 0,
        hasMentions: !!mentionsToSend,
        hasPrompts: !!promptsToSend,
        hasCanvasSelections: !!canvasSelectionsToSend
      });
      
      return true;
    } catch (error) {
      logger.error('[useChatSend] ❌ Erreur:', error);
      setUploadError('Erreur lors de l\'envoi du message');
      return false;
    }
  }, [loadNotes, getAccessToken, onSend, setUploadError]);

  /**
   * Envoie un message avec notes, images et mentions (avec déduplication)
   */
  const send = useCallback(async (
    message: string,
    images: ImageAttachment[],
    selectedNotes: SelectedNote[],
    mentions: NoteMention[],
    usedPrompts: PromptMention[], // ✅ NOUVEAU : Prompts utilisés
    canvasSelections: CanvasSelection[], // ✅ NOUVEAU : Sélections du canvas
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => {
    // Générer un ID unique pour cette opération
    const operationId = `${message}-${images.map(i => i.id).join(',')}-${selectedNotes.map(n => n.id).join(',')}-${mentions.map(m => m.id).join(',')}-${usedPrompts.map(p => p.id).join(',')}-${(canvasSelections || []).map(s => s.id).join(',')}-${reasoningOverride || 'null'}`;
    
    // Vérifier si cette opération est déjà en cours
    if (sendQueue.current.has(operationId)) {
      logger.dev(`[useChatSend] 🔄 Déduplication: envoi ${operationId} déjà en cours`);
      return sendQueue.current.get(operationId)!;
    }

    // Créer la promesse d'envoi
    const sendPromise = sendInternal(message, images, selectedNotes, mentions, usedPrompts, canvasSelections, reasoningOverride);
    
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

