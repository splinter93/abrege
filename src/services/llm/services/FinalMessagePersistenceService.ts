import { simpleLogger as logger } from '@/utils/logger';
import type { ChatMessage } from '@/types/chat';

/**
 * Service pour persister les messages finaux (utilisateur et assistant) à la fin d'un round.
 * S'assure que le contexte complet de la conversation est sauvegardé.
 */
export class FinalMessagePersistenceService {
  private sessionId: string;
  private userToken: string;

  constructor(sessionId: string, userToken: string) {
    this.sessionId = sessionId;
    this.userToken = userToken;
  }

  /**
   * Persiste le message utilisateur initial et la réponse finale de l'assistant.
   */
  async persistFinalMessages(
    userMessageContent: string,
    assistantResponse: {
      content: string;
      reasoning?: string;
      tool_calls?: any[];
      tool_results?: any[];
    }
  ): Promise<void> {
    logger.dev('[FinalMessagePersistence] 🚀 Persistance des messages finaux...');

    try {
      // 1. Persister le message utilisateur
      const userMessage: Omit<ChatMessage, 'id'> = {
        role: 'user',
        content: userMessageContent,
        timestamp: new Date().toISOString(),
      };
      await this.persistMessage(userMessage);
      logger.dev('[FinalMessagePersistence] ✅ Message utilisateur persisté');

      // 2. Persister la réponse de l'assistant
      const assistantMessage: Omit<ChatMessage, 'id'> = {
        role: 'assistant',
        content: assistantResponse.content,
        reasoning: assistantResponse.reasoning,
        tool_calls: assistantResponse.tool_calls,
        tool_results: assistantResponse.tool_results,
        timestamp: new Date().toISOString(),
      };
      await this.persistMessage(assistantMessage);
      logger.info(`[FinalMessagePersistence] ✅ Réponse assistant persistée (contenu: ${assistantMessage.content?.length || 0} chars)`);

    } catch (error) {
      logger.error('[FinalMessagePersistence] ❌ Erreur lors de la persistance des messages finaux', error);
      // Ne pas throw pour ne pas casser le flow principal
    }
  }

  /**
   * Méthode générique pour persister un message via l'API interne.
   */
  private async persistMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    try {
      const { chatSessionService } = await import('../../chatSessionService');
      
      const result = await chatSessionService.addMessageWithToken(this.sessionId, message, this.userToken);

      if (!result.success) {
        logger.warn(`[FinalMessagePersistence] ⚠️ Échec de la persistance du message (${message.role})`, { error: result.error });
      }
    } catch (error) {
      logger.error(`[FinalMessagePersistence] ❌ Erreur API lors de la persistance du message (${message.role})`, error);
      throw error; // Lancer pour que le bloc appelant puisse gérer
    }
  }
}



