/**
 * SimpleToolExecutor - Système de tools intelligent avec relance automatique
 * Style ChatGPT : exécution → erreur → relance → réponse finale
 */

import { ApiV2ToolExecutor } from '../executors/ApiV2ToolExecutor';
import { simpleLogger as logger } from '@/utils/logger';
import type { LLMResponse } from '../types/strictTypes';

/**
 * Type pour le callback LLM
 */
export type LLMCallback = (message: string, history: unknown[], tools: ToolCall[], results: ToolResult[]) => Promise<LLMResponse>;

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
  error?: string;
  timestamp?: string;
}

export interface ExecutionContext {
  userToken: string;
  sessionId: string;
  maxRetries?: number;
  maxToolCalls?: number;
}

export interface ExecutionResult {
  success: boolean;
  content: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  finalResponse?: string;
  error?: string;
}

/**
 * Exécuteur de tools simple et intelligent
 * Gère automatiquement les relances et les erreurs comme ChatGPT
 */
export class SimpleToolExecutor {
  private toolExecutor: ApiV2ToolExecutor;
  private readonly maxRetries: number = 3;
  private readonly maxToolCalls: number = 10;

  constructor() {
    this.toolExecutor = new ApiV2ToolExecutor();
  }

  /**
   * Exécuter des tools avec relance intelligente
   * Style ChatGPT : exécution → analyse → relance si nécessaire → réponse finale
   */
  async executeWithRetry(
    toolCalls: ToolCall[],
    context: ExecutionContext,
    llmCallback: LLMCallback
  ): Promise<ExecutionResult> {
    const { userToken, sessionId } = context;
    const maxRetries = context.maxRetries || this.maxRetries;
    const maxToolCalls = context.maxToolCalls || this.maxToolCalls;

    logger.info(`[SimpleToolExecutor] 🚀 Démarrage exécution ${toolCalls.length} tools`);

    let allToolCalls: ToolCall[] = [...toolCalls];
    let allResults: ToolResult[] = [];
    let retryCount = 0;
    let currentToolCalls = toolCalls;

    while (retryCount < maxRetries && currentToolCalls.length > 0) {
      logger.info(`[SimpleToolExecutor] 🔄 Tentative ${retryCount + 1}/${maxRetries} - ${currentToolCalls.length} tools`);

      try {
        // 1. Exécuter les tools actuels
        const results = await this.executeTools(currentToolCalls, userToken);
        allResults.push(...results);

        // 2. Analyser les résultats
        const analysis = this.analyzeResults(results);
        
        if (analysis.needsRetry && retryCount < maxRetries - 1) {
          // 3. Demander au LLM de corriger/relancer
          const retryMessage = this.buildRetryMessage(analysis);
          const llmResponse = await llmCallback(retryMessage, [], allToolCalls, allResults);
          
          // 4. Extraire les nouveaux tool calls
          const newToolCalls = this.extractToolCalls(llmResponse);
          
          if (newToolCalls.length > 0) {
            currentToolCalls = newToolCalls;
            allToolCalls.push(...newToolCalls);
            retryCount++;
            continue;
          }
        }

        // 5. Succès ou échec final
        break;

      } catch (error) {
        logger.error(`[SimpleToolExecutor] ❌ Erreur tentative ${retryCount + 1}:`, error);
        
        if (retryCount < maxRetries - 1) {
          // Demander au LLM de gérer l'erreur
          const errorMessage = this.buildErrorMessage(error);
          const llmResponse = await llmCallback(errorMessage, [], allToolCalls, allResults);
          
          const newToolCalls = this.extractToolCalls(llmResponse);
          if (newToolCalls.length > 0) {
            currentToolCalls = newToolCalls;
            allToolCalls.push(...newToolCalls);
            retryCount++;
            continue;
          }
        }
        
        break;
      }
    }

    // 6. Générer la réponse finale
    const finalResponse = await this.generateFinalResponse(allToolCalls, allResults, llmCallback);

    const result: ExecutionResult = {
      success: allResults.some(r => r.success),
      content: finalResponse,
      toolCalls: allToolCalls,
      toolResults: allResults
    };

    logger.info(`[SimpleToolExecutor] ✅ Exécution terminée - ${allResults.filter(r => r.success).length}/${allResults.length} succès`);
    
    return result;
  }

