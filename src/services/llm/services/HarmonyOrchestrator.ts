/**
 * HarmonyOrchestrator - Version simplifiée et robuste
 * Production-ready, 200 lignes max, zéro over-engineering
 */

import type { GroqRoundParams, GroqRoundResult } from '../types/groqTypes';
import { GroqHarmonyProvider } from '../providers/implementations/groqHarmony';
import { ApiV2ToolExecutor } from '../executors/ApiV2ToolExecutor';
import { simpleLogger as logger } from '@/utils/logger';
import { ChatMessage } from '@/types/chat';

/**
 * Orchestrateur Harmony simplifié
 * 2-passes LLM + exécution d'outils, relance bornée
 */
export class HarmonyOrchestrator {
  private readonly maxToolCalls = 10;
  private readonly maxRelances = 2;
  private readonly maxContextMessages = 25;

  private harmonyProvider: GroqHarmonyProvider;
  private toolExecutor: ApiV2ToolExecutor;

  constructor() {
    this.harmonyProvider = new GroqHarmonyProvider();
    this.toolExecutor = new ApiV2ToolExecutor();
  }

  /**
   * Round Harmony simplifié : LLM → tools → LLM → réponse
   */
  async executeRound(params: GroqRoundParams): Promise<GroqRoundResult> {
    const { message, sessionHistory, agentConfig, userToken, sessionId } = params;
    const startTime = Date.now();

    try {
      logger.info(`[HarmonyOrchestrator] 🚀 Round start s=${sessionId}`);

      // 1) Premier appel LLM
      const firstResponse = await this.callHarmonyLLM(message, sessionHistory, agentConfig, userToken, sessionId);
      
      const toolCalls = Array.isArray((firstResponse as any)?.tool_calls) ? (firstResponse as any).tool_calls : [];

      if (toolCalls.length === 0) {
        // Pas d'outils → réponse directe
        return this.createSuccessResponse(firstResponse, [], sessionId);
      }

      // Limiter les tool calls
      const limitedToolCalls = toolCalls.slice(0, this.maxToolCalls);

      // 2) Exécution des tools
      const toolResults = await this.executeTools(limitedToolCalls, userToken, sessionId);

      // 3) Deuxième appel LLM avec résultats
      const finalResponse = await this.callHarmonyLLMWithResults(
        message,
        sessionHistory,
        limitedToolCalls,
        toolResults,
        agentConfig,
        sessionId,
        userToken
      );

      const duration = Date.now() - startTime;
      logger.info(`[HarmonyOrchestrator] ✅ Round completed s=${sessionId} dur=${duration}ms`);

      return this.createSuccessResponse(finalResponse, toolResults, sessionId);

    } catch (error) {
      logger.error(`[HarmonyOrchestrator] ❌ Round failed s=${sessionId}:`, error);
      return this.createErrorResponse(error, sessionId);
    }
  }

  /**
   * Premier appel LLM Harmony
   */
  private async callHarmonyLLM(
    message: string,
    sessionHistory: any[],
    agentConfig: any,
    userToken: string,
    sessionId: string
  ) {
    const appContext = { type: 'chat_session' as const, name: `session-${sessionId}`, id: sessionId, content: '' };

    // Obtenir les tools
    const tools = await this.getTools(agentConfig);
    
    // Construire l'historique simple (sans ajouter le message actuel)
    const history = Array.isArray(sessionHistory) ? sessionHistory.slice(-this.maxContextMessages) : [];
    
    // Appel au provider (le message est passé séparément)
    return await this.harmonyProvider.call(message, appContext, history, { tools });
  }

  /**
   * Deuxième appel LLM avec résultats tools
   */
  private async callHarmonyLLMWithResults(
    message: string,
    sessionHistory: any[],
    toolCalls: any[],
    toolResults: any[],
    agentConfig: any,
    sessionId: string,
    userToken: string
  ) {
    const appContext = { type: 'chat_session' as const, name: `session-${sessionId}`, id: sessionId, content: '' };

    // Construire l'historique avec résultats
    const history = this.buildHistoryWithResults(sessionHistory, message, toolCalls, toolResults);
    
    // Appel au provider (sans tools pour éviter les boucles infinies)
    return await this.harmonyProvider.call(message, appContext, history);
  }

  /**
   * Exécuter les tools
   */
  private async executeTools(toolCalls: any[], userToken: string, sessionId: string): Promise<any[]> {
    const results: any[] = [];
    
    for (const toolCall of toolCalls) {
      try {
        const result = await this.toolExecutor.executeToolCall(toolCall, userToken);
        results.push(result);
      } catch (error) {
        logger.error(`[HarmonyOrchestrator] Tool execution failed:`, error);
        results.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
          success: false
        });
      }
    }
    
    return results;
  }

  /**
   * Obtenir les tools disponibles
   */
  private async getTools(agentConfig: any): Promise<any[]> {
    try {
      const { getOpenAPIV2Tools } = await import('@/services/openApiToolsGenerator');
      return getOpenAPIV2Tools();
    } catch (error) {
      logger.warn(`[HarmonyOrchestrator] Fallback to empty tools array`);
      return [];
    }
  }

  /**
   * Construire un historique simple
   */
  private buildSimpleHistory(sessionHistory: any[], message: string): any[] {
    const history = Array.isArray(sessionHistory) ? sessionHistory.slice(-this.maxContextMessages) : [];
    
    // Ajouter le message utilisateur
    history.push({
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    
    return history;
  }

  /**
   * Construire l'historique avec résultats tools
   */
  private buildHistoryWithResults(sessionHistory: any[], message: string, toolCalls: any[], toolResults: any[]): any[] {
    const history = this.buildSimpleHistory(sessionHistory, message);
    
    // Ajouter les tool calls
    if (toolCalls.length > 0) {
      history.push({
        id: `assistant-tool-calls-${Date.now()}`,
        role: 'assistant',
        content: '',
        tool_calls: toolCalls,
            timestamp: new Date().toISOString()
      });
    }
    
    // Ajouter les résultats
    for (const result of toolResults) {
      history.push({
        id: `tool-${result.tool_call_id}-${Date.now()}`,
        role: 'tool',
        tool_call_id: result.tool_call_id,
        name: result.name,
        content: result.content,
        timestamp: new Date().toISOString()
      });
    }
    
    return history;
  }

  /**
   * Créer une réponse de succès
   */
  private createSuccessResponse(response: any, toolResults: any[], sessionId: string): GroqRoundResult {
    const content = (response as any)?.content || '';
    const reasoning = (response as any)?.reasoning || '';

    return {
      success: true,
      content,
      reasoning,
      tool_calls: (response as any)?.tool_calls || [],
      tool_results: toolResults,
      sessionId
    };
  }

  /**
   * Créer une réponse d'erreur
   */
  private createErrorResponse(error: any, sessionId: string): GroqRoundResult {
    return {
      success: false,
      error: 'Erreur interne du serveur',
      details: error instanceof Error ? error.message : String(error),
      sessionId,
      status: 500
    };
  }
}