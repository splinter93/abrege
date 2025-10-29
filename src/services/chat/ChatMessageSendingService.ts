/**
 * Service pour l'envoi de messages chat
 * Extrait de ChatFullscreenV2.tsx (handleSendMessageInternal)
 * 
 * Responsabilités:
 * - Validation message (texte/images)
 * - Création message temporaire (optimistic UI)
 * - Persistence en DB (background)
 * - Construction historique LLM limité
 * - Gestion token auth
 */

import { tokenManager } from '@/utils/tokenManager';
import { chatContextBuilder, type Note } from './ChatContextBuilder';
import type { ChatSession } from '@/store/useChatStore';
import type { Agent, ChatMessage } from '@/types/chat';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { LLMContext } from '@/hooks/useLLMContext';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Options pour l'envoi d'un message
 */
export interface SendMessageOptions {
  message: string | MessageContent;
  images?: ImageAttachment[];
  notes?: Note[];
  sessionId: string;
  currentSession: ChatSession;
  selectedAgent: Agent | null;
  infiniteMessages: ChatMessage[]; // Utilisé comme fallback si reload DB échoue
  llmContext: LLMContext;
  maxHistoryForLLM?: number;
  reloadHistory?: boolean; // ✅ NOUVEAU: Force reload depuis DB (évite historique stale)
}

/**
 * Résultat de l'envoi d'un message
 */
export interface SendMessageResult {
  success: boolean;
  tempMessage?: ChatMessage;
  limitedHistory?: ChatMessage[];
  context?: ReturnType<typeof chatContextBuilder.build>;
  token?: string;
  error?: string;
}

/**
 * Erreur de validation
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
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
 * Service pour gérer l'envoi de messages
 */
export class ChatMessageSendingService {
  private static instance: ChatMessageSendingService;
  private readonly DEFAULT_MAX_HISTORY = 30;