  /**
   * Exécuter une liste de tools
   */
  private async executeTools(toolCalls: ToolCall[], userToken: string): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      try {
        const result = await this.toolExecutor.executeToolCall(toolCall, userToken);
        results.push(result);
      } catch (error) {
        logger.error(`[SimpleToolExecutor] Tool ${toolCall.function.name} failed:`, error);
        results.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          }),
          success: false,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    return results;
  }

  /**
   * Analyser les résultats pour déterminer si une relance est nécessaire
   */
  private analyzeResults(results: ToolResult[]): {
    needsRetry: boolean;
    failedTools: string[];
    errorTypes: string[];
  } {
    const failedTools = results.filter(r => !r.success).map(r => r.name);
    const errorTypes = results
      .filter(r => !r.success)
      .map(r => this.categorizeError(r.error || 'Unknown error'));

    const needsRetry = failedTools.length > 0 && 
      errorTypes.some(type => ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'].includes(type));

    return {
      needsRetry,
      failedTools,
      errorTypes
    };
  }

  /**
   * Catégoriser une erreur
   */
  private categorizeError(error: string): string {
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('timeout') || errorLower.includes('timed out')) return 'TIMEOUT';
    if (errorLower.includes('network') || errorLower.includes('connection')) return 'NETWORK_ERROR';
    if (errorLower.includes('500') || errorLower.includes('server error')) return 'SERVER_ERROR';
    if (errorLower.includes('404') || errorLower.includes('not found')) return 'NOT_FOUND';
    if (errorLower.includes('403') || errorLower.includes('forbidden')) return 'PERMISSION_ERROR';
    if (errorLower.includes('401') || errorLower.includes('unauthorized')) return 'AUTH_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Construire un message de relance
   */
  private buildRetryMessage(analysis: { failedTools: string[]; errorTypes: string[] }): string {
    const { failedTools, errorTypes } = analysis;
    
    return `Les outils suivants ont échoué : ${failedTools.join(', ')}. 
    Types d'erreurs : ${errorTypes.join(', ')}. 
    Peux-tu réessayer avec des paramètres différents ou des outils alternatifs ?`;
  }

  /**
   * Construire un message d'erreur
   */
  private buildErrorMessage(error: unknown): string {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return `Une erreur s'est produite lors de l'exécution des outils : ${errorMsg}. 
    Peux-tu proposer une solution alternative ?`;
  }

  /**
   * Extraire les tool calls d'une réponse LLM
   */
  private extractToolCalls(llmResponse: LLMResponse): ToolCall[] {
    if (!llmResponse || typeof llmResponse !== 'object') return [];
    
    const toolCalls = llmResponse.tool_calls || [];
    
    if (!Array.isArray(toolCalls)) return [];
    
    return toolCalls.filter((tc): tc is ToolCall => 
      !!tc && 
      typeof tc.id === 'string' && 
      !!tc.function && 
      typeof tc.function.name === 'string'
    );
  }

  /**
   * Générer la réponse finale
   */
  private async generateFinalResponse(
    toolCalls: ToolCall[], 
    results: ToolResult[], 
    llmCallback: LLMCallback
  ): Promise<string> {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    if (successfulResults.length === 0) {
      return "Je n'ai pas pu exécuter les outils demandés. Veuillez réessayer avec des paramètres différents.";
    }

    if (failedResults.length === 0) {
      return "Tous les outils ont été exécutés avec succès.";
    }

    // Demander au LLM de générer une réponse basée sur les résultats
    const summaryMessage = `Voici les résultats des outils :
    Succès : ${successfulResults.length}
    Échecs : ${failedResults.length}
    
    Peux-tu fournir un résumé des résultats et des prochaines étapes ?`;

    try {
      const llmResponse = await llmCallback(summaryMessage, [], toolCalls, results);
      return llmResponse.content || llmResponse.message || "Résumé des résultats généré.";
    } catch (error) {
      logger.error('[SimpleToolExecutor] Erreur génération réponse finale:', error);
      return "Les outils ont été exécutés avec des résultats mitigés.";
    }
  }

  /**
   * Exécution simple sans relance (pour compatibilité)
   */
  async executeSimple(toolCalls: ToolCall[], userToken: string): Promise<ToolResult[]> {
    return this.executeTools(toolCalls, userToken);
  }

  /**
   * Alias pour executeSimple (utilisé par SimpleOrchestrator)
   */
  async executeToolCalls(toolCalls: ToolCall[], userToken: string): Promise<ToolResult[]> {
    return this.executeTools(toolCalls, userToken);
  }
}

// Instance singleton
export const simpleToolExecutor = new SimpleToolExecutor();
