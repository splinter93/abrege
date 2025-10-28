/**
 * Service pour l'édition de messages chat
 * Extrait de ChatFullscreenV2.tsx (handleEditSubmit)
 * 
 * Responsabilités:
 * - Trouver message à éditer
 * - DELETE cascade (messages après)
 * - Ajouter message édité
 * - Préparation contexte pour régénération LLM
 */

import { tokenManager } from '@/utils/tokenManager';
import { chatContextBuilder, type Note } from './ChatContextBuilder';
import { sessionSyncService } from '@/services/sessionSyncService';
import type { ChatSession } from '@/store/useChatStore';
import type { Agent, ChatMessage } from '@/types/chat';
import type { ImageAttachment } from '@/types/image';
import type { LLMContext } from '@/hooks/useLLMContext';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Options pour l'édition d'un message
 */
export interface EditMessageOptions {
  messageId: string;
  newContent: string;
  images?: ImageAttachment[];
  sessionId: string;
  currentSession: ChatSession;
  infiniteMessages: ChatMessage[];
  selectedAgent: Agent | null;
  llmContext: LLMContext;
}

/**
 * Résultat de l'édition d'un message
 */
export interface EditMessageResult {
  success: boolean;
  deletedCount?: number;
  savedMessage?: ChatMessage;
  context?: ReturnType<typeof chatContextBuilder.build>;
  token?: string;
  error?: string;
}

/**
 * Erreur de message non trouvé
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Erreur de suppression
 */
export class DeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeleteError';
  }
}

/**
 * Erreur d'authentification
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Service pour gérer l'édition de messages
 */
export class ChatMessageEditService {
  private static instance: ChatMessageEditService;

