import { simpleLogger as logger } from '@/utils/logger';
import { agentApiV2Tools } from '@/services/agentApiV2Tools';
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
  // Historique d'exécution (clé libre) pour mesurer la pression et nettoyage
  private executionHistory: Set<string> = new Set();
  // 🔧 Anti-boucle 1: IDs de tool_call déjà exécutés (évite exécution du même appel)
  private executedCallIds: Set<string> = new Set();
  // 🔧 Anti-boucle 2: Signatures récentes nom+arguments normalisés → timestamp (TTL court)
  // signature → { ts, batchId }
  private recentSignatureTimestamps: Map<string, { ts: number; batchId?: string }> = new Map();

  static getInstance(): ToolCallManager {
    if (!ToolCallManager.instance) {
      ToolCallManager.instance = new ToolCallManager();
    }
    return ToolCallManager.instance;
  }

  /**
   * Normalise les arguments (objet, clés triées) et construit la signature logique
   */
  private buildSignature(funcName: string, argsInput: any): string {
    try {
      const args = this.parseArguments(argsInput);
      const sorted = Object.keys(args).sort().reduce((acc: any, k: string) => { acc[k] = args[k]; return acc; }, {});
      return `${funcName}::${JSON.stringify(sorted)}`;
    } catch {
      return `${funcName}::${typeof argsInput === 'string' ? argsInput : JSON.stringify(argsInput || {})}`;
    }
  }

  /**
   * 🔧 Exécuter un tool call avec gestion des boucles infinies
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

    // 🔐 Sécurité: pression globale → nettoyage soft si trop d'entrées
    if (this.executionHistory.size > 200) {
      logger.warn(`[ToolCallManager] ⚠️ Trop d'entrées dans l'historique (${this.executionHistory.size}) - nettoyage partiel`);
      this.clearExecutionHistory();
    }

    // 🔧 ANTI-BOUCLE: Empêcher la ré-exécution du même tool_call_id
    if (this.executedCallIds.has(id)) {
      logger.warn(`[ToolCallManager] ⚠️ tool_call_id ${id} déjà exécuté - anti-boucle`);
      return {
        tool_call_id: id,
        name: func.name,
        result: { success: false, error: 'Tool call déjà exécuté', code: 'ANTI_LOOP_ID' },
        success: false,
        timestamp: new Date().toISOString()
      };
    }

    // 🔧 ANTI-BOUCLE (TTL 30s): Empêcher la ré-exécution immédiate du même tool (même nom+args)
    const signature = this.buildSignature(func.name, func.arguments);
    const now = Date.now();
    const last = this.recentSignatureTimestamps.get(signature);
    const TTL_MS = 30_000;
    if (last && (now - last.ts < TTL_MS)) {
      // Si le dernier appel avec cette signature est dans le même batch, on autorise
      if (!options?.batchId || last.batchId !== options.batchId) {
        logger.warn(`[ToolCallManager] ⚠️ Tool ${func.name} ignoré (signature récente <30s) - anti-boucle`);
        return {
          tool_call_id: id,
          name: func.name,
          result: { success: false, error: 'Signature exécutée très récemment (<30s)', code: 'ANTI_LOOP_SIGNATURE' },
          success: false,
          timestamp: new Date().toISOString()
        };
      }
    }

    // Marquer ID et signature comme utilisés (avec batchId)
    this.executedCallIds.add(id);
    this.recentSignatureTimestamps.set(signature, { ts: now, batchId: options?.batchId });

    // Traces dans l'historique pour supervision
    const histKey = `${func.name}-${id}-${now}`;
    this.executionHistory.add(histKey);
    setTimeout(() => {
      this.executionHistory.delete(histKey);
      // Expiration de l'ID exécuté (5 min)
      this.executedCallIds.delete(id);
    }, 5 * 60 * 1000);
    // Expiration de la signature plus courte (30s)
    setTimeout(() => {
      // Ne pas supprimer si ré-écrite plus récemment
      const rec = this.recentSignatureTimestamps.get(signature);
      if (rec && rec.ts <= now) this.recentSignatureTimestamps.delete(signature);
    }, TTL_MS + 500);

    try {
      const args = this.parseArguments(func.arguments);
      logger.info(`[ToolCallManager] 🔧 Exécution de ${func.name}...`);

      // Exécuter le tool avec timeout
      const toolCallPromise = agentApiV2Tools.executeTool(func.name, args, userToken);
      const timeoutPromise = new Promise((resolve) => { 
        setTimeout(() => resolve({ success: false, error: 'Timeout tool call (15s)' }), 15000); 
      });
      const rawResult = await Promise.race([toolCallPromise, timeoutPromise]);

      // Normaliser le résultat
      const normalized = this.normalizeResult(rawResult, func.name, args);
      logger.info(`[ToolCallManager] ✅ Tool ${func.name} exécuté avec succès`);

      return {
        tool_call_id: id,
        name: func.name,
        result: normalized,
        success: normalized.success !== false && !normalized.error,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error(`[ToolCallManager] ❌ Échec de l'exécution du tool ${func.name}:`, error);
      const normalized = { 
        success: false, 
        code: this.detectErrorCode(error),
        message: `❌ ÉCHEC : ${error instanceof Error ? error.message : String(error)}`, 
        details: { raw: error instanceof Error ? error.stack || error.message : String(error) }, 
        tool_name: func.name, 
        tool_args: func.arguments, 
        timestamp: new Date().toISOString() 
      };

      return {
        tool_call_id: id,
        name: func.name,
        result: normalized,
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
    this.executionHistory.clear();
    this.executedCallIds.clear();
    this.recentSignatureTimestamps.clear();
  }

  getExecutionHistorySize(): number {
    return this.executionHistory.size;
  }
} 