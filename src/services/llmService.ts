import { llmManager } from '@/services/llm';
import { useLLMStore } from '@/store/useLLMStore';
import type { AppContext, ChatMessage } from '@/services/llm/types';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service pour gérer les appels LLM avec le provider sélectionné
 */
export class LLMService {
  private static instance: LLMService;

  constructor() {}

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Envoyer un message au LLM avec le provider actuel
   */
  async sendMessage(
    message: string, 
    context: AppContext, 
    history: ChatMessage[]
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      // Récupérer le provider actuel depuis le store
      const currentProvider = useLLMStore.getState().getCurrentProvider();
      
      logger.dev('[LLM Service] 🚀 Envoi message via:', currentProvider);
      logger.dev('[LLM Service] 📝 Message:', message);
      logger.dev('[LLM Service] 🎯 Contexte:', context);

      // Appeler le LLM via le manager
      const response = await llmManager.call(message, context, history);

      logger.dev('[LLM Service] ✅ Réponse reçue');

      const responseText = typeof response === 'string'
        ? response
        : (response as { content?: string })?.content ?? '';

      return {
        success: true,
        response: responseText
      };

    } catch (error) {
      logger.error('[LLM Service] ❌ Erreur:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Changer de provider
   */
  setProvider(providerId: string): void {
    useLLMStore.getState().setProvider(providerId);
    llmManager.setProvider(providerId);
    logger.dev('[LLM Service] 🔄 Provider changé:', providerId);
  }

  /**
   * Récupérer le provider actuel
   */
  getCurrentProvider(): string {
    return useLLMStore.getState().getCurrentProvider();
  }

  /**
   * Récupérer les providers disponibles
   */
  getAvailableProviders(): string[] {
    return useLLMStore.getState().availableProviders;
  }
}

// Export de l'instance singleton
export const llmService = LLMService.getInstance(); 