  private constructor() {}

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): ChatMessageSendingService {
    if (!ChatMessageSendingService.instance) {
      ChatMessageSendingService.instance = new ChatMessageSendingService();
    }
    return ChatMessageSendingService.instance;
  }

  /**
   * Prépare tous les éléments nécessaires pour l'envoi d'un message
   * 
   * Flow:
   * 1. Validation (message non vide)
   * 2. Création message user temporaire (optimistic UI)
   * 3. Construction historique LLM limité
   * 4. Récupération token auth
   * 5. Construction contexte LLM unifié
   * 
   * Note: Cette méthode PRÉPARE seulement. L'appel LLM est fait par l'appelant
   * avec sendMessage() du hook useChatResponse.
   * 
   * @param options - Options d'envoi
   * @returns Résultat avec message temporaire et contexte
   * @throws {ValidationError} Si message invalide
   * @throws {AuthError} Si token invalide
   */
  async prepare(options: SendMessageOptions): Promise<SendMessageResult> {
    const {
      message,
      images,
      notes,
      sessionId,
      selectedAgent,
      infiniteMessages,
      llmContext,
      maxHistoryForLLM = this.DEFAULT_MAX_HISTORY
    } = options;

    try {
      // 1. Validation
      if (!this.validateMessage(message, images)) {
        throw new ValidationError('Message invalide : texte vide et aucune image');
      }

      logger.dev('[ChatMessageSendingService] 📤 Préparation envoi message:', {
        sessionId,
        hasImages: !!(images && images.length > 0),
        imageCount: images?.length || 0,
        hasNotes: !!(notes && notes.length > 0),
        notesCount: notes?.length || 0
      });

      // 2. Créer message temporaire pour optimistic UI
      const tempMessage = this.buildTempUserMessage(message, images);

      // 3. Construire historique limité pour LLM
      const limitedHistory = this.limitHistoryForLLM(infiniteMessages, maxHistoryForLLM);

      logger.dev('[ChatMessageSendingService] 📋 Historique LLM construit:', {
        totalMessages: infiniteMessages.length,
        limitedMessages: limitedHistory.length,
        maxHistory: maxHistoryForLLM,
        roles: limitedHistory.map(m => m.role)
      });

      // 4. Récupérer token auth
      const tokenResult = await tokenManager.getValidToken();
      if (!tokenResult.isValid || !tokenResult.token) {
        throw new AuthError(tokenResult.error || 'Token invalide');
      }

      // 5. Construire contexte LLM unifié
      const context = chatContextBuilder.build({
        sessionId,
        agentId: selectedAgent?.id,
        notes,
        llmContext
      });

      logger.dev('[ChatMessageSendingService] ✅ Préparation terminée');

      return {
        success: true,
        tempMessage,
        limitedHistory,
        context,
        token: tokenResult.token
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('[ChatMessageSendingService] ❌ Erreur préparation:', {
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
   * Valide le message avant envoi
   * 
   * Un message est valide si:
   * - Il contient du texte non-vide, OU
   * - Il contient au moins une image
   * 
   * @param message - Message à valider
   * @param images - Images attachées (optionnel)
   * @returns true si valide, false sinon
   */
  private validateMessage(
    message: string | MessageContent,
    images?: ImageAttachment[]
  ): boolean {
    // Vérifier images
    const hasImages = images && images.length > 0;

    // Vérifier texte
    let hasTextContent = false;
    if (typeof message === 'string') {
      hasTextContent = message.trim().length > 0;
    } else if (Array.isArray(message)) {
      // MessageContent = array de parts
      const textPart = message.find(part => part.type === 'text');
      hasTextContent = !!(textPart && 'text' in textPart && textPart.text.trim().length > 0);
    }

    return hasTextContent || hasImages;
  }

  /**
   * Construit le message user temporaire (optimistic UI)
   * 
   * Le message temporaire est affiché immédiatement pendant
   * que la sauvegarde DB se fait en background.
   * 
   * ✅ FIX: Utilise timestamp +1s dans le futur pour garantir
   * qu'il sera TOUJOURS le dernier lors du tri, même après un reload DB
   * 
   * @param message - Contenu du message
   * @param images - Images attachées (optionnel)
   * @returns Message temporaire
   */
  private buildTempUserMessage(
    message: string | MessageContent,
    images?: ImageAttachment[]
  ): ChatMessage {
    // Extraire le texte pour la sauvegarde
    const messageText = typeof message === 'string'
      ? message
      : (message.find((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')?.text || '');

    // Extraire les images si présentes
    const attachedImages = images?.map(img => ({
      url: img.base64,
      fileName: img.fileName
    }));

    // ✅ FIX SACCADE: Timestamp +1s dans le futur
    // Garantit que le message temp sera APRÈS tous les messages DB lors du tri
    const futureTimestamp = new Date(Date.now() + 1000).toISOString();

    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: futureTimestamp,
      sequence_number: 999999, // Temporaire, sera remplacé par la vraie valeur en DB
      ...(attachedImages && attachedImages.length > 0 && { attachedImages })
    };

    return tempMessage;
  }

  /**
   * Limite l'historique pour contexte LLM
   * 
   * Prend les N derniers messages pour éviter de surcharger
   * le contexte LLM avec trop d'historique.
   * 
   * @param messages - Tous les messages
   * @param maxHistory - Nombre maximum de messages
   * @returns Messages limités (les N derniers)
   */
  private limitHistoryForLLM(
    messages: ChatMessage[],
    maxHistory: number
  ): ChatMessage[] {
    if (messages.length <= maxHistory) {
      return messages;
    }

    // Prendre les N derniers messages
    return messages.slice(-maxHistory);
  }

  /**
   * Extrait le texte d'un message (helper)
   * 
   * @param message - Message (string ou MessageContent)
   * @returns Texte extrait
   */
  extractText(message: string | MessageContent): string {
    if (typeof message === 'string') {
      return message;
    }

    const textPart = message.find(part => part.type === 'text');
    return textPart && 'text' in textPart ? textPart.text : '';
  }

  /**
   * Compte le nombre d'images dans un message (helper)
   * 
   * @param message - Message (string ou MessageContent)
   * @returns Nombre d'images
   */
  countImages(message: string | MessageContent): number {
    if (typeof message === 'string') {
      return 0;
    }

    return message.filter(part => part.type === 'image_url').length;
  }
}

/**
 * Instance singleton exportée
 */
export const chatMessageSendingService = ChatMessageSendingService.getInstance();

