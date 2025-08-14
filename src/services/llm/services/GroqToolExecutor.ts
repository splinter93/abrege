import type { ToolExecutionResult, ToolExecutionContext, GroqLimits } from '../types/groqTypes';
import { ToolCallManager } from '../toolCallManager';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service responsable de l'exécution des tools pour Groq
 */
export class GroqToolExecutor {
  private limits: GroqLimits;
  private toolCallManager: ToolCallManager;

  constructor(limits: GroqLimits) {
    this.limits = limits;
    this.toolCallManager = ToolCallManager.getInstance();
  }

  /**
   * Exécute une liste de tool calls en parallèle avec gestion d'erreurs optimisée
   */
  async executeTools(
    toolCalls: any[],
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult[]> {
    const { userToken, batchId, maxRetries } = context;
    logger.info(`[GroqToolExecutor] 🔧 EXÉCUTION PARALLÈLE DE ${toolCalls.length} TOOLS...`);

    // Vérifier la limite de sécurité
    if (toolCalls.length > this.limits.maxToolCalls) {
      logger.warn(`[GroqToolExecutor] ⚠️ Limite de tool calls dépassée: ${toolCalls.length}/${this.limits.maxToolCalls}`);
      toolCalls = toolCalls.slice(0, this.limits.maxToolCalls);
    }

    // Exécution parallèle des tools avec Promise.allSettled pour éviter les blocages
    const executionPromises = toolCalls.map((toolCall, index) =>
      this.executeSingleTool(toolCall, userToken, maxRetries, batchId, index + 1, toolCalls.length)
    );
    
    // Utiliser allSettled pour ne pas bloquer sur un seul échec
    const results = await Promise.allSettled(executionPromises);
    
    // Traiter les résultats (succès + échecs)
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // En cas d'échec, créer un résultat d'erreur
        const toolCall = toolCalls[index];
        return {
          tool_call_id: toolCall.id,
          name: toolCall.function?.name || 'unknown',
          result: { success: false, error: result.reason?.message || 'Erreur inconnue' },
          success: false,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Log des résultats
    this.logExecutionSummary(processedResults);

    return processedResults;
  }

  /**
   * Exécute un tool individuel
   */
  private async executeSingleTool(
    toolCall: any,
    userToken: string,
    maxRetries: number,
    batchId: string,
    currentIndex: number,
    totalCount: number
  ): Promise<ToolExecutionResult> {
    const toolName = toolCall.function?.name || 'unknown';
    
    try {
      logger.info(`[GroqToolExecutor] 🔧 Exécution du tool ${currentIndex}/${totalCount}: ${toolName}`);
      
      const result = await this.toolCallManager.executeToolCall(
        toolCall,
        userToken,
        maxRetries,
        { batchId }
      );

      const executionResult: ToolExecutionResult = {
        tool_call_id: result.tool_call_id,
        name: result.name,
        result: result.result,
        success: result.success,
        timestamp: new Date().toISOString()
      };

      if (result.success) {
        logger.info(`[GroqToolExecutor] ✅ Tool ${toolName} exécuté avec succès`);
      } else {
        logger.warn(`[GroqToolExecutor] ⚠️ Tool ${toolName} a échoué:`, result.result?.error);
      }

      return executionResult;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[GroqToolExecutor] ❌ Erreur lors de l'exécution du tool ${toolName}:`, error);

      return {
        tool_call_id: toolCall.id,
        name: toolName,
        result: {
          success: false,
          error: errorMsg,
          code: this.detectErrorCode(errorMsg)
        },
        success: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Détecte le code d'erreur à partir du texte d'erreur
   */
  private detectErrorCode(errorText: string): string {
    const text = errorText.toLowerCase();
    
    if (text.includes('401') || text.includes('unauthorized')) return 'AUTH_ERROR';
    if (text.includes('403') || text.includes('forbidden')) return 'PERMISSION_ERROR';
    if (text.includes('404') || text.includes('not found')) return 'NOT_FOUND';
    if (text.includes('500') || text.includes('internal')) return 'SERVER_ERROR';
    if (text.includes('timeout') || text.includes('timeout')) return 'TIMEOUT';
    if (text.includes('rate limit') || text.includes('too many requests')) return 'RATE_LIMIT';
    if (text.includes('quota') || text.includes('quota exceeded')) return 'QUOTA_EXCEEDED';
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Log un résumé de l'exécution des tools
   */
  private logExecutionSummary(results: ToolExecutionResult[]): void {
    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    if (failedCount === 0) {
      logger.info(`[GroqToolExecutor] ✅ Tous les ${successfulCount} tools ont été exécutés avec succès`);
    } else {
      logger.warn(`[GroqToolExecutor] ⚠️ Exécution terminée: ${successfulCount} succès, ${failedCount} échecs`);
    }
  }

  /**
   * Valide les tool calls avant exécution (validation moins stricte)
   */
  validateToolCalls(toolCalls: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      errors.push('Tool calls doit être un tableau non vide');
      return { isValid: false, errors };
    }

    for (const toolCall of toolCalls) {
      if (!toolCall.id || typeof toolCall.id !== 'string') {
        errors.push(`Tool call sans ID valide: ${JSON.stringify(toolCall)}`);
      }
      
      if (!toolCall.function?.name || typeof toolCall.function.name !== 'string') {
        errors.push(`Tool call ${toolCall.id} sans nom de fonction valide`);
      }
      
      // ✅ ARGUMENTS OPTIONNELS - Permettre les tools sans arguments
      if (toolCall.function?.arguments) {
        try {
          JSON.parse(toolCall.function.arguments);
        } catch {
          errors.push(`Tool call ${toolCall.id} avec arguments JSON invalides`);
        }
      } else {
        // ✅ Tool sans arguments autorisé
        logger.info(`[GroqToolExecutor] Tool call ${toolCall.id} sans arguments (autorisé)`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 