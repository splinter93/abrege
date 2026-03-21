import { simpleLogger as logger } from '@/utils/logger';
import type { ChatMessage, AssistantMessage } from '@/types/chat';
import type { ToolCall, ToolResult } from '../types/agentTypes';
import { HistoryManager } from '@/services/chat/HistoryManager';

/**
 * Persiste les messages finaux côté serveur via HistoryManager (SERVICE_ROLE, atomique).
 * Ne passe plus par chatSessionService.addMessageWithToken (stub supprimé).
 */
export class FinalMessagePersistenceService {
  private sessionId: string;

  /**
   * @param _userToken — conservé pour compatibilité d’API ; la persistance utilise le service role.
   */
  constructor(sessionId: string, _userToken: string) {
    this.sessionId = sessionId;
  }

  /**
   * Persiste le message utilisateur initial et la réponse finale de l'assistant.
   */
  async persistFinalMessages(
    userMessageContent: string,
    assistantResponse: {
      content: string;
      reasoning?: string;
      tool_calls?: ToolCall[];
      tool_results?: ToolResult[];
    }
  ): Promise<void> {
    logger.dev('[FinalMessagePersistence] 🚀 Persistance des messages finaux...');

    try {
      const userMessage: Omit<ChatMessage, 'id'> = {
        role: 'user',
        content: userMessageContent,
        timestamp: new Date().toISOString(),
      };
      await this.persistMessage(userMessage);
      logger.dev('[FinalMessagePersistence] ✅ Message utilisateur persisté');

      const assistantMessage: AssistantMessage = {
        role: 'assistant',
        content: assistantResponse.content || '',
        reasoning: assistantResponse.reasoning,
        tool_calls: assistantResponse.tool_calls,
        tool_results: assistantResponse.tool_results,
        timestamp: new Date().toISOString(),
        name: 'assistant',
      };
      await this.persistMessage(assistantMessage as Omit<ChatMessage, 'id'>);
      logger.info(
        `[FinalMessagePersistence] ✅ Réponse assistant persistée (contenu: ${assistantMessage.content?.length || 0} chars)`
      );
    } catch (error) {
      logger.error(
        '[FinalMessagePersistence] ❌ Erreur lors de la persistance des messages finaux',
        error
      );
      // Ne pas throw pour ne pas casser le flow principal
    }
  }

  private async persistMessage(message: Omit<ChatMessage, 'id'>): Promise<void> {
    const historyManager = HistoryManager.getInstance();
    const { timestamp: _ts, sequence_number: _sn, ...forDb } = message as ChatMessage;
    await historyManager.addMessage(
      this.sessionId,
      forDb as Parameters<HistoryManager['addMessage']>[1]
    );
  }
}
