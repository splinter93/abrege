import type { ChatMessage } from '@/types/chat';
import type { GroqLimits } from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service simple pour la construction de l'historique Groq
 * 
 * Ce service fait juste ce qui est nécessaire :
 * - Construire l'historique initial (system + history + user message)
 * - Nettoyer les noms de tools des suffixes de channels legacy
 * - Limiter la taille de l'historique selon les limits Groq
 */
export class GroqHistoryBuilder {
  private limits: GroqLimits;

  constructor(limits: GroqLimits) {
    this.limits = limits;
  }

  /**
   * Construit l'historique pour l'appel au LLM
   */
  buildInitialHistory(
    systemContent: string,
    userMessage: string,
    cleanedHistory: ChatMessage[]
  ): ChatMessage[] {
    const cleanedMessages = this.cleanHistory(cleanedHistory);
    const messages: ChatMessage[] = [];

    // 1. Message système (si présent)
    if (systemContent && systemContent.trim().length > 0) {
      messages.push({
        id: `msg-system-${Date.now()}`,
        role: 'system',
        content: systemContent,
        timestamp: new Date().toISOString()
      });
    }

    // 2. Historique nettoyé et limité
    const contextMessages = cleanedMessages.slice(-this.limits.maxContextMessages);
    messages.push(...contextMessages);

    // 3. Message utilisateur
    messages.push({
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    logger.dev(`[GroqHistoryBuilder] ✅ Historique construit: ${messages.length} messages`);
    return messages;
  }

  /**
   * Nettoie l'historique :
   * - Supprime les suffixes de channels dans les noms de tools
   * - Garde tous les messages importants
   */
  private cleanHistory(history: ChatMessage[]): ChatMessage[] {
    return history.map(msg => this.cleanToolNames(msg));
  }

  /**
   * Nettoie les noms de tools qui contiennent des suffixes de channels
   * Ex: "toolName<|channel|>commentary" -> "toolName"
   */
  private cleanToolNames(msg: ChatMessage): ChatMessage {
    const cleaned = { ...msg };
    
    // Nettoyer les tool_calls des messages assistant
    if (cleaned.tool_calls && Array.isArray(cleaned.tool_calls)) {
      cleaned.tool_calls = cleaned.tool_calls.map(tc => ({
        ...tc,
        function: {
          ...tc.function,
          name: this.stripChannelSuffix(tc.function.name)
        }
      }));
    }
    
    // Nettoyer le nom des messages tool
    if (cleaned.role === 'tool' && cleaned.name) {
      cleaned.name = this.stripChannelSuffix(cleaned.name);
    }
    
    return cleaned;
  }

  /**
   * Supprime le suffixe de channel d'un nom de tool
   * Ex: "toolName<|channel|>commentary" -> "toolName"
   */
  private stripChannelSuffix(toolName: string): string {
    return toolName.replace(/<\|channel\|>[a-z]+$/i, '');
  }
}
