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

import { useState, useCallback, useEffect, useRef } from 'react';
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
import type { Agent, ChatMessage, UserMessage } from '@/types/chat';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { LLMContext } from '@/types/llmContext';
import type { Note, LLMContextForOrchestrator } from '@/services/chat/ChatContextBuilder';
import type { CanvasSelection } from '@/types/canvasSelection';
import { simpleLogger as logger } from '@/utils/logger';
import { tokenManager } from '@/utils/tokenManager';
import { filterPromptsInMessage } from '@/utils/promptPlaceholders';
import { chatOperationLock } from '@/services/chat/ChatOperationLock';

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
    context?: LLMContextForOrchestrator | Record<string, unknown>,
    history?: ChatMessage[],
    token?: string
  ) => Promise<void>;
  addInfiniteMessage: (msg: ChatMessage) => void;
  onEditingChange?: (editing: boolean) => void;
  requireAuth: () => boolean;
  onBeforeSend?: () => Promise<void>; // ✅ NOUVEAU: Callback async avant envoi (reload + reset streaming)
  replaceMessages: (messages: ChatMessage[]) => void;
  initialLoadLimit: number;
}

/**
 * Interface de retour du hook
 */
export interface UseChatMessageActionsReturn {
  sendMessage: (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[],
    mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number }>,
    prompts?: Array<{ id: string; slug: string; name: string; description?: string | null; context?: 'editor' | 'chat' | 'both'; agent_id?: string | null }>, // ✅ NOUVEAU : Prompts metadata
    canvasSelections?: CanvasSelection[], // ✅ NOUVEAU : Sélections du canvas
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => Promise<void>;
  
  editMessage: (options: {
    messageId: string;
    newContent: string;
    images?: ImageAttachment[];
    notes?: Note[];
    mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number; created_at?: string }>;
    usedPrompts?: Array<{ id: string; slug: string; name: string; description?: string | null; context?: 'editor' | 'chat' | 'both'; agent_id?: string | null }>;
    messageIndex?: number;
  }) => Promise<void>;
  
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
    llmContext,
    sendMessageFn,
    addInfiniteMessage,
    onEditingChange,
    requireAuth,
    onBeforeSend,
    replaceMessages,
    initialLoadLimit,
    infiniteMessages
  } = options;

  const messagesRef = useRef<ChatMessage[]>(infiniteMessages);

  useEffect(() => {
    messagesRef.current = infiniteMessages;
  }, [infiniteMessages]);

  const mergeMessagesByIdentity = useCallback((primary: ChatMessage[], secondary: ChatMessage[]) => {
    const withKey = new Map<string, ChatMessage>();
    const withoutKey: ChatMessage[] = [];

    const register = (message: ChatMessage) => {
      const key =
        message.clientMessageId ||
        message.id ||
        (typeof message.sequence_number === 'number' ? `seq-${message.sequence_number}` : null) ||
        (message.timestamp ? `ts-${message.timestamp}` : null);

      if (!key) {
        withoutKey.push(message);
        return;
      }

      withKey.set(key, message);
    };

    primary.forEach(register);
    secondary.forEach(register);

    return [...withKey.values(), ...withoutKey];
  }, []);

  const sortMessagesChronologically = useCallback((messages: ChatMessage[]) => {
    return [...messages].sort((a, b) => {
      const seqA = typeof a.sequence_number === 'number' ? a.sequence_number : Number.POSITIVE_INFINITY;
      const seqB = typeof b.sequence_number === 'number' ? b.sequence_number : Number.POSITIVE_INFINITY;
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });
  }, []);

  const fetchRecentMessages = useCallback(async (sessionId: string, limit: number): Promise<ChatMessage[]> => {
    const tokenResult = await tokenManager.getValidToken();
    if (!tokenResult.isValid || !tokenResult.token) {
      throw new Error(tokenResult.error || 'Token invalide');
    }

    const response = await fetch(
      `/api/chat/sessions/${sessionId}/messages/recent?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${tokenResult.token}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Erreur chargement historique');
    }

    return (result.data?.messages ?? []) as ChatMessage[];
  }, []);

  // 🔥 Lire currentSession depuis le store (toujours à jour)
  const currentSession = useChatStore(state => state.currentSession);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Envoie un message
   * ✅ NOUVEAU : Support mentions légères + prompts metadata
   * 
   * Flow:
   * 1. Validation session
   * 2. Préparation via ChatMessageSendingService
   * 3. Affichage optimistic UI (message temporaire)
   * 4. Sauvegarde background (addMessage)
   * 5. Appel LLM via sendMessageFn
   * 
   * @param message - Message à envoyer (contient /slug tel quel)
   * @param images - Images attachées (optionnel)
   * @param notes - Notes attachées complètes (optionnel)
   * @param mentions - Mentions légères (métadonnées uniquement)
   * @param prompts - Prompts metadata (métadonnées uniquement - remplacement au backend)
   */
  const sendMessage = useCallback(async (
    message: string | MessageContent,
    images?: ImageAttachment[],
    notes?: Note[],
    mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number; created_at?: string }>,
    prompts?: Array<{ id: string; slug: string; name: string; description?: string | null; context?: 'editor' | 'chat' | 'both'; agent_id?: string | null }>,
    canvasSelections?: CanvasSelection[], // ✅ NOUVEAU : Sélections du canvas
    reasoningOverride?: 'advanced' | 'general' | 'fast' | null // ✅ NOUVEAU : Override reasoning
  ) => {
    // ✅ Auth guard
    if (!requireAuth()) {
      setError('Authentification requise');
      return;
    }

    // ✅ Session doit exister (créée lors du clic sur agent)
    if (!currentSession) {
      throw new Error('Aucune session active');
    }
    
    // ✅ NOUVEAU: Wrapper avec lock exclusif pour éviter double-envoi
    return chatOperationLock.runExclusive(
      currentSession.id,
      async () => {
        setIsLoading(true);
        setError(null);

        // ✅ Reset le streaming précédent
        if (onBeforeSend) {
          await onBeforeSend();
        }

        try {
          const currentMessagesSnapshot = messagesRef.current;

          // ✅ OPTIMISTIC UI : Créer et afficher message user IMMÉDIATEMENT
          const textContent = typeof message === 'string' 
            ? message 
            : (Array.isArray(message) ? message.find(p => p.type === 'text')?.text || '' : '');
          
          const clientMessageId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          
          // ✅ NOUVEAU: Générer operation_id unique pour idempotence
          const operationId = `${crypto.randomUUID()}`;

          const filteredPrompts =
            prompts && prompts.length > 0 ? filterPromptsInMessage(textContent, prompts) : [];

          const tempMessage: ChatMessage = {
            id: `temp-${Date.now()}`,
            clientMessageId,
            operation_id: operationId, // ✅ NOUVEAU
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
            }),
            ...(mentions && mentions.length > 0 && { mentions }),
            ...(filteredPrompts.length > 0 && { prompts: filteredPrompts })
          };

          // Afficher IMMÉDIATEMENT (avant chargement notes)
          addInfiniteMessage(tempMessage);
          messagesRef.current = [...currentMessagesSnapshot, tempMessage];
          logger.info('[useChatMessageActions] ⚡ Message user affiché instantanément (optimistic UI)', {
            operationId
          });

      // 1. Préparer l'envoi via service (charge notes en arrière-plan)
      const prepareResult = await chatMessageSendingService.prepare({
        message,
        images,
        notes,
        mentions, // ✅ Mentions légères
        prompts: filteredPrompts,
        canvasSelections, // ✅ NOUVEAU : Sélections du canvas
        reasoningOverride, // ✅ NOUVEAU : Override reasoning
        sessionId: currentSession.id,
        currentSession,
        selectedAgent,
        infiniteMessages: currentMessagesSnapshot,
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
        operation_id: operationId, // ✅ NOUVEAU: Inclure pour déduplication
        ...(tempMessage.attachedImages && { attachedImages: tempMessage.attachedImages }),
        ...(tempMessage.attachedNotes && { attachedNotes: tempMessage.attachedNotes }),
        ...(mentions && mentions.length > 0 && { mentions }),
        ...(filteredPrompts.length > 0 && { prompts: filteredPrompts }),
        ...(canvasSelections && canvasSelections.length > 0 && { canvasSelections }) // ✅ NOUVEAU : Sélections du canvas
      };

      sessionSyncService.addMessageAndSync(currentSession.id, messageToSave)
        .then(saved => {
          if (saved.success) {
            logger.dev('[useChatMessageActions] ✅ Message user sauvegardé:', {
              sequenceNumber: saved.message?.sequence_number
            });
            
            if (saved.message) {
              const {
                attached_images,
                attached_notes,
                ...rest
              } = saved.message as ChatMessage & {
                attached_images?: UserMessage['attachedImages'];
                attached_notes?: UserMessage['attachedNotes'];
              };

              const savedMessage: ChatMessage = {
                ...rest,
                clientMessageId,
                ...(attached_images ? { attachedImages: attached_images } : {}),
                ...(attached_notes ? { attachedNotes: attached_notes } : {})
              };

              const updatedMessages = messagesRef.current.map(msg => 
                msg.id === tempMessage.id ? savedMessage : msg
              );

              messagesRef.current = updatedMessages;
              replaceMessages(updatedMessages);
            }
            
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
      },
      { 
        timeout: 60000, // 60s timeout
        operationName: 'sendMessage'
      }
    );
  }, [
    currentSession, // 🔥 Ajouté - sinon closure stale
    selectedAgent,
    llmContext,
    sendMessageFn,
    addInfiniteMessage,
    requireAuth,
    onBeforeSend,
    replaceMessages
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
    options: {
      messageId: string;
      newContent: string;
      images?: ImageAttachment[];
      notes?: Note[];
      mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number; created_at?: string }>;
      usedPrompts?: Array<{ id: string; slug: string; name: string; description?: string | null; context?: 'editor' | 'chat' | 'both'; agent_id?: string | null }>;
      messageIndex?: number;
    }
  ) => {
    const { messageId, newContent, images, notes, mentions, usedPrompts, messageIndex } = options;
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

    const historySnapshot = messagesRef.current;

    try {

      // 1. Éditer via service (delete cascade + add nouveau message)
      const editResult = await chatMessageEditService.edit({
        messageId,
        newContent,
        images,
        sessionId: currentSession.id,
        currentSession,
        infiniteMessages: historySnapshot,
        selectedAgent,
        llmContext,
        messageIndex
      });

      if (!editResult.success) {
        throw new Error(editResult.error || 'Erreur édition message');
      }

      if (typeof editResult.editedSequence !== 'number') {
        throw new Error('Sequence du message édité introuvable');
      }

      const { deletedCount, editedSequence } = editResult;

      logger.dev('[useChatMessageActions] ✅ Messages supprimés (incluant message édité):', {
        deletedCount,
        editedSequence,
        newContentPreview: newContent.substring(0, 50)
      });

      // 2. Annuler le mode édition IMMÉDIATEMENT
      onEditingChange?.(false);

      const preservedMessages = historySnapshot.filter(msg => {
        const sequence = typeof msg.sequence_number === 'number' ? msg.sequence_number : null;
        if (sequence === null) {
          return false;
        }
        return sequence < editedSequence;
      });

      // ⚠️ Si rien à préserver, on part d'une base vide (scénario message initial)
      messagesRef.current = preservedMessages;
      replaceMessages(preservedMessages);

      // 3. Reload messages depuis DB (avec marge pour récupérer l'intégralité de la branche restante)
      const reloadLimit = Math.max(initialLoadLimit * 2, preservedMessages.length + initialLoadLimit);
      const reloadedMessages = await fetchRecentMessages(currentSession.id, reloadLimit);

      const merged = sortMessagesChronologically(
        mergeMessagesByIdentity(preservedMessages, reloadedMessages)
      );

      messagesRef.current = merged;
      replaceMessages(merged);

      logger.dev('[useChatMessageActions] ✅ Messages rechargés, relance génération...');

      // 4. Renvoyer le message édité comme NOUVEAU message
      // ✅ Utilise le flow normal sendMessage qui va :
      //    - Ajouter le message user
      //    - Appeler le LLM
      //    - Gérer la réponse
      await sendMessage(newContent, images, notes, mentions, usedPrompts);

      logger.dev('[useChatMessageActions] ✅ Message édité renvoyé (flow normal)');

    } catch (err) {
      messagesRef.current = historySnapshot;
      replaceMessages(historySnapshot);

      const errorMessage = err instanceof Error ? err.message : 'Erreur édition message';
      setError(errorMessage);
      logger.error('[useChatMessageActions] ❌ Erreur editMessage:', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });

      // En cas d'erreur, annuler l'édition et recharger
      onEditingChange?.(false);

    } finally {
      setIsLoading(false);
    }
  }, [
    currentSession,
    selectedAgent,
    llmContext,
    mergeMessagesByIdentity,
    sortMessagesChronologically,
    fetchRecentMessages,
    sendMessage,
    replaceMessages,
    onEditingChange,
    requireAuth,
    initialLoadLimit
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

