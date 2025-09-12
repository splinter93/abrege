/**
 * SimpleChatOrchestrator - Orchestrateur de chat simple et intelligent
 * Style ChatGPT : LLM → tools → relance → réponse finale
 */

import { GroqProvider } from '../providers/implementations/groq';
import { SimpleToolExecutor, ToolCall, ToolResult } from './SimpleToolExecutor';
import { simpleLogger as logger } from '@/utils/logger';
import { ChatMessage } from '@/types/chat';
import { ChatMessage as HarmonyMessage } from '@/types/chat';
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
  private llmProvider: GroqProvider;
  private toolExecutor: SimpleToolExecutor;

  constructor() {
    this.llmProvider = new GroqProvider();
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
    const maxToolCalls = context.maxToolCalls ?? 5;

    logger.info(`[SimpleChatOrchestrator] 💬 Traitement message s=${sessionId}`);

    try {
      // 1) Premier appel LLM
      let currentResponse = await this.callLLM(message, history, agentConfig, userToken, sessionId);
      
      // ✅ Sauvegarder le reasoning du premier appel
      const originalReasoning = currentResponse?.reasoning;

      // 2) Boucle multi-tool-calls (style ChatGPT)
      let loopCount = 0;
      let allToolCalls: ToolCall[] = [];
      let allToolResults: ToolResult[] = [];

      while (loopCount < maxToolCalls) {
        const toolCalls = this.extractToolCalls(currentResponse);
         logger.dev(`[SimpleChatOrchestrator] 🔁 Loop ${loopCount} - toolCalls=${toolCalls.length}`);
        if (!toolCalls.length) break;

        // Exécuter les tools (avec retry interne si défini dans le SimpleToolExecutor)
        const executionResult = await this.toolExecutor.executeWithRetry(
          toolCalls,
          context,
          (retryMessage, retryHistory, retryTools, retryResults) =>
            this.callLLMWithContext(
              retryMessage,
              retryHistory,
              retryTools,
              retryResults,
              agentConfig,
              userToken,
              sessionId
            )
        );

        // Accumuler
        allToolCalls = [...allToolCalls, ...executionResult.toolCalls];
        allToolResults = [...allToolResults, ...executionResult.toolResults];

        // Relancer le LLM avec l'historique enrichi des résultats
        currentResponse = await this.callLLMWithContext(
          message,
          history,
          executionResult.toolCalls,
          executionResult.toolResults,
          agentConfig,
          userToken,
          sessionId
        );

        loopCount++;
      }

      // 3) Sortie finale
      const finalContent = currentResponse?.content || currentResponse?.message || await this.generateFinalResponse(
        message,
        history,
        { toolCalls: allToolCalls, toolResults: allToolResults, success: true },
        agentConfig,
        userToken,
        sessionId
      );

      logger.dev(`[SimpleChatOrchestrator] 🧠 Reasoning final:`, {
        hasOriginalReasoning: !!originalReasoning,
        originalReasoningLength: originalReasoning?.length || 0,
        originalReasoning: originalReasoning,
        hasCurrentReasoning: !!currentResponse?.reasoning,
        currentReasoningLength: currentResponse?.reasoning?.length || 0,
        currentReasoning: currentResponse?.reasoning
      });

      return {
        success: true,
        content: finalContent,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        reasoning: originalReasoning || currentResponse?.reasoning, // ✅ Utiliser le reasoning original
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
    
    // Obtenir les tools et les intégrer dans l'historique via un message developer
    const tools = await this.getTools(agentConfig);
    const harmonyHistory = this.convertToHarmonyMessages(conversationHistory);
    
    // Si des tools sont disponibles, les intégrer dans un message developer
    if (tools && tools.length > 0) {
      const developerMessage = this.createDeveloperMessageWithTools(tools);
      harmonyHistory.push(developerMessage);
    }

    // Appel au LLM (le message est passé séparément)
    return await this.llmProvider.call(message, appContext, harmonyHistory);
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

    // Historique enrichi avec tool calls + résultats
    const conversationHistory = this.buildConversationHistoryWithTools(history, message, toolCalls, toolResults);

    // Ajouter à nouveau la description des tools pour permettre de nouveaux appels
    const tools = await this.getTools(agentConfig);
    const harmonyHistory = this.convertToHarmonyMessages(conversationHistory);
    if (tools && tools.length > 0) {
      const developerMessage = this.createDeveloperMessageWithTools(tools);
      harmonyHistory.push(developerMessage);
    }

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
    const { toolCalls = [], toolResults = [] } = executionResult || {};

    const summaryMessage = `Voici les résultats des outils exécutés :\n\nOutils utilisés : ${toolCalls.map((tc: any) => tc.function.name).join(', ') || 'aucun'}\nRésultats : ${toolCalls.length || 0} outils exécutés\n\nSi nécessaire, fournis maintenant une réponse finale basée sur ces résultats.`;

    try {
      // Utiliser callLLM au lieu de callLLMWithContext pour éviter d'ajouter des tools
      const finalResponse = await this.callLLM(
        summaryMessage,
        history,
        agentConfig,
        userToken,
        sessionId
      );

      return finalResponse?.content || finalResponse?.message || "Réponse générée basée sur les résultats des outils.";
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

    const raw = [
      response.tool_calls,
      response.toolCalls,
      response?.choices?.[0]?.message?.tool_calls,
      response?.assistant?.tool_calls
    ]
      .flat()
      .filter(Boolean);

    if (!Array.isArray(raw) || raw.length === 0) return [];

    return raw
      .map((tc: any, idx: number) => {
        // ✅ Validation stricte des champs requis
        if (!tc.function?.name) {
          logger.warn(`[SimpleChatOrchestrator] ⚠️ Tool call ${idx} ignoré: name manquant`);
          return null;
        }

        const args = tc.function?.arguments;
        const toolCall: ToolCall = {
          id: tc.id ?? `call-${Date.now()}-${idx}`,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {})
          }
        };

        logger.dev(`[SimpleChatOrchestrator] 🔧 Tool call extrait:`, {
          id: toolCall.id,
          name: toolCall.function.name,
          hasArguments: !!toolCall.function.arguments
        });

        return toolCall;
      })
      .filter((tc): tc is ToolCall => tc !== null && tc.function.name.length > 0);
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
      id: msg.id,
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

  /**
   * Créer un message developer avec les tools intégrés
   */
  private createDeveloperMessageWithTools(tools: any[]): any {
    logger.dev(`[SimpleChatOrchestrator] 🔧 Création message developer avec ${tools.length} tools`);
    
    const toolCodeContent = tools.map(tool => {
      const functionDef = tool.function;
      logger.dev(`[SimpleChatOrchestrator] 🔧 Tool: ${functionDef.name}`);
      
      // ✅ Format amélioré pour une meilleure extraction
      return `# ${functionDef.name}
# Description: ${functionDef.description}
# Parameters:
${JSON.stringify(functionDef.parameters, null, 2)}`;
    }).join('\n\n');

    const developerContent = `<|tool_code|>
${toolCodeContent}
<|/tool_code|>`;

    logger.dev(`[SimpleChatOrchestrator] 🔧 Message developer créé (${developerContent.length} chars)`);
    logger.dev(`[SimpleChatOrchestrator] 🔧 Contenu preview:`, developerContent.substring(0, 200) + '...');

    return {
      role: 'developer',
      content: developerContent
    };
  }
}

// Instance singleton
export const simpleChatOrchestrator = new SimpleChatOrchestrator();
