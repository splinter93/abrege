/**
 * Orchestrateur principal pour l'API V2
 * Point d'entrée centralisé pour l'exécution des tool calls
 */

import { simpleLogger as logger } from '@/utils/logger';
import { toolRegistry } from './ToolRegistry';
import type {
  ApiV2Orchestrator,
  ToolCall,
  ToolResult,
  ApiV2Context,
  ValidationResult,
  ToolDefinition
} from '../types/ApiV2Types';

export class ApiV2OrchestratorImpl implements ApiV2Orchestrator {
  /**
   * Exécuter un tool call
   */
  async executeToolCall(toolCall: ToolCall, context: ApiV2Context): Promise<ToolResult> {
    const startTime = Date.now();
    const traceId = `orchestrator-${toolCall.id}-${startTime}`;

    try {
      logger.info(`[ApiV2Orchestrator] 🚀 Exécution tool call: ${toolCall.function.name}`, {
        traceId,
        toolCallId: toolCall.id,
        functionName: toolCall.function.name,
        userId: context.userId
      });

      // 1. Validation du tool call
      const validation = this.validateToolCall(toolCall);
      if (!validation.valid) {
        logger.warn(`[ApiV2Orchestrator] ❌ Tool call invalide`, {
          traceId,
          toolCallId: toolCall.id,
          errors: validation.errors
        });

        return {
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            success: false,
            error: `Tool call invalide: ${validation.errors.join(', ')}`,
            code: 'INVALID_TOOL_CALL'
          }),
          success: false,
          error: validation.errors.join(', '),
          code: 'INVALID_TOOL_CALL'
        };
      }

      // 2. Parsing des arguments
      let params: unknown;
      try {
        params = JSON.parse(toolCall.function.arguments || '{}');
      } catch (error) {
        logger.warn(`[ApiV2Orchestrator] ❌ Arguments JSON invalides`, {
          traceId,
          toolCallId: toolCall.id,
          arguments: toolCall.function.arguments
        });

        return {
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            success: false,
            error: 'Arguments JSON invalides',
            code: 'INVALID_JSON'
          }),
          success: false,
          error: 'Arguments JSON invalides',
          code: 'INVALID_JSON'
        };
      }

      // 3. Récupération du handler
      const handler = toolRegistry.getHandler(toolCall.function.name);
      if (!handler) {
        logger.warn(`[ApiV2Orchestrator] ❌ Handler non trouvé`, {
          traceId,
          toolCallId: toolCall.id,
          functionName: toolCall.function.name
        });

        return {
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: JSON.stringify({
            success: false,
            error: `Opération non supportée: ${toolCall.function.name}`,
            code: 'UNSUPPORTED_OPERATION'
          }),
          success: false,
          error: `Opération non supportée: ${toolCall.function.name}`,
          code: 'UNSUPPORTED_OPERATION'
        };
      }

      // 4. Exécution via le handler
      const contextWithTrace: ApiV2Context = {
        ...context,
        traceId,
        operation: toolCall.function.name
      };

      const result = await handler.execute(toolCall.function.name, params, contextWithTrace);

      const executionTime = Date.now() - startTime;

      // 5. Formatage de la réponse
      const toolResult: ToolResult = {
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify(result),
        success: result.success,
        error: result.error,
        code: result.code
      };

      logger.info(`[ApiV2Orchestrator] ✅ Tool call exécuté avec succès`, {
        traceId,
        toolCallId: toolCall.id,
        functionName: toolCall.function.name,
        executionTime,
        success: result.success
      });

      return toolResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`[ApiV2Orchestrator] ❌ Erreur fatale tool call:`, {
        traceId,
        toolCallId: toolCall.id,
        functionName: toolCall.function.name,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      });

      return {
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur interne du serveur',
          code: 'INTERNAL_ERROR'
        }),
        success: false,
        error: error instanceof Error ? error.message : 'Erreur interne du serveur',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Valider un tool call
   */
  validateToolCall(toolCall: ToolCall): ValidationResult {
    const errors: string[] = [];

    // Validation de la structure de base
    if (!toolCall.id || typeof toolCall.id !== 'string') {
      errors.push('tool_call_id est requis et doit être une chaîne');
    }

    if (!toolCall.function || typeof toolCall.function !== 'object') {
      errors.push('function est requis et doit être un objet');
    } else {
      if (!toolCall.function.name || typeof toolCall.function.name !== 'string') {
        errors.push('function.name est requis et doit être une chaîne');
      }

      if (!toolCall.function.arguments || typeof toolCall.function.arguments !== 'string') {
        errors.push('function.arguments est requis et doit être une chaîne JSON');
      }
    }

    // Validation du type
    if (toolCall.type && toolCall.type !== 'function') {
      errors.push('type doit être "function"');
    }

    // Vérifier que l'opération est supportée
    if (toolCall.function?.name && !toolRegistry.isOperationSupported(toolCall.function.name)) {
      errors.push(`Opération non supportée: ${toolCall.function.name}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Récupérer tous les tools disponibles
   */
  getAvailableTools(): ToolDefinition[] {
    return toolRegistry.getAllToolDefinitions();
  }

  /**
   * Récupérer les statistiques de l'orchestrateur
   */
  getStats(): {
    totalTools: number;
    totalOperations: number;
    registryStats: ReturnType<typeof toolRegistry.getStats>;
  } {
    const tools = this.getAvailableTools();
    const registryStats = toolRegistry.getStats();

    return {
      totalTools: tools.length,
      totalOperations: registryStats.totalOperations,
      registryStats
    };
  }
}

// Instance singleton de l'orchestrateur
export const apiV2Orchestrator = new ApiV2OrchestratorImpl();
