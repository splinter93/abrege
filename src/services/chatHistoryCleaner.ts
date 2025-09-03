import { simpleLogger as logger } from '@/utils/logger';
import { ChatMessage } from '@/types/chat';

export interface CleanHistoryOptions {
  maxMessages?: number;
  removeInvalidToolMessages?: boolean;
  removeDuplicateMessages?: boolean;
  removeEmptyMessages?: boolean;
  preserveSystemMessages?: boolean;
  excludeChannels?: Array<'analysis' | 'commentary' | 'final'>;
}

export class ChatHistoryCleaner {
  private static instance: ChatHistoryCleaner;

  static getInstance(): ChatHistoryCleaner {
    if (!ChatHistoryCleaner.instance) {
      ChatHistoryCleaner.instance = new ChatHistoryCleaner();
    }
    return ChatHistoryCleaner.instance;
  }

  /**
   * 🧹 Nettoyer l'historique des messages selon les options
   */
  cleanHistory(
    messages: ChatMessage[],
    options: CleanHistoryOptions = {}
  ): ChatMessage[] {
    const {
      maxMessages = 50,
      removeInvalidToolMessages = true,
      removeDuplicateMessages = true,
      removeEmptyMessages = true,
      preserveSystemMessages = true,
      excludeChannels = ['analysis']
    } = options;

    let cleanedMessages = [...messages];

    // 🔧 Exclure certains canaux (par défaut, on exclut 'analysis')
    if (excludeChannels && excludeChannels.length > 0) {
      cleanedMessages = cleanedMessages.filter(msg => !excludeChannels.includes((msg as any).channel));
    }

    // 🔧 Supprimer les messages tool invalides
    if (removeInvalidToolMessages) {
      cleanedMessages = cleanedMessages.filter(msg => {
        if (msg.role === 'tool') {
          const hasToolCallId = !!(msg as any).tool_call_id;
          const hasName = !!(msg as any).name || !!(msg as any).tool_name;
          const hasContent = !!msg.content;
          
          if (!hasToolCallId || !hasName || !hasContent) {
            logger.warn(`[HistoryCleaner] 🧹 Message tool invalide supprimé:`, {
              hasToolCallId,
              hasName,
              hasContent,
              message: msg
            });
            return false;
          }
        }
        return true;
      });
    }

    // 🔧 Supprimer les messages vides
    if (removeEmptyMessages) {
      cleanedMessages = cleanedMessages.filter(msg => {
        if (msg.role === 'assistant' && msg.content === null && !(msg as any).tool_calls) {
          logger.warn(`[HistoryCleaner] 🧹 Message assistant vide supprimé:`, msg);
          return false;
        }
        if (msg.content === '' || msg.content === undefined) {
          logger.warn(`[HistoryCleaner] 🧹 Message sans contenu supprimé:`, msg);
          return false;
        }
        return true;
      });
    }

    // 🔧 Supprimer les messages dupliqués (même rôle et contenu similaire)
    if (removeDuplicateMessages) {
      cleanedMessages = this.removeDuplicateMessages(cleanedMessages);
    }

    // 🔧 Préserver les messages système si demandé
    if (preserveSystemMessages) {
      const systemMessages = cleanedMessages.filter(msg => msg.role === 'system');
      const nonSystemMessages = cleanedMessages.filter(msg => msg.role !== 'system');
      
      // Appliquer la limite aux messages non-système
      const limitedNonSystem = nonSystemMessages.slice(-maxMessages);
      
      // Recombiner en gardant les messages système au début
      cleanedMessages = [...systemMessages, ...limitedNonSystem];
    } else {
      // Appliquer la limite à tous les messages
      cleanedMessages = cleanedMessages.slice(-maxMessages);
    }

    // 🔧 Trier par timestamp
    cleanedMessages = cleanedMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    logger.info(`[HistoryCleaner] 🧹 Historique nettoyé: ${messages.length} → ${cleanedMessages.length} messages`);

    return cleanedMessages;
  }

  /**
   * 🔧 Supprimer les messages dupliqués
   */
  private removeDuplicateMessages(messages: ChatMessage[]): ChatMessage[] {
    const seen = new Set<string>();
    const result: ChatMessage[] = [];

    for (const msg of messages) {
      // Créer une clé unique pour chaque message
      const key = this.createMessageKey(msg);
      
      if (!seen.has(key)) {
        seen.add(key);
        result.push(msg);
      } else {
        logger.warn(`[HistoryCleaner] 🧹 Message dupliqué supprimé:`, msg);
      }
    }

    return result;
  }

  /**
   * 🔧 Créer une clé unique pour un message
   */
  private createMessageKey(msg: ChatMessage): string {
    const content = msg.content || '';
    const toolCalls = (msg as any).tool_calls ? JSON.stringify((msg as any).tool_calls) : '';
    const toolCallId = (msg as any).tool_call_id || '';
    const name = (msg as any).name || '';
    
    return `${msg.role}-${content.substring(0, 100)}-${toolCalls}-${toolCallId}-${name}`;
  }

  /**
   * 🔧 Valider la cohérence des tool calls
   */
  validateToolCallConsistency(messages: ChatMessage[]): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const toolCallIds = new Set<string>();
    const toolResults = new Map<string, ChatMessage>();

    // Collecter tous les tool call IDs et résultats
    for (const msg of messages) {
      if (msg.role === 'assistant' && (msg as any).tool_calls) {
        for (const toolCall of (msg as any).tool_calls) {
          toolCallIds.add(toolCall.id);
        }
      }
      
      if (msg.role === 'tool' && (msg as any).tool_call_id) {
        toolResults.set((msg as any).tool_call_id, msg);
      }
    }

    // Vérifier que chaque tool call a un résultat
    for (const toolCallId of toolCallIds) {
      if (!toolResults.has(toolCallId)) {
        issues.push(`Tool call ${toolCallId} n'a pas de résultat`);
      }
    }

    // Vérifier que chaque résultat correspond à un tool call
    for (const [toolCallId, toolMsg] of toolResults) {
      if (!toolCallIds.has(toolCallId)) {
        issues.push(`Résultat tool ${toolCallId} n'a pas de tool call correspondant`);
      }
      
      if (!(toolMsg as any).name) {
        issues.push(`Message tool ${toolCallId} n'a pas de nom`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 🔧 Obtenir des statistiques sur l'historique
   */
  getHistoryStats(messages: ChatMessage[]): {
    total: number;
    byRole: Record<string, number>;
    toolCalls: number;
    toolResults: number;
    averageLength: number;
  } {
    const byRole: Record<string, number> = {};
    let toolCalls = 0;
    let toolResults = 0;
    let totalLength = 0;

    for (const msg of messages) {
      byRole[msg.role] = (byRole[msg.role] || 0) + 1;
      
      if (msg.role === 'assistant' && (msg as any).tool_calls) {
        toolCalls += (msg as any).tool_calls.length;
      }
      
      if (msg.role === 'tool') {
        toolResults++;
      }
      
      if (msg.content) {
        totalLength += msg.content.length;
      }
    }

    return {
      total: messages.length,
      byRole,
      toolCalls,
      toolResults,
      averageLength: messages.length > 0 ? Math.round(totalLength / messages.length) : 0
    };
  }
} 