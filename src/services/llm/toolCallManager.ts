import { simpleLogger as logger } from '@/utils/logger';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
import { OpenApiToolExecutor } from './openApiToolExecutor';
import { ChatMessage } from '@/types/chat';

export interface ToolCallResult {
  tool_call_id: string;
  name: string;
  result: any;
  success: boolean;
  timestamp: string;
}

export class ToolCallManager {
  private static instance: ToolCallManager;
  private openApiExecutor: OpenApiToolExecutor;
  
  // ✅ SIMPLE: Historique des IDs déjà exécutés (évite la double exécution)
  private executedCallIds: Set<string> = new Set();

  static getInstance(): ToolCallManager {
    if (!ToolCallManager.instance) {
      ToolCallManager.instance = new ToolCallManager();
    }
    return ToolCallManager.instance;
  }

  private constructor() {
    this.openApiExecutor = OpenApiToolExecutor.getInstance();
  }

  /**
   * ✅ SIMPLE: Exécuter un tool call sans complexité inutile
   */
  async executeToolCall(
    toolCall: any,
    userToken: string,
    maxRetries: number = 3,
    options?: { batchId?: string }
  ): Promise<ToolCallResult> {
    const { id, function: func } = toolCall;
    
    if (!func?.name) {
      throw new Error('Tool call invalide: nom de fonction manquant');
    }

    // ✅ SIMPLE: Empêcher la double exécution du même tool_call_id
    if (this.executedCallIds.has(id)) {
      logger.warn(`[ToolCallManager] ⚠️ Tool call ${id} déjà exécuté - évitement de double exécution`);
      return {
        tool_call_id: id,
        name: func.name,
        result: { success: false, error: 'Tool call déjà exécuté' },
        success: false,
        timestamp: new Date().toISOString()
      };
    }

    // ✅ SIMPLE: Marquer comme exécuté
    this.executedCallIds.add(id);

    // ✅ SIMPLE: Nettoyer l'ID après 5 minutes
    setTimeout(() => {
      this.executedCallIds.delete(id);
    }, 5 * 60 * 1000);

    try {
      // ✅ NOUVEAU: Utiliser le système OpenAPI V2
      logger.info(`[ToolCallManager] 🔧 Exécution de ${func.name} avec OpenAPI V2...`);
      
      const result = await this.openApiExecutor.executeToolCall(toolCall, userToken, maxRetries, options);
      
      logger.info(`[ToolCallManager] ✅ Tool ${func.name} exécuté avec succès via OpenAPI V2`);
      
      return result;

    } catch (error) {
      logger.error(`[ToolCallManager] ❌ Erreur exécution ${func.name}:`, error);
      
      return {
        tool_call_id: id,
        name: func.name,
        result: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Erreur inconnue' 
        },
        success: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  private parseArguments(argumentsStr: string): any {
    try { return typeof argumentsStr === 'string' ? JSON.parse(argumentsStr || '{}') : (argumentsStr || {}); }
    catch { return { _raw: argumentsStr }; }
  }

  private normalizeResult(rawResult: any, toolName: string, args: any): any {
    if (rawResult && typeof rawResult === 'object' && 'success' in rawResult) return rawResult;
    return { success: true, data: rawResult, tool: toolName, args };
  }

  private detectErrorCode(error: any): string {
    const t = String(error?.message || error || '').toLowerCase();
    if (t.includes('timeout')) return 'TIMEOUT';
    if (t.includes('forbidden') || t.includes('permission')) return 'FORBIDDEN';
    if (t.includes('rls')) return 'RLS_DENIED';
    if (t.includes('not found')) return 'NOT_FOUND';
    if (t.includes('zod') || t.includes('validation')) return 'VALIDATION_ERROR';
    return 'UNKNOWN';
  }

  clearExecutionHistory(): void {
    this.executedCallIds.clear();
  }

  /**
   * Obtenir la taille de l'historique d'exécution
   */
  getExecutionHistorySize(): number {
    return this.executedCallIds.size;
  }
} 