import { simpleLogger as logger } from '@/utils/logger';
import { OpenApiToolExecutor } from './openApiToolExecutor';
import { ApiV2ToolExecutor } from './executors/ApiV2ToolExecutor';
import { ChatMessage } from '@/types/chat';
import { createHash } from 'crypto';
import type { ToolCall } from './types/strictTypes';

export interface ToolCallResult {
  tool_call_id: string;
  name: string;
  result: unknown;
  success: boolean;
  timestamp: string;
}

export class ToolCallManager {
  private static instance: ToolCallManager;
  private openApiExecutor: OpenApiToolExecutor;
  private apiV2ToolExecutor: ApiV2ToolExecutor;
  
  // ✅ Protection contre les duplications
  private executedCallIds: Set<string> = new Set(); // Par ID
  private executedFunctionHashes: Set<string> = new Set(); // ✅ Par contenu (hash)
  private executionLocks: Map<string, Promise<ToolCallResult>> = new Map(); // ✅ Locks atomiques
  private duplicateAttempts: Map<string, number> = new Map(); // ✅ Monitoring

  static getInstance(): ToolCallManager {
    if (!ToolCallManager.instance) {
      ToolCallManager.instance = new ToolCallManager();
    }
    return ToolCallManager.instance;
  }

  private constructor() {
    this.openApiExecutor = OpenApiToolExecutor.getInstance();
    this.apiV2ToolExecutor = new ApiV2ToolExecutor();
  }

  /**
   * 🔒 Calculer un hash unique basé sur le contenu de la fonction (nom + arguments)
   * Permet de détecter les doublons même si les IDs sont différents
   */
  private getFunctionHash(toolCall: ToolCall): string {
    try {
      const { name, arguments: args } = toolCall.function;
      // Parser et normaliser les arguments pour éviter les différences de formatting
      const parsed = typeof args === 'string' ? JSON.parse(args) : args;
      const normalized = JSON.stringify({ name, args: parsed });
      return createHash('sha256').update(normalized).digest('hex');
    } catch (error) {
      // En cas d'erreur de parsing, utiliser la string brute
      const { name, arguments: args } = toolCall.function;
      return createHash('sha256').update(`${name}:${args}`).digest('hex');
    }
  }

  /**
   * ✅ Exécuter un tool call avec protection contre les duplications
   * Protection par ID ET par contenu (hash) + locks atomiques
   */
  async executeToolCall(
    toolCall: ToolCall,
    userToken: string,
    maxRetries: number = 3,
    options?: { batchId?: string }
  ): Promise<ToolCallResult> {
    const { id, function: func } = toolCall;
    
    if (!func?.name) {
      throw new Error('Tool call invalide: nom de fonction manquant');
    }

    // 🔒 Calculer le hash du contenu pour détecter les doublons sémantiques
    const contentHash = this.getFunctionHash(toolCall);

    // ✅ PROTECTION 1: Vérifier par ID ET par contenu
    if (this.executedCallIds.has(id) || this.executedFunctionHashes.has(contentHash)) {
      // Incrémenter le compteur de tentatives de duplication
      const count = (this.duplicateAttempts.get(contentHash) || 0) + 1;
      this.duplicateAttempts.set(contentHash, count);
      
      // Logger avec niveau approprié selon la fréquence
      if (count >= 3) {
        logger.error(`[ToolCallManager] 🚨 DUPLICATION CRITIQUE: ${count}x tentatives pour ${func.name}`, {
          id,
          contentHash: contentHash.substring(0, 16) + '...',
          args: func.arguments?.substring(0, 100)
        });
      } else {
        logger.warn(`[ToolCallManager] ⚠️ Duplication détectée (${count}x): ${func.name} [ID: ${id}]`, {
          byId: this.executedCallIds.has(id),
          byContent: this.executedFunctionHashes.has(contentHash)
        });
      }
      
      return {
        tool_call_id: id,
        name: func.name,
        result: { 
          success: false, 
          error: `Tool call déjà exécuté (tentative ${count})`,
          duplicate_count: count,
          detected_by: this.executedCallIds.has(id) ? 'id' : 'content'
        },
        success: false,
        timestamp: new Date().toISOString()
      };
    }

    // ✅ PROTECTION 2: Lock atomique pour éviter les race conditions
    if (this.executionLocks.has(contentHash)) {
      logger.warn(`[ToolCallManager] ⏳ Tool call ${func.name} déjà en cours d'exécution, attente du résultat...`);
      try {
        return await this.executionLocks.get(contentHash)!;
      } catch (error) {
        logger.error(`[ToolCallManager] ❌ Erreur lors de l'attente du lock:`, error);
        throw error;
      }
    }

    // 🔒 Créer le lock et démarrer l'exécution
    const executionPromise = this._executeToolCallInternal(toolCall, userToken, maxRetries, options, contentHash);
    this.executionLocks.set(contentHash, executionPromise);

    try {
      const result = await executionPromise;
      return result;
    } finally {
      // ✅ Libérer le lock après un court délai (pour les appels concurrents rapides)
      setTimeout(() => {
        this.executionLocks.delete(contentHash);
      }, 1000);
    }
  }

