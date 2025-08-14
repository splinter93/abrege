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
    // 🔒 ISOLATION : Marquer tous les messages avec le timestamp actuel
    const timestamp = new Date().toISOString();
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemContent, timestamp },
      ...cleanedHistory.slice(-this.limits.maxContextMessages).map(msg => ({
        ...msg,
        timestamp: msg.timestamp || timestamp // Assurer un timestamp pour tous les messages
      })) as ChatMessage[],
      { role: 'user', content: userMessage, timestamp }
    ];

    logger.info(`[GroqHistoryBuilder] 🔒 Historique initial construit: ${messages.length} messages avec isolation temporelle`);
    return messages;
  }

  /**
   * Construit l'historique pour le second appel (après exécution des tools)
   */
  buildSecondCallHistory(context: HistoryBuildContext): HistoryBuildResult {
    const { systemContent, userMessage, cleanedHistory, toolCalls, toolResults } = context;
    const validationErrors: string[] = [];

    // 1. Message système
    const systemMessage: ChatMessage = {
      role: 'system',
      content: systemContent,
      timestamp: new Date().toISOString()
    };

    // 2. Contexte de conversation
    const contextMessages = cleanedHistory.slice(-this.limits.maxContextMessages);
    // 3. Créer la base de messages
    const baseMessages: ChatMessage[] = [systemMessage, ...contextMessages];
    // 4. Injecter le message utilisateur si non vide
    if (userMessage && userMessage.trim().length > 0) {
      baseMessages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      });
    }
    // 5. Message assistant avec tool calls
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: null, // Le contenu peut être null
      tool_calls: toolCalls,
      timestamp: new Date().toISOString()
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
      .filter(result => this.validateToolResult(result, validationErrors))
      .map(result => ({
        role: 'tool' as const,
        tool_call_id: result.tool_call_id,
        name: result.name,
        content: JSON.stringify(result.result),
        timestamp: result.timestamp
      }));
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
   * Insère les messages tool après le message assistant
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
      logger.dev(`[GroqHistoryBuilder] 🔧 Messages tool insérés à l'index ${assistantIndex + 1}`);
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