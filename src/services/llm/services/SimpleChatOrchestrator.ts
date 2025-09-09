/**
 * SimpleChatOrchestrator - Orchestrateur de chat simple et intelligent
 * Style ChatGPT : LLM → tools → relance → réponse finale
 */

import { GroqHarmonyProvider } from '../providers/implementations/groqHarmony';
import { SimpleToolExecutor, ToolCall, ToolResult } from './SimpleToolExecutor';
import { simpleLogger as logger } from '@/utils/logger';
import { ChatMessage } from '@/types/chat';
import { HarmonyMessage } from '../types/harmonyTypes';
import { systemMessageBuilder, SystemMessageContext } from '../SystemMessageBuilder';

// ChatMessage est maintenant importé depuis @/types/chat

export interface ChatContext {
  userToken: string;
  sessionId: string;
  agentConfig?: any;
  maxRetries?: number;
  maxToolCalls?: number;
}

export interface ChatResponse {
  success: boolean;
  content: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  reasoning?: string;
  error?: string;
}

/**
 * Orchestrateur de chat simple et intelligent
 * Gère automatiquement les tool calls et les relances
 */
export class SimpleChatOrchestrator {
  private llmProvider: GroqHarmonyProvider;
  private toolExecutor: SimpleToolExecutor;

  constructor() {
    this.llmProvider = new GroqHarmonyProvider();
    this.toolExecutor = new SimpleToolExecutor();
  }

  /**
   * Traiter un message de chat avec tools intelligents
   */
  async processMessage(
    message: string,
    history: ChatMessage[],
    context: ChatContext
  ): Promise<ChatResponse> {
    const { userToken, sessionId, agentConfig } = context;
    
    logger.info(`[SimpleChatOrchestrator] 💬 Traitement message s=${sessionId}`);

    try {
      // 1. Premier appel LLM
      const firstResponse = await this.callLLM(message, history, agentConfig, userToken, sessionId);
      
      // 2. Extraire les tool calls
      const toolCalls = this.extractToolCalls(firstResponse);
      
      if (toolCalls.length === 0) {
        // Pas de tools → réponse directe
        return {
          success: true,
          content: firstResponse.content || firstResponse.message || 'Réponse générée',
          toolCalls: [],
          toolResults: [],
          reasoning: firstResponse.reasoning
        };
      }

      // 3. Exécuter les tools avec relance intelligente
      const executionResult = await this.toolExecutor.executeWithRetry(
        toolCalls,
        context,
        (retryMessage, retryHistory, retryTools, retryResults) => 
          this.callLLMWithContext(retryMessage, retryHistory, retryTools, retryResults, agentConfig, userToken, sessionId)
      );

      // 4. Générer la réponse finale
      const finalResponse = await this.generateFinalResponse(
        message,
        history,
        executionResult,
        agentConfig,
        userToken,
        sessionId
      );

      return {
        success: executionResult.success,
        content: finalResponse,
        toolCalls: executionResult.toolCalls,
        toolResults: executionResult.toolResults,
        reasoning: firstResponse.reasoning
      };

    } catch (error) {
      logger.error(`[SimpleChatOrchestrator] ❌ Erreur traitement message:`, error);
      
      return {
        success: false,
        content: "Je rencontre une erreur technique. Veuillez réessayer.",
        toolCalls: [],
        toolResults: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Appel LLM initial
   */
  private async callLLM(
    message: string,
    history: ChatMessage[],
    agentConfig: any,
    userToken: string,
    sessionId: string
  ): Promise<any> {
    // Construire le contexte pour le message système
    const systemContext: SystemMessageContext = {
      type: 'chat_session',
      name: `session-${sessionId}`,
      id: sessionId,
      content: message
    };

    // Construire le message système avec les instructions de l'agent
    const systemMessage = systemMessageBuilder.buildSystemMessage(
      agentConfig || {},
      systemContext,
      'Tu es un assistant IA utile et bienveillant.'
    );

    const appContext = { 
      type: 'chat_session' as const, 
      name: `session-${sessionId}`, 
      id: sessionId, 
      content: systemMessage.content
    };

    // Construire l'historique (sans ajouter le message actuel)
    const conversationHistory = [...history];
    
    // Obtenir les tools
    const tools = await this.getTools(agentConfig);

    // Appel au LLM (le message est passé séparément)
    const harmonyHistory = this.convertToHarmonyMessages(conversationHistory);
    return await this.llmProvider.call(message, appContext, harmonyHistory, { tools });
  }

  /**
   * Appel LLM avec contexte (pour les relances)
   */
  private async callLLMWithContext(
    message: string,
    history: ChatMessage[],
    toolCalls: ToolCall[],
    toolResults: ToolResult[],
    agentConfig: any,
    userToken: string,
    sessionId: string
  ): Promise<any> {
    // Construire le contexte pour le message système
    const systemContext: SystemMessageContext = {
      type: 'chat_session',
      name: `session-${sessionId}`,
      id: sessionId,
      content: message
    };

    // Construire le message système avec les instructions de l'agent
    const systemMessage = systemMessageBuilder.buildSystemMessage(
      agentConfig || {},
      systemContext,
      'Tu es un assistant IA utile et bienveillant.'
    );

    const appContext = { 
      type: 'chat_session' as const, 
      name: `session-${sessionId}`, 
      id: sessionId, 
      content: systemMessage.content
    };

    // Construire l'historique avec les résultats des tools
    const conversationHistory = this.buildConversationHistoryWithTools(history, message, toolCalls, toolResults);
    
    // Appel au LLM sans tools (pour éviter les boucles infinies)
    const harmonyHistory = this.convertToHarmonyMessages(conversationHistory);
    return await this.llmProvider.call(message, appContext, harmonyHistory);
  }

  /**
   * Générer la réponse finale
   */
  private async generateFinalResponse(
    originalMessage: string,
    history: ChatMessage[],
    executionResult: any,
    agentConfig: any,
    userToken: string,
    sessionId: string
  ): Promise<string> {
    const { toolCalls, toolResults } = executionResult;
    
    // Construire un message de synthèse
    const summaryMessage = `Voici les résultats des outils exécutés :
    
    Outils utilisés : ${toolCalls.map(tc => tc.function.name).join(', ')}
    Résultats : ${toolCalls.length} outils exécutés
    
    Peux-tu fournir une réponse finale basée sur ces résultats ?`;

    try {
      const finalResponse = await this.callLLMWithContext(
        summaryMessage,
        history,
        toolCalls,
        toolResults,
        agentConfig,
        userToken,
        sessionId
      );

      return finalResponse.content || finalResponse.message || "Réponse générée basée sur les résultats des outils.";
    } catch (error) {
      logger.error('[SimpleChatOrchestrator] Erreur génération réponse finale:', error);
      return "Les outils ont été exécutés. Voici un résumé des actions effectuées.";
    }
  }

  /**
   * Extraire les tool calls d'une réponse LLM
   */
  private extractToolCalls(response: any): ToolCall[] {
    if (!response || typeof response !== 'object') return [];
    
    const toolCalls = response.tool_calls || response.toolCalls || [];
    
    if (!Array.isArray(toolCalls)) return [];
    
    return toolCalls.filter((tc: any) => 
      tc && 
      typeof tc.id === 'string' && 
      tc.function && 
      typeof tc.function.name === 'string' &&
      typeof tc.function.arguments === 'string'
    );
  }

  /**
   * Construire l'historique de conversation
   */
  private buildConversationHistory(history: ChatMessage[], currentMessage: string): ChatMessage[] {
    const conversationHistory = [...history];
    
    // Ajouter le message actuel
    conversationHistory.push({
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    });
    
    return conversationHistory;
  }

  /**
   * Construire l'historique avec les résultats des tools
   */
  private buildConversationHistoryWithTools(
    history: ChatMessage[], 
    message: string, 
    toolCalls: ToolCall[], 
    toolResults: ToolResult[]
  ): ChatMessage[] {
    const conversationHistory = [...history];
    
    // Ajouter le message utilisateur
    conversationHistory.push({
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    // Ajouter les tool calls
    if (toolCalls.length > 0) {
      conversationHistory.push({
        id: `assistant-tool-calls-${Date.now()}`,
        role: 'assistant',
        content: '',
        tool_calls: toolCalls,
        timestamp: new Date().toISOString()
      });
    }
    
    // Ajouter les résultats des tools
    for (const result of toolResults) {
      conversationHistory.push({
        id: `tool-${result.tool_call_id}-${Date.now()}`,
        role: 'tool',
        content: result.content,
        tool_call_id: result.tool_call_id,
        name: result.name,
        timestamp: new Date().toISOString()
      });
    }
    
    return conversationHistory;
  }

  /**
   * Convertir ChatMessage[] vers HarmonyMessage[]
   */
  private convertToHarmonyMessages(chatMessages: ChatMessage[]): HarmonyMessage[] {
    return chatMessages.map(msg => ({
      role: msg.role as any,
      content: msg.content || '',
      timestamp: msg.timestamp,
      channel: msg.channel,
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id,
      name: msg.name
    }));
  }

  /**
   * Obtenir les tools disponibles
   */
  private async getTools(agentConfig: any): Promise<any[]> {
    try {
      const { getOpenAPIV2Tools } = await import('@/services/openApiToolsGenerator');
      return getOpenAPIV2Tools();
    } catch (error) {
      logger.warn('[SimpleChatOrchestrator] Fallback to empty tools array');
      return [];
    }
  }
}

// Instance singleton
export const simpleChatOrchestrator = new SimpleChatOrchestrator();
