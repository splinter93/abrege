/**
 * Hook pour gérer les actions sur les messages (send/edit)
 * Extrait de ChatFullscreenV2.tsx (handlers lignes 666-931)
 * 
 * Responsabilités:
 * - Wrapper ChatMessageSendingService
 * - Wrapper ChatMessageEditService
 * - Gestion loading/error state
 * - Intégration avec useChatResponse pour LLM
 */

import { useState, useCallback, useMemo } from 'react';
import {
  chatMessageSendingService,
  type SendMessageOptions as ServiceSendOptions
} from '@/services/chat/ChatMessageSendingService';
import {
  chatMessageEditService,
  type EditMessageOptions as ServiceEditOptions
} from '@/services/chat/ChatMessageEditService';
import { sessionSyncService } from '@/services/sessionSyncService';
import { useChatStore } from '@/store/useChatStore';
import type { Agent, ChatMessage } from '@/types/chat';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { LLMContext } from '@/hooks/useLLMContext';
import type { Note } from '@/services/chat/ChatContextBuilder';
import { simpleLogger as logger } from '@/utils/logger';

  /**
   * Options du hook
   */
export interface UseChatMessageActionsOptions {
  selectedAgent: Agent | null;
  infiniteMessages: ChatMessage[];
  llmContext: LLMContext;
  sendMessageFn: (
    message: string | MessageContent,
    sessionId: string,
    context?: Record<string, unknown>,
    history?: ChatMessage[],
    token?: string
  ) => Promise<void>;
  addInfiniteMessage: (msg: ChatMessage) => void;
  clearInfiniteMessages: () => void;
  loadInitialMessages: () => Promise<void>;
  onEditingChange?: (editing: boolean) => void;
  requireAuth: () => boolean;
  onBeforeSend?: () => Promise<void>; // ✅ NOUVEAU: Callback async avant envoi (reload + reset streaming)
}

/**
 * Interface de retour du hook
 */
export interface UseChatMessageActionsReturn {
  sendMessage: (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[],
    mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number }>
  ) => Promise<void>;
  
  editMessage: (
    messageId: string,
    newContent: string,
    images?: ImageAttachment[]
  ) => Promise<void>;
  
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook pour gérer les actions sur les messages
 * 
 * Wrapper les services ChatMessageSendingService et ChatMessageEditService
 * avec gestion de l'état loading/error et intégration avec useChatResponse.
 * 
 * @param options - Options du hook
 * @returns Actions et état
 */
export function useChatMessageActions(
  options: UseChatMessageActionsOptions
): UseChatMessageActionsReturn {
  const {
    selectedAgent,
    infiniteMessages,
    llmContext,
    sendMessageFn,
    addInfiniteMessage,
    clearInfiniteMessages,
    loadInitialMessages,
    onEditingChange,
    requireAuth,
    onBeforeSend
  } = options;

  // 🔥 Lire currentSession depuis le store (toujours à jour)
  const currentSession = useChatStore(state => state.currentSession);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Envoie un message
   * ✅ NOUVEAU : Support mentions légères (métadonnées uniquement)
   * 
   * Flow:
   * 1. Validation session
   * 2. Préparation via ChatMessageSendingService
   * 3. Affichage optimistic UI (message temporaire)
   * 4. Sauvegarde background (addMessage)
   * 5. Appel LLM via sendMessageFn
   * 
   * @param message - Message à envoyer
   * @param images - Images attachées (optionnel)
   * @param notes - Notes attachées complètes (optionnel)
   * @param mentions - Mentions légères (métadonnées uniquement)
   */
  const sendMessage = useCallback(async (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[],
    mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number; created_at?: string }>
  ) => {
    // ✅ Auth guard
    if (!requireAuth()) {
      setError('Authentification requise');
      return;
    }

    setIsLoading(true);
    setError(null);

    // ✅ Session doit exister (créée lors du clic sur agent)
    if (!currentSession) {
      throw new Error('Aucune session active');
    }
    
    // ✅ Reset le streaming précédent
    if (onBeforeSend) {
      await onBeforeSend();
    }

    try {
      // ✅ OPTIMISTIC UI : Créer et afficher message user IMMÉDIATEMENT
      const textContent = typeof message === 'string' 
        ? message 
        : (Array.isArray(message) ? message.find(p => p.type === 'text')?.text || '' : '');
      
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: textContent,
        timestamp: new Date().toISOString(),
        ...(images && images.length > 0 && { 
          attachedImages: images.map(img => ({
            url: img.base64,
            fileName: img.fileName
          }))
        }),
        ...(notes && notes.length > 0 && { 
          attachedNotes: notes.map(n => ({
            id: n.id,
            slug: n.slug,
            title: n.title
          }))
        })
      };

      // Afficher IMMÉDIATEMENT (avant chargement notes)
      addInfiniteMessage(tempMessage);
      logger.info('[useChatMessageActions] ⚡ Message user affiché instantanément (optimistic UI)');

      // 1. Préparer l'envoi via service (charge notes en arrière-plan)
      const prepareResult = await chatMessageSendingService.prepare({
        message,
        images,
        notes,
        mentions, // ✅ NOUVEAU : Passer mentions légères au service
        sessionId: currentSession.id,
        currentSession,
        selectedAgent,
        infiniteMessages,
        llmContext
      });

      if (!prepareResult.success) {
        throw new Error(prepareResult.error || 'Erreur préparation message');
      }

      const { limitedHistory, context, token } = prepareResult;

      logger.dev('[useChatMessageActions] ✅ Contexte préparé:', {
        historyLength: limitedHistory?.length || 0,
        hasNotes: notes && notes.length > 0
      });

      // 2. Sauvegarder en background (non-bloquant)
      const messageToSave = {
        role: 'user' as const,
        content: tempMessage.content,
        timestamp: tempMessage.timestamp,
        ...(tempMessage.attachedImages && { attachedImages: tempMessage.attachedImages }),
        ...(tempMessage.attachedNotes && { attachedNotes: tempMessage.attachedNotes })
      };

      sessionSyncService.addMessageAndSync(currentSession.id, messageToSave)
        .then(saved => {
          if (saved.success) {
            logger.dev('[useChatMessageActions] ✅ Message user sauvegardé:', {
              sequenceNumber: saved.message?.sequence_number
            });
            
            // 🔥 Si 1er message → update optimiste is_empty dans le store
            if (saved.message?.sequence_number === 1) {
              const store = useChatStore.getState();
              const updatedSessions = store.sessions.map(s => 
                s.id === currentSession.id ? { ...s, is_empty: false } : s
              );
              store.setSessions(updatedSessions);
              
              // Update aussi currentSession
              if (store.currentSession?.id === currentSession.id) {
                store.setCurrentSession({ ...store.currentSession, is_empty: false });
              }
              
              logger.dev('[useChatMessageActions] ✅ Conversation marquée non-vide (apparaît sidebar)');
            }
          }
        })
        .catch(err => {
          logger.error('[useChatMessageActions] ❌ Erreur sauvegarde message user:', err);
        });

      // 3. Appel LLM (notes chargées et injectées dans contexte)
      if (!token || !context || !limitedHistory) {
        throw new Error('Données incomplètes pour appel LLM');
      }

      logger.dev('[useChatMessageActions] 📤 Envoi au LLM:', {
        messagePreview: typeof message === 'string' ? message.substring(0, 100) : '[multi-modal]',
        historyLength: limitedHistory.length,
        historyRoles: limitedHistory.map(m => m.role),
        hasNotes: notes && notes.length > 0
      });

      await sendMessageFn(
        message,
        currentSession.id,
        context,
        limitedHistory,
        token
      );

      logger.dev('[useChatMessageActions] ✅ Message envoyé avec succès');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur envoi message';
      setError(errorMessage);
      logger.error('[useChatMessageActions] ❌ Erreur sendMessage:', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    currentSession, // 🔥 Ajouté - sinon closure stale
    selectedAgent,
    infiniteMessages,
    llmContext,
    sendMessageFn,
    addInfiniteMessage,
    requireAuth,
    onBeforeSend
  ]);

  /**
   * Édite un message existant
   * 
   * Flow:
   * 1. Validation session
   * 2. Édition via ChatMessageEditService (delete cascade + add)
   * 3. Reload messages depuis DB
   * 4. Relance LLM pour régénération
   * 
   * @param messageId - ID du message à éditer
   * @param newContent - Nouveau contenu
   * @param images - Images attachées (optionnel)
   */
  const editMessage = useCallback(async (
    messageId: string,
    newContent: string,
    images?: ImageAttachment[]
  ) => {
    // ✅ Auth guard
    if (!requireAuth()) {
      setError('Authentification requise');
      return;
    }

    // ✅ Validation session
    if (!currentSession) {
      setError('Aucune session active');
      return;
    }

    setIsLoading(true);
    setError(null);
    // ❌ NE PAS appeler onEditingChange(true) - déjà fait dans ChatFullscreenV2

    try {
      // 1. Éditer via service (delete cascade + add nouveau message)
      const editResult = await chatMessageEditService.edit({
        messageId,
        newContent,
        images,
        sessionId: currentSession.id,
        currentSession,
        infiniteMessages,
        selectedAgent,
        llmContext
      });

      if (!editResult.success) {
        throw new Error(editResult.error || 'Erreur édition message');
      }

      const { deletedCount, token } = editResult;

      logger.dev('[useChatMessageActions] ✅ Messages supprimés (incluant message édité):', {
        deletedCount,
        newContentPreview: newContent.substring(0, 50)
      });

      // 2. Annuler le mode édition IMMÉDIATEMENT
      onEditingChange?.(false);

      // 3. Reload messages depuis DB
      clearInfiniteMessages();
      await loadInitialMessages();

      logger.dev('[useChatMessageActions] ✅ Messages rechargés, relance génération...');

      // 4. Renvoyer le message édité comme NOUVEAU message
      // ✅ Utilise le flow normal sendMessage qui va :
      //    - Ajouter le message user
      //    - Appeler le LLM
      //    - Gérer la réponse
      await sendMessage(newContent, images);

      logger.dev('[useChatMessageActions] ✅ Message édité renvoyé (flow normal)');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur édition message';
      setError(errorMessage);
      logger.error('[useChatMessageActions] ❌ Erreur editMessage:', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });

      // En cas d'erreur, annuler l'édition et recharger
      onEditingChange?.(false);
      await loadInitialMessages();

    } finally {
      setIsLoading(false);
    }
  }, [
    currentSession,
    selectedAgent,
    infiniteMessages,
    llmContext,
    sendMessageFn,
    clearInfiniteMessages,
    loadInitialMessages,
    onEditingChange,
    requireAuth
  ]);

  /**
   * Efface l'erreur
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sendMessage,
    editMessage,
    isLoading,
    error,
    clearError
  };
}

