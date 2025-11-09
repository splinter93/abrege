/**
 * Service pour l'édition de messages chat
 * Extrait de ChatFullscreenV2.tsx (handleEditSubmit)
 * 
 * Responsabilités:
 * - Trouver message à éditer
 * - DELETE cascade (message édité + tous ceux après)
 * - Retourner token pour relance flow normal
 */

import { tokenManager } from '@/utils/tokenManager';
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
  messageIndex?: number;
}

/**
 * Résultat de l'édition d'un message
 */
export interface EditMessageResult {
  success: boolean;
  deletedCount?: number;
  token?: string;
  editedSequence?: number;
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
   * Édite un message (delete cascade uniquement)
   * 
   * Flow atomique:
   * 1. Trouver message édité dans infiniteMessages
   * 2. Récupérer token auth
   * 3. DELETE cascade (message édité + tous ceux après)
   * 
   * Note: L'appelant doit ensuite reload + renvoyer le message via flow normal
   * 
   * @param options - Options d'édition
   * @returns Résultat avec deletedCount et token
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
      llmContext,
      messageIndex
    } = options;

    try {
      // 1. Trouver le message édité
      const editedMessage = this.findEditedMessage(messageId, infiniteMessages, messageIndex);
      
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

      // 3. Supprimer le message édité ET tous ceux après
      // ✅ afterSequence = sequence - 1 pour INCLURE le message édité
      const deleteResult = await this.deleteMessagesAfter(
        sessionId,
        editedMessage.sequence_number - 1,
        token
      );

      logger.dev('[ChatMessageEditService] 🗑️ Messages supprimés (incluant le message édité):', {
        deletedCount: deleteResult.deletedCount,
        afterSequence: editedMessage.sequence_number - 1,
        originalSequence: editedMessage.sequence_number
      });

      return {
        success: true,
        deletedCount: deleteResult.deletedCount,
        token,
        editedSequence: editedMessage.sequence_number
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
    messages: ChatMessage[],
    messageIndex?: number
  ): ChatMessage | null {
    if (
      typeof messageIndex === 'number' &&
      messageIndex >= 0 &&
      messageIndex < messages.length
    ) {
      const candidate = messages[messageIndex];
      if (candidate) {
        if (candidate.id === messageId) {
          return candidate;
        }
        if (!candidate.id && candidate.role === 'user' && candidate.content) {
          logger.dev('[ChatMessageEditService] ℹ️ Message index mismatch, fallback à recherche ID', {
            expectedMessageId: messageId,
            candidateContentPreview: candidate.content.substring(0, 50)
          });
        }
      }
    }

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

    if (!message) {
      logger.error('[ChatMessageEditService] ❌ Impossible de localiser le message à éditer', {
        messageId,
        messageIndex,
        availableIds: messages
          .map((m) => m.id)
          .filter((id): id is string => typeof id === 'string')
          .slice(-10)
      });
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

  // ✅ SUPPRIMÉ: addEditedMessage
  // Le message édité sera ajouté via le flow normal de sendMessage

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

