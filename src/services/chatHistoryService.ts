import type { ChatMessage, HistoryConfig, ProcessedHistory, SynesiaPayload } from '@/types/chat';

/**
 * Service pour gérer l'historique des messages de chat
 */
export class ChatHistoryService {
  private static instance: ChatHistoryService;

  static getInstance(): ChatHistoryService {
    if (!ChatHistoryService.instance) {
      ChatHistoryService.instance = new ChatHistoryService();
    }
    return ChatHistoryService.instance;
  }

  /**
   * Traite l'historique des messages selon la configuration
   */
  processHistory(
    messages: ChatMessage[],
    config: HistoryConfig
  ): ProcessedHistory {
    const { maxMessages, includeSystemMessages = true, truncateStrategy = 'keep_latest', excludeChannels = ['analysis'] } = config as HistoryConfig & { excludeChannels?: ('analysis'|'commentary'|'final')[] };
    
    let processedMessages = [...messages];

    // Exclure certains canaux (par défaut, on exclut 'analysis')
    if (excludeChannels && excludeChannels.length > 0) {
      processedMessages = processedMessages.filter(msg => {
        const extMsg = msg as { channel?: 'analysis' | 'commentary' | 'final' };
        return !extMsg.channel || !excludeChannels.includes(extMsg.channel);
      });
    }

    // Filtrer les messages système si nécessaire
    if (!includeSystemMessages) {
      processedMessages = processedMessages.filter(msg => msg.role !== 'system');
    }

    const totalMessages = processedMessages.length;
    let truncatedMessages = 0;

    // Appliquer la stratégie de troncature
    if (processedMessages.length > maxMessages) {
      truncatedMessages = processedMessages.length - maxMessages;
      
      switch (truncateStrategy) {
        case 'keep_latest':
          processedMessages = processedMessages.slice(-maxMessages);
          break;
          
        case 'keep_oldest':
          processedMessages = processedMessages.slice(0, maxMessages);
          break;
          
        case 'keep_middle':
          const startIndex = Math.floor((processedMessages.length - maxMessages) / 2);
          processedMessages = processedMessages.slice(startIndex, startIndex + maxMessages);
          break;
      }
    }

    return {
      messages: processedMessages,
      totalMessages,
      truncatedMessages,
      historyLimit: maxMessages
    };
  }

  /**
   * Convertit les messages pour l'API Synesia
   */
  formatForSynesia(
    messages: ChatMessage[],
    currentMessage: string,
    historyLimit: number = 10
  ): SynesiaPayload {
    // Traiter l'historique
    const processed = this.processHistory(messages, {
      maxMessages: historyLimit,
      includeSystemMessages: false,
      truncateStrategy: 'keep_latest'
    });

    // Convertir en format Synesia (filtrer les messages système)
    const historyMessages = processed.messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

    return {
      callable_id: "a62f3fb5-17ee-488c-b775-b57fc89c617e",
      args: currentMessage,
      settings: {
        history_messages: historyMessages,
        history_limit: historyLimit
      }
    };
  }

  /**
   * Génère un résumé de l'historique pour l'utilisateur
   */
  generateHistorySummary(processed: ProcessedHistory): string {
    const { totalMessages, truncatedMessages, historyLimit } = processed;
    
    if (truncatedMessages === 0) {
      return `Historique complet (${totalMessages} messages)`;
    }
    
    return `Historique tronqué: ${historyLimit} derniers messages sur ${totalMessages} (${truncatedMessages} messages supprimés)`;
  }

  /**
   * Calcule la taille optimale de l'historique selon le contexte
   */
  calculateOptimalHistoryLimit(
    messageCount: number,
    contextComplexity: 'low' | 'medium' | 'high' = 'medium'
  ): number {
    const baseLimits = {
      low: 5,
      medium: 10,
      high: 20
    };

    const baseLimit = baseLimits[contextComplexity];
    
    // Ajuster selon le nombre de messages
    if (messageCount < baseLimit) {
      return Math.max(3, messageCount);
    }
    
    return baseLimit;
  }

  /**
   * Analyse la complexité du contexte pour optimiser l'historique
   */
  analyzeContextComplexity(messages: ChatMessage[]): 'low' | 'medium' | 'high' {
    if (messages.length === 0) return 'low';
    
    const recentMessages = messages.slice(-5);
    const totalLength = recentMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    const avgLength = totalLength / recentMessages.length;
    
    // Critères de complexité
    const hasCodeBlocks = recentMessages.some(msg => msg.content.includes('```'));
    const hasLongMessages = avgLength > 500;
    const hasTechnicalTerms = recentMessages.some(msg => 
      /function|class|api|database|server|client/i.test(msg.content)
    );
    
    if (hasCodeBlocks || hasLongMessages || hasTechnicalTerms) {
      return 'high';
    } else if (avgLength > 200) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}

// Export de l'instance singleton
export const chatHistoryService = ChatHistoryService.getInstance(); 