import type { ToolExecutionResult, ToolExecutionContext, GroqLimits } from '../types/groqTypes';
import { ToolCallManager } from '../toolCallManager';
import { simpleLogger as logger } from '@/utils/logger';

export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Service responsable de l'exécution des tools pour Groq
 * - Exécution parallèle bornée (par la limite maxToolCalls amont)
 * - Résilience: allSettled, erreurs sérialisées, codes d'erreur normalisés
 * - Résultats toujours alignés sur l'ordre d'entrée (1:1)
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
   * Retourne un tableau ToolExecutionResult aligné sur l'ordre initial.
   */
  async executeTools(
    toolCalls: ToolCall[],
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult[]> {
    const { userToken, batchId, maxRetries } = context;
    const totalRequested = Array.isArray(toolCalls) ? toolCalls.length : 0;
    logger.info(
      `[GroqToolExecutor] 🔧 EXÉCUTION PARALLÈLE (${totalRequested}) tools... batch=${batchId ?? 'n/a'}`
    );

    // 0) Bornage sécurité
    if (totalRequested > this.limits.maxToolCalls) {
      logger.warn(
        `[GroqToolExecutor] ⚠️ Limite tool calls dépassée: ${totalRequested}/${this.limits.maxToolCalls} → trim`
      );
      toolCalls = toolCalls.slice(0, this.limits.maxToolCalls);
    }

    // 1) Validation amont
    const validation = this.validateToolCalls(toolCalls);
    if (!validation.isValid) {
      logger.warn(
        `[GroqToolExecutor] ⚠️ Tool calls invalides détectés (${validation.errors.length}) — exécution partielle`
      );
      validation.errors.slice(0, 5).forEach((e, i) => logger.warn(`  • [${i + 1}] ${e}`));
    }

    // Marquer les indices invalides pour rendre un résultat d'erreur cohérent sans bloquer le lot
    const invalidIndexes = new Set<number>();
    toolCalls.forEach((tc, idx) => {
      if (!this.isToolCallStructValid(tc)) invalidIndexes.add(idx);
      else if (!this.isArgsJsonValid(tc)) invalidIndexes.add(idx);
    });

    // 2) Préparation des promesses (les invalides sont mappées sur une promesse résolue avec erreur formattée)
    const executionPromises = toolCalls.map((toolCall, index) => {
      if (invalidIndexes.has(index)) {
        return Promise.resolve(this.buildInvalidCallResult(toolCall, 'INVALID_TOOL_CALL'));
      }
      return this.executeSingleTool(
        toolCall,
        userToken,
        maxRetries,
        batchId ?? `batch-${Date.now()}`,
        index + 1,
        toolCalls.length
      );
    });

    // 3) Exécution parallèle sécurisée
    const settled = await Promise.allSettled(executionPromises);

    // 4) Normalisation finale: on conserve l'ordre initial, et on aplati les erreurs/rejets
    const results: ToolExecutionResult[] = settled.map((s, idx) => {
      if (s.status === 'fulfilled') return s.value;
      const tc = toolCalls[idx];
      const toolName = tc?.function?.name || 'unknown';
      const errMsg = (s.reason?.message || String(s.reason || 'Erreur inconnue')).toString().slice(0, 500);
      return this.buildErrorResult(tc?.id ?? `tool_${idx}`, toolName, errMsg, 'UNKNOWN_ERROR', 0);
    });

    // 5) Synthèse logs
    this.logExecutionSummary(results);

    return results;
  }

  /**
   * Exécute un tool individuel avec instrumentation.
   * NB: le ToolCallManager gère déjà ses propres retries/timeouts ; ici on loggue finement.
   */
  private async executeSingleTool(
    toolCall: ToolCall,
    userToken: string,
    maxRetries: number,
    batchId: string,
    currentIndex: number,
    totalCount: number
  ): Promise<ToolExecutionResult> {
    const toolName = toolCall?.function?.name || 'unknown';
    const toolId = toolCall?.id || `tool_${currentIndex}`;
    const startedAt = Date.now();

    // Log d'entrée concis (sans PII)
    logger.info(
      `[GroqToolExecutor] 🔧 ${currentIndex}/${totalCount} → ${toolName} (id=${toolId}, batch=${batchId})`
    );
    logger.dev?.(
      `[GroqToolExecutor] 🧩 args preview ${toolName}: ${this.previewArgs(toolCall?.function?.arguments)}`
    );

    try {
      const result = await this.toolCallManager.executeToolCall(toolCall, userToken, maxRetries, { batchId });

      const duration = Date.now() - startedAt;
      const executionResult: ToolExecutionResult = {
        tool_call_id: result.tool_call_id ?? toolId,
        name: result.name ?? toolName,
        result: {
          ...result.result,
          duration_ms: duration
        },
        success: !!result.success,
        timestamp: new Date().toISOString()
      };

      if (result.success) {
        logger.info(
          `[GroqToolExecutor] ✅ ${toolName} OK (${duration}ms)`
        );
      } else {
        const errMsg = result?.result?.error ?? 'Erreur inconnue';
        logger.warn(
          `[GroqToolExecutor] ⚠️ ${toolName} KO (${duration}ms): ${String(errMsg).slice(0, 200)}`
        );
      }

      return executionResult;
    } catch (error) {
      const duration = Date.now() - startedAt;
      const errorMsg = error instanceof Error ? error.message : String(error);
      const code = this.detectErrorCode(errorMsg);
      logger.error(
        `[GroqToolExecutor] ❌ ${toolName} EXC (${duration}ms) code=${code}: ${String(errorMsg).slice(0, 300)}`
      );

      return this.buildErrorResult(toolId, toolName, errorMsg, code, duration);
    }
  }

  /**
   * Détecte le code d'erreur à partir du texte d'erreur (heuristique)
   */
  private detectErrorCode(errorText: string): string {
    const text = (errorText || '').toLowerCase();

    if (text.includes('401') || text.includes('unauthorized')) return 'AUTH_ERROR';
    if (text.includes('403') || text.includes('forbidden')) return 'PERMISSION_ERROR';
    if (text.includes('404') || text.includes('not found')) return 'NOT_FOUND';
    if (text.includes('429') || text.includes('rate limit') || text.includes('too many requests')) return 'RATE_LIMIT';
    if (text.includes('quota')) return 'QUOTA_EXCEEDED';
    if (text.includes('timeout') || text.includes('timed out')) return 'TIMEOUT';
    if (text.includes('5xx') || text.includes('internal') || text.includes('server error') || text.includes('502') || text.includes('503') || text.includes('504')) return 'SERVER_ERROR';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Log un résumé de l'exécution des tools
   */
  private logExecutionSummary(results: ToolExecutionResult[]): void {
    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.length - successfulCount;

    if (failedCount === 0) {
      logger.info(`[GroqToolExecutor] ✅ ${successfulCount}/${results.length} tools OK`);
    } else {
      logger.warn(
        `[GroqToolExecutor] ⚠️ Exécution: ${successfulCount} succès, ${failedCount} échecs`
      );
      // Top 3 erreurs pour le debug rapide
      const topErrors = results
        .filter(r => !r.success)
        .slice(0, 3)
        .map(r => {
          const resultObj = r.result as { error?: unknown; code?: string } | undefined;
          const err = resultObj?.error || 'Erreur inconnue';
          const code = resultObj?.code || 'UNKNOWN_ERROR';
          return `• ${r.name} (${code}): ${String(err).slice(0, 140)}`;
        });
      topErrors.forEach(e => logger.warn(e));
    }
  }

  /**
   * Validation pragmatique des tool calls (ne bloque jamais tout le lot)
   */
  validateToolCalls(toolCalls: ToolCall[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      errors.push('Tool calls doit être un tableau non vide');
      return { isValid: false, errors };
    }

    toolCalls.forEach((toolCall, idx) => {
      if (!toolCall?.id || typeof toolCall.id !== 'string') {
        errors.push(`Tool call #${idx} sans ID valide`);
      }
      if (!toolCall?.function?.name || typeof toolCall.function.name !== 'string') {
        errors.push(`Tool call ${toolCall?.id ?? `#${idx}`} sans nom de fonction valide`);
      }
      if (!this.isArgsJsonValid(toolCall)) {
        errors.push(`Tool call ${toolCall?.id ?? `#${idx}`} avec arguments JSON invalides`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  // --- Helpers privés ---

  private isToolCallStructValid(toolCall: ToolCall): boolean {
    return !!toolCall && typeof toolCall?.id === 'string' && typeof toolCall?.function?.name === 'string';
  }

  private isArgsJsonValid(toolCall: ToolCall): boolean {
    if (!toolCall?.function?.arguments) return true;
    try {
      JSON.parse(toolCall.function.arguments);
      return true;
    } catch {
      return false;
    }
  }

  private buildInvalidCallResult(toolCall: ToolCall, code: string): ToolExecutionResult {
    const toolName = toolCall?.function?.name || 'unknown';
    const toolId = toolCall?.id || `invalid_${Date.now()}`;
    return this.buildErrorResult(toolId, toolName, 'Tool call invalide (structure ou arguments)', code, 0);
  }

  private buildErrorResult(toolId: string, toolName: string, errorMsg: string, code: string, duration: number = 0): ToolExecutionResult {
    return {
      tool_call_id: toolId,
      name: toolName,
      result: {
        success: false,
        error: errorMsg,
        code,
        duration_ms: duration
      },
      success: false,
      timestamp: new Date().toISOString()
    };
  }

  private previewArgs(args?: string): string {
    if (!args || typeof args !== 'string') return '(no-args)';
    try {
      const obj = JSON.parse(args);
      // Eviter PII: ne logguer que les clés de haut niveau
      const keys = Object.keys(obj || {});
      return keys.length ? `{ ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ', ...' : ''} }` : '{}';
    } catch {
      return '(invalid-json)';
    }
  }
}