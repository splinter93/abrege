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
import type { ChatSession } from '@/store/useChatStore';
import type { Agent, ChatMessage } from '@/types/chat';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { LLMContext } from '@/hooks/useLLMContext';
import type { Note } from '@/services/chat/ChatContextBuilder';
import { simpleLogger as logger } from '@/utils/logger';

  /**
   * Options du hook
   */
export interface UseChatMessageActionsOptions {
  currentSession: ChatSession | null;
  selectedAgent: Agent | null;
  infiniteMessages: ChatMessage[];
  llmContext: LLMContext;
  sendMessageFn: (
    message: string | MessageContent,
    sessionId: string,
    context: unknown,
    history: ChatMessage[],
    token: string
  ) => Promise<void>;
  addInfiniteMessage: (msg: ChatMessage) => void;
  clearInfiniteMessages: () => void;
  loadInitialMessages: () => Promise<void>;
  onEditingChange?: (editing: boolean) => void;
  createSession: (name?: string, agentId?: string | null) => Promise<ChatSession | null>; // ✅ Retourne session
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
    notes?: Note[]
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
    currentSession,
    selectedAgent,
    infiniteMessages,
    llmContext,
    sendMessageFn,
    addInfiniteMessage,
    clearInfiniteMessages,
    loadInitialMessages,
    onEditingChange,
    createSession,
    requireAuth,
    onBeforeSend
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false); // ✅ Lock création session

  /**
   * Envoie un message
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
   * @param notes - Notes attachées (optionnel)
   */
  const sendMessage = useCallback(async (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[]
  ) => {
    // ✅ Auth guard
    if (!requireAuth()) {
      setError('Authentification requise');
      return;
    }

    // 🔒 LOCK : Empêcher spam création session si déjà en cours
    if (creatingSession) {
      logger.warn('[useChatMessageActions] ⚠️ Création session déjà en cours, message ignoré');
      return;
    }

    setIsLoading(true);
    setError(null);

    // ✅ NOUVEAU : Créer session au premier message si pas de session
    let sessionToUse = currentSession;
    if (!currentSession) {
      setCreatingSession(true); // 🔒 LOCK activé
      
      try {
        logger.dev('[useChatMessageActions] 🆕 Premier message, création session avec agent:', selectedAgent?.name);
        
        // Créer session avec agent sélectionné
        const newSession = await createSession(
          'Nouvelle conversation', // ✅ Nom temporaire (Phase 2: IA générera nom intelligent)
          selectedAgent?.id || null
        );
        
        if (!newSession) {
          throw new Error('Échec création session');
        }
        
        sessionToUse = newSession; // ✅ Utiliser la session créée
        logger.dev('[useChatMessageActions] ✅ Session créée:', {
          sessionId: newSession.id,
          agentId: newSession.agent_id
        });
      } finally {
        setCreatingSession(false); // 🔒 LOCK relâché
      }
    }
    
    // ✅ Reset le streaming précédent (reload + vide la timeline affichée)
    if (onBeforeSend) {
      await onBeforeSend();
      // onBeforeSend a reload les messages et attendu que infiniteMessages soit à jour
    }

    try {
      // ✅ ATTENDRE encore un tick pour être SÛR que infiniteMessages est à jour
      await new Promise(resolve => setTimeout(resolve, 50));
      
      logger.dev('[useChatMessageActions] 📊 Historique pour nouveau message:', {
        messagesCount: infiniteMessages.length,
        lastMessageRole: infiniteMessages[infiniteMessages.length - 1]?.role,
        lastMessagePreview: infiniteMessages[infiniteMessages.length - 1]?.content?.substring(0, 100)
      });
      
      // ✅ CRITICAL: Utiliser sessionToUse qui peut être la session nouvellement créée
      const finalSession = sessionToUse || currentSession;
      
      if (!finalSession) {
        throw new Error('Aucune session disponible après création');
      }

      // 1. Préparer l'envoi via service
      const prepareResult = await chatMessageSendingService.prepare({
        message,
        images,
        notes,
        sessionId: finalSession.id,
        currentSession: finalSession,
        selectedAgent,
        infiniteMessages, // ✅ Maintenant à jour avec le message précédent
        llmContext
      });

      if (!prepareResult.success) {
        throw new Error(prepareResult.error || 'Erreur préparation message');
      }

      const { tempMessage, limitedHistory, context, token } = prepareResult;

      logger.dev('[useChatMessageActions] ✅ Message préparé:', {
        hasTempMessage: !!tempMessage,
        historyLength: limitedHistory?.length || 0
      });

      // 2. Affichage optimistic UI
      if (tempMessage) {
        addInfiniteMessage(tempMessage);
        logger.dev('[useChatMessageActions] ⚡ Message user affiché (optimistic)');
      }

      // 3. Sauvegarder en background (non-bloquant)
      const messageToSave: Omit<ChatMessage, 'id'> = {
        role: 'user',
        content: tempMessage?.content || '',
        timestamp: new Date().toISOString(),
        ...(tempMessage?.attachedImages && { attachedImages: tempMessage.attachedImages })
      };

      sessionSyncService.addMessageAndSync(finalSession.id, messageToSave)
        .then(saved => {
          if (saved.success) {
            logger.dev('[useChatMessageActions] ✅ Message user sauvegardé:', {
              sequenceNumber: saved.message?.sequence_number
            });
          }
        })
        .catch(err => {
          logger.error('[useChatMessageActions] ❌ Erreur sauvegarde message user:', err);
        });

      // 4. Appel LLM
      if (!token || !context || !limitedHistory) {
        throw new Error('Données incomplètes pour appel LLM');
      }

      logger.dev('[useChatMessageActions] 📤 Envoi au LLM:', {
        messagePreview: typeof message === 'string' ? message.substring(0, 100) : '[multi-modal]',
        historyLength: limitedHistory.length,
        historyRoles: limitedHistory.map(m => m.role),
        context: context
      });

      await sendMessageFn(
        message,
        finalSession.id,
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
    currentSession,
    selectedAgent,
    infiniteMessages,
    llmContext,
    sendMessageFn,
    addInfiniteMessage,
    createSession,
    requireAuth,
    creatingSession, // ✅ Dépendance ajoutée
    onBeforeSend // ✅ Manquait aussi
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