  private constructor() {}

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): ChatMessageEditService {
    if (!ChatMessageEditService.instance) {
      ChatMessageEditService.instance = new ChatMessageEditService();
    }
    return ChatMessageEditService.instance;
  }

  /**
   * Édite un message avec régénération LLM
   * 
   * Flow atomique:
   * 1. Trouver message édité dans infiniteMessages
   * 2. Récupérer token auth
   * 3. DELETE cascade (route /messages/delete-after)
   * 4. Ajouter nouveau message édité
   * 5. Préparer contexte pour régénération LLM
   * 
   * Note: Le reload des messages et la relance LLM sont à faire
   * par l'appelant après cette méthode.
   * 
   * @param options - Options d'édition
   * @returns Résultat avec message sauvegardé et contexte
   * @throws {NotFoundError} Si message introuvable
   * @throws {AuthError} Si token invalide
   * @throws {DeleteError} Si delete échoue
   */
  async edit(options: EditMessageOptions): Promise<EditMessageResult> {
    const {
      messageId,
      newContent,
      images,
      sessionId,
      currentSession,
      infiniteMessages,
      selectedAgent,
      llmContext
    } = options;

    try {
      // 1. Trouver le message édité
      const editedMessage = this.findEditedMessage(messageId, infiniteMessages);
      
      if (!editedMessage || !editedMessage.sequence_number) {
        throw new NotFoundError(`Message ${messageId} non trouvé ou sans sequence_number`);
      }

      logger.dev('[ChatMessageEditService] ✏️ Édition message:', {
        messageId,
        sequenceNumber: editedMessage.sequence_number,
        newContentPreview: newContent.substring(0, 50),
        hasImages: !!(images && images.length > 0)
      });

      // 2. Récupérer token auth
      const tokenResult = await tokenManager.getValidToken();
      if (!tokenResult.isValid || !tokenResult.token) {
        throw new AuthError(tokenResult.error || 'Token non disponible');
      }

      const token = tokenResult.token;

      // 3. Supprimer les messages après le message édité
      const deleteResult = await this.deleteMessagesAfter(
        sessionId,
        editedMessage.sequence_number,
        token
      );

      logger.dev('[ChatMessageEditService] 🗑️ Messages supprimés:', {
        deletedCount: deleteResult.deletedCount,
        afterSequence: editedMessage.sequence_number
      });

      // 4. Ajouter le nouveau message édité
      const savedMessage = await this.addEditedMessage(
        sessionId,
        newContent,
        images
      );

      if (!savedMessage) {
        throw new Error('Erreur sauvegarde message édité');
      }

      logger.dev('[ChatMessageEditService] ✅ Message édité sauvegardé:', {
        newSequenceNumber: savedMessage.sequence_number
      });

      // 5. Préparer contexte pour régénération LLM
      const context = chatContextBuilder.build({
        sessionId,
        agentId: selectedAgent?.id,
        llmContext
      });

      return {
        success: true,
        deletedCount: deleteResult.deletedCount,
        savedMessage,
        context,
        token
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('[ChatMessageEditService] ❌ Erreur édition:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Trouve le message à éditer dans la liste de messages
   * 
   * Cherche par:
   * 1. ID exact
   * 2. Fallback: timestamp dans l'ID (format msg-{timestamp}-)
   * 
   * @param messageId - ID du message
   * @param messages - Liste de messages
   * @returns Message trouvé ou null
   */
  private findEditedMessage(
    messageId: string,
    messages: ChatMessage[]
  ): ChatMessage | null {
    // Chercher par ID exact
    let message = messages.find(m => m.id === messageId);
    
    if (message) {
      return message;
    }

    // Fallback: chercher par timestamp dans l'ID
    if (messageId.match(/^msg-(\d+)-/)) {
      const timestampMatch = messageId.match(/^msg-(\d+)-/);
      if (timestampMatch) {
        const targetTimestamp = parseInt(timestampMatch[1]);
        
        message = messages.find(m => {
          if (m.timestamp) {
            const msgTimestamp = new Date(m.timestamp).getTime();
            return Math.abs(msgTimestamp - targetTimestamp) < 1000 && m.role === 'user';
          }
          return false;
        });
      }
    }

    return message || null;
  }

  /**
   * Supprime les messages après un sequence_number donné
   * 
   * Utilise la route API /messages/delete-after qui fait un DELETE cascade.
   * 
   * @param sessionId - ID de la session
   * @param afterSequence - Sequence number (exclusif)
   * @param token - Token d'authentification
   * @returns Nombre de messages supprimés
   * @throws {DeleteError} Si la suppression échoue
   */
  private async deleteMessagesAfter(
    sessionId: string,
    afterSequence: number,
    token: string
  ): Promise<{ deletedCount: number }> {
    try {
      const response = await fetch(
        `/api/chat/sessions/${sessionId}/messages/delete-after`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            afterSequence
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new DeleteError(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new DeleteError(result.error || 'Delete failed');
      }

      return {
        deletedCount: result.data?.deletedCount || 0
      };

    } catch (error) {
      if (error instanceof DeleteError) {
        throw error;
      }
      throw new DeleteError(
        error instanceof Error ? error.message : 'Erreur suppression messages'
      );
    }
  }

  /**
   * Ajoute le message édité en DB
   * 
   * Utilise sessionSyncService.addMessageAndSync() qui appelle
   * la route API /messages/add (atomique via HistoryManager).
   * 
   * @param sessionId - ID de la session
   * @param content - Nouveau contenu
   * @param images - Images attachées (optionnel)
   * @returns Message sauvegardé
   * @throws {Error} Si la sauvegarde échoue
   */
  private async addEditedMessage(
    sessionId: string,
    content: string,
    images?: ImageAttachment[]
  ): Promise<ChatMessage> {
    // Préparer le message
    const attachedImages = images?.map(img => ({
      url: img.base64,
      fileName: img.fileName
    }));

    const messageToAdd: Omit<ChatMessage, 'id'> = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      ...(attachedImages && attachedImages.length > 0 && { attachedImages })
    };

    // Sauvegarder via sessionSyncService
    const result = await sessionSyncService.addMessageAndSync(sessionId, messageToAdd);

    if (!result.success || !result.message) {
      throw new Error(result.error || 'Erreur sauvegarde message');
    }

    return result.message;
  }

  /**
   * Valide qu'un message peut être édité
   * 
   * Un message peut être édité si:
   * - Il a un ID
   * - Il a un sequence_number
   * - C'est un message user
   * 
   * @param message - Message à valider
   * @returns true si éditable, false sinon
   */
  canEdit(message: ChatMessage): boolean {
    if (!message.id) {
      return false;
    }

    if (!message.sequence_number) {
      return false;
    }

    if (message.role !== 'user') {
      return false;
    }

    return true;
  }
}

/**
 * Instance singleton exportée
 */
export const chatMessageEditService = ChatMessageEditService.getInstance();