  /**
   * 🔧 Exécution interne du tool call (appelée avec lock)
   */
  private async _executeToolCallInternal(
    toolCall: ToolCall,
    userToken: string,
    maxRetries: number = 3,
    options?: { batchId?: string },
    contentHash?: string
  ): Promise<ToolCallResult> {
    const { id, function: func } = toolCall;
    const hash = contentHash || this.getFunctionHash(toolCall);

    // ✅ Marquer comme exécuté (par ID ET par contenu)
    this.executedCallIds.add(id);
    this.executedFunctionHashes.add(hash);
    
    // ✅ Réinitialiser le compteur de duplication après exécution réussie
    this.duplicateAttempts.delete(hash);

    // ✅ Nettoyer après 5 minutes
    setTimeout(() => {
      this.executedCallIds.delete(id);
      this.executedFunctionHashes.delete(hash);
    }, 5 * 60 * 1000);

    try {
      // 📊 Log de début d'exécution avec hash pour tracking
      const executionStart = Date.now();
      logger.info(`[ToolCallManager] 🔧 Exécution de ${func.name} via ApiV2ToolExecutor...`, {
        id: id.substring(0, 16) + '...',
        contentHash: hash.substring(0, 16) + '...',
        batchId: options?.batchId
      });
      
      const args = this.parseArguments(func.arguments);
      logger.dev(`[ToolCallManager] 📋 Arguments parsés:`, args);
      
      // Utiliser l'ApiV2ToolExecutor pour l'exécution
      const toolResult = await this.apiV2ToolExecutor.executeToolCall(
        {
          id,
          type: 'function',
          function: {
            name: func.name,
            arguments: func.arguments
          }
        },
        userToken
      );
      
      const executionDuration = Date.now() - executionStart;
      logger.info(`[ToolCallManager] ✅ Tool ${func.name} exécuté avec succès (${executionDuration}ms)`, {
        success: toolResult.success,
        hash: hash.substring(0, 16) + '...'
      });
      
      // 📊 Logger les stats si plus de 5 exécutions
      if (this.executedCallIds.size >= 5) {
        const stats = this.getDuplicationStats();
        logger.dev(`[ToolCallManager] 📊 Stats actuelles:`, stats);
      }
      
      return {
        tool_call_id: id,
        name: func.name,
        result: toolResult,
        success: toolResult.success,
        timestamp: new Date().toISOString()
      };

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

  private parseArguments(argumentsStr: string): Record<string, unknown> {
    try { 
      const parsed = typeof argumentsStr === 'string' ? JSON.parse(argumentsStr || '{}') : (argumentsStr || {});
      
      // 🔧 CORRECTION: Nettoyer les paramètres null pour éviter les erreurs Groq
      const cleaned = this.cleanNullParameters(parsed);
      return cleaned;
    }
    catch { return { _raw: argumentsStr }; }
  }

  /**
   * Nettoie les paramètres null des arguments de tool call
   * L'API Groq ne supporte pas les valeurs null pour les paramètres de type string
   */
  private cleanNullParameters(args: unknown): Record<string, unknown> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      return {};
    }

    const cleaned: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
      // Si la valeur est null, undefined, ou une chaîne vide, on l'omet complètement
      if (value === null || value === undefined || value === '') {
        logger.dev(`[ToolCallManager] 🧹 Suppression du paramètre invalide: ${key} = ${value}`);
        continue;
      }
      
      // Si c'est un objet, nettoyer récursivement
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = this.cleanNullParameters(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    logger.dev(`[ToolCallManager] 🧹 Arguments nettoyés:`, { original: args, cleaned });
    return cleaned;
  }

  private normalizeResult(rawResult: unknown, toolName: string, args: Record<string, unknown>): Record<string, unknown> {
    if (rawResult && typeof rawResult === 'object' && 'success' in rawResult) {
      return rawResult as Record<string, unknown>;
    }
    return { success: true, data: rawResult, tool: toolName, args };
  }

  private detectErrorCode(error: unknown): string {
    const errorObj = error as { message?: string } | undefined;
    const t = String(errorObj?.message || error || '').toLowerCase();
    if (t.includes('timeout')) return 'TIMEOUT';
    if (t.includes('forbidden') || t.includes('permission')) return 'FORBIDDEN';
    if (t.includes('rls')) return 'RLS_DENIED';
    if (t.includes('not found')) return 'NOT_FOUND';
    if (t.includes('zod') || t.includes('validation')) return 'VALIDATION_ERROR';
    return 'UNKNOWN';
  }

  clearExecutionHistory(): void {
    this.executedCallIds.clear();
    this.executedFunctionHashes.clear();
    this.executionLocks.clear();
    this.duplicateAttempts.clear();
    logger.dev('[ToolCallManager] 🔄 Historique d\'exécution réinitialisé (IDs, hashs, locks, compteurs)');
  }

  /**
   * Obtenir la taille de l'historique d'exécution
   */
  getExecutionHistorySize(): number {
    return this.executedCallIds.size;
  }

  /**
   * 📊 Obtenir les statistiques de duplication
   */
  getDuplicationStats(): {
    totalExecuted: number;
    uniqueByContent: number;
    duplicateAttempts: number;
    activeLocks: number;
  } {
    return {
      totalExecuted: this.executedCallIds.size,
      uniqueByContent: this.executedFunctionHashes.size,
      duplicateAttempts: Array.from(this.duplicateAttempts.values()).reduce((sum, count) => sum + count, 0),
      activeLocks: this.executionLocks.size
    };
  }
} 