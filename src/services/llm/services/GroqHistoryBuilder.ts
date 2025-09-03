import type { ChatMessage } from '@/types/chat';
import type { HistoryBuildContext, HistoryBuildResult, GroqLimits } from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service responsable de la construction et validation de l'historique pour Groq
 */
export class GroqHistoryBuilder {
  private limits: GroqLimits;

  constructor(limits: GroqLimits) {
    this.limits = limits;
  }

  /**
   * Construit l'historique pour le premier appel au LLM
   */
  buildInitialHistory(
    systemContent: string,
    userMessage: string,
    cleanedHistory: ChatMessage[]
  ): ChatMessage[] {
    const historyWithoutOldCoTs = this.purgeOldCoTs(cleanedHistory);

    const messages: ChatMessage[] = [];

    // 1. Message système (uniquement si contenu non vide) — pas de channel pour system
    if (systemContent && systemContent.trim().length > 0) {
      messages.push({
        id: `msg-system-${Date.now()}`,
        role: 'system',
        content: systemContent,
        timestamp: new Date().toISOString()
      });
    }

    // 2. Historique sans CoT, borné
    const contextMessages = historyWithoutOldCoTs.slice(-this.limits.maxContextMessages);
    messages.push(...contextMessages);

    // 3. Message utilisateur — pas de channel pour user
    messages.push({
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    logger.dev?.(`[GroqHistoryBuilder] 🔧 Historique initial construit: ${messages.length} messages`);
    return messages;
  }

  /**
   * Construit l'historique pour le second appel (après exécution des tools)
   */
  buildSecondCallHistory(context: HistoryBuildContext): HistoryBuildResult {
    const { systemContent, userMessage, cleanedHistory, toolCalls, toolResults } = context;
    const historyWithoutOldCoTs = this.purgeOldCoTs(cleanedHistory);
    const validationErrors: string[] = [];

    // 1. Message système (optionnel si vide) — pas de channel pour system
    const baseMessages: ChatMessage[] = [];
    if (systemContent && systemContent.trim().length > 0) {
      const systemMessage: ChatMessage = {
        id: `msg-system-${Date.now()}`,
        role: 'system',
        content: systemContent,
        timestamp: new Date().toISOString()
      };
      baseMessages.push(systemMessage);
    }

    // 2. Contexte de conversation (sans CoT), borné
    const contextMessages = historyWithoutOldCoTs.slice(-this.limits.maxContextMessages);
    baseMessages.push(...contextMessages);

    // 3. Injecter le message utilisateur si non vide — pas de channel pour user
    if (userMessage && userMessage.trim().length > 0) {
      baseMessages.push({
        id: `msg-user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      });
    }
    // 5. Message assistant avec tool calls
    const assistantMessage: ChatMessage = {
      id: `msg-assistant-${Date.now()}`,
      role: 'assistant',
      content: null, // Le contenu peut être null
      tool_calls: toolCalls,
      timestamp: new Date().toISOString(),
      channel: 'commentary'
    };
    // 6. Construire les messages tool
    const toolMessages = this.buildToolMessages(toolResults, validationErrors);
    
    // 7. Assembler l'historique final
    const finalMessages = this.insertToolMessages([...baseMessages, assistantMessage], toolMessages);

    // 7. Validation finale
    const isValid = validationErrors.length === 0;
    if (!isValid) {
      logger.warn('[GroqHistoryBuilder] ⚠️ Erreurs de validation détectées:', validationErrors);
    }

    return {
      messages: finalMessages,
      validationErrors,
      isValid
    };
  }

  /**
   * Construit les messages tool à partir des résultats
   */
  private buildToolMessages(toolResults: any[], validationErrors: string[]): ChatMessage[] {
    return toolResults
      .map(toolResult => {
        const toolCallId = toolResult.tool_call_id;
        const toolName = toolResult.tool_name || toolResult.name;
        const payload = toolResult.details !== undefined ? toolResult.details : toolResult.result;

        if (!toolCallId || !toolName || payload === undefined) {
          validationErrors.push(`Résultat d'outil invalide: ${JSON.stringify(toolResult)}`);
          return null;
        }

        return {
          id: `msg-tool-${toolCallId}`,
          role: 'tool',
          tool_call_id: toolCallId,
          name: toolName,
          content: typeof payload === 'string' ? payload : JSON.stringify(payload),
          timestamp: toolResult.timestamp
        } as ChatMessage;
      })
      .filter((msg): msg is ChatMessage => msg !== null);
  }

  /**
   * Purge les anciens messages de CoT (canal 'analysis') de l'historique.
   * C'est une optimisation clé pour GPT-OSS.
   */
  private purgeOldCoTs(history: ChatMessage[]): ChatMessage[] {
    const purgedHistory = history.filter(msg => msg.channel !== 'analysis');
    const removedCount = history.length - purgedHistory.length;
    if (removedCount > 0) {
      logger.dev?.(`[GroqHistoryBuilder] 🧹 ${removedCount} message(s) CoT ('analysis') purgé(s) de l'historique`);
    }
    return purgedHistory;
  }

  /**
   * Valide un résultat de tool
   */
  private validateToolResult(result: any, validationErrors: string[]): boolean {
    if (!result.tool_call_id || typeof result.tool_call_id !== 'string') {
      validationErrors.push(`Tool result sans tool_call_id valide: ${JSON.stringify(result)}`);
      return false;
    }

    if (!result.name || typeof result.name !== 'string') {
      validationErrors.push(`Tool result sans nom valide: ${JSON.stringify(result)}`);
      return false;
    }

    return true;
  }

  /**
   * Insère les messages tool après le message assistant correspondant
   */
  private insertToolMessages(baseMessages: ChatMessage[], toolMessages: ChatMessage[]): ChatMessage[] {
    if (toolMessages.length === 0) {
      return baseMessages;
    }

    const finalMessages = [...baseMessages];
    
    // Trouver l'index du message assistant avec tool_calls
    const assistantIndex = finalMessages.findIndex(msg => 
      msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0
    );
    
    if (assistantIndex !== -1) {
      // Insérer les messages tool juste après
      finalMessages.splice(assistantIndex + 1, 0, ...toolMessages);
      logger.dev?.(`[GroqHistoryBuilder] 🔧 Messages tool insérés à l'index ${assistantIndex + 1}`);
    } else {
      // Fallback: ajouter à la fin
      finalMessages.push(...toolMessages);
      logger.warn(`[GroqHistoryBuilder] ⚠️ Message assistant avec tool_calls non trouvé, messages tool ajoutés à la fin`);
    }

    return finalMessages;
  }

  /**
   * Valide les messages finaux avant envoi à l'API
   */
  validateMessages(messages: ChatMessage[]): HistoryBuildResult {
    const validationErrors: string[] = [];
    const validatedMessages: ChatMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (!this.validateMessage(msg, i, validationErrors)) {
        continue;
      }
      
      validatedMessages.push(msg);
    }

    const isValid = validationErrors.length === 0;
    
    if (!isValid) {
      logger.warn(`[GroqHistoryBuilder] ⚠️ Validation des messages échouée:`, {
        originalCount: messages.length,
        validatedCount: validatedMessages.length,
        errors: validationErrors
      });
    }

    return {
      messages: validatedMessages,
      validationErrors,
      isValid
    };
  }

  /**
   * Valide un message individuel
   */
  private validateMessage(msg: any, index: number, validationErrors: string[]): boolean {
    if (!msg || typeof msg !== 'object') {
      validationErrors.push(`Message invalide à l'index ${index}: ${JSON.stringify(msg)}`);
      return false;
    }

    if (!msg.role || typeof msg.role !== 'string') {
      validationErrors.push(`Message sans role valide à l'index ${index}: ${JSON.stringify(msg)}`);
      return false;
    }

    // Validation spéciale pour les messages tool
    if (msg.role === 'tool') {
      if (!msg.tool_call_id || typeof msg.tool_call_id !== 'string') {
        validationErrors.push(`Message tool sans tool_call_id valide à l'index ${index}`);
        return false;
      }
      if (!msg.name || typeof msg.name !== 'string') {
        validationErrors.push(`Message tool sans nom valide à l'index ${index}`);
        return false;
      }
      if (!msg.content || typeof msg.content !== 'string') {
        validationErrors.push(`Message tool sans contenu valide à l'index ${index}`);
        return false;
      }
    }

    return true;
  }
}