/**
 * Hook pour gérer l'envoi de messages dans le chat
 * Gère le chargement de notes, construction du contenu et envoi
 * @module hooks/useChatSend
 */

import { useCallback, useRef } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { buildMessageContent } from '@/utils/imageUtils';
import type { ImageAttachment, MessageContent } from '@/types/image';
import type { SelectedNote, NoteWithContent, NotesLoadStats } from './useNotesLoader';

interface UseChatSendOptions {
  loadNotes: (notes: SelectedNote[], options: { token: string; timeoutMs?: number }) => Promise<{ notes: NoteWithContent[]; stats: NotesLoadStats }>;
  getAccessToken: () => Promise<string | null>;
  onSend: (message: string | MessageContent, images?: ImageAttachment[], notes?: NoteWithContent[]) => void;
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
   * Envoie un message avec notes et images (avec déduplication)
   */
  const send = useCallback(async (
    message: string,
    images: ImageAttachment[],
    selectedNotes: SelectedNote[]
  ) => {
    // Générer un ID unique pour cette opération
    const operationId = `${message}-${images.map(i => i.id).join(',')}-${selectedNotes.map(n => n.id).join(',')}`;
    
    // Vérifier si cette opération est déjà en cours
    if (sendQueue.current.has(operationId)) {
      logger.dev(`[useChatSend] 🔄 Déduplication: envoi ${operationId} déjà en cours`);
      return sendQueue.current.get(operationId)!;
    }

    // Créer la promesse d'envoi
    const sendPromise = sendInternal(message, images, selectedNotes);
    
    // Stocker dans la queue
    sendQueue.current.set(operationId, sendPromise);
    
    try {
      const result = await sendPromise;
      return result;
    } finally {
      // Nettoyer la queue
      sendQueue.current.delete(operationId);
    }
  }, [loadNotes, getAccessToken, onSend, setUploadError]);

  /**
   * Fonction interne d'envoi (sans déduplication)
   */
  const sendInternal = useCallback(async (
    message: string,
    images: ImageAttachment[],
    selectedNotes: SelectedNote[]
  ) => {
    logger.dev('[useChatSend] 🚀 START', {
      messageLength: message.length,
      imagesCount: images.length,
      notesCount: selectedNotes.length
    });
    
    try {
      let notesWithContent: NoteWithContent[] | undefined;
      
      if (selectedNotes.length > 0) {
        logger.info('[useChatSend] 📥 Chargement notes...', {
          count: selectedNotes.length
        });
        
        const token = await getAccessToken();
        if (!token) {
          throw new Error('Token non disponible');
        }
        
        const { notes, stats } = await loadNotes(selectedNotes, { 
          token, 
          timeoutMs: 5000 
        });
        
        notesWithContent = notes;
        
        logger.info('[useChatSend] ✅ Notes chargées', stats);
        
        if (stats.failed > 0 || stats.timedOut) {
          logger.warn('[useChatSend] ⚠️ Chargement notes partiel', stats);
        }
      }
      
      const content = buildMessageContent(
        message || 'Regarde cette image', 
        images
      );
      
      onSend(content, images, notesWithContent);
      
      logger.dev('[useChatSend] ✅ COMPLETE');
      
      return true;
    } catch (error) {
      logger.error('[useChatSend] ❌ Erreur:', error);
      setUploadError('Erreur lors de l\'envoi du message');
      return false;
    }
  }, [loadNotes, getAccessToken, onSend, setUploadError]);

  return { send };
}

