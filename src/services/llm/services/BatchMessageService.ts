import { simpleLogger as logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service de persistance atomique des messages tool via l'API batch
 * Gère l'idempotence, la concurrence et la validation stricte
 */
export class BatchMessageService {
  private static instance: BatchMessageService;

  private constructor() {}

  static getInstance(): BatchMessageService {
    if (!BatchMessageService.instance) {
      BatchMessageService.instance = new BatchMessageService();
    }
    return BatchMessageService.instance;
  }

  /**
   * Persiste un batch de messages tool de manière atomique
   * @param sessionId ID de la session
   * @param toolCalls Tool calls à persister
   * @param toolResults Résultats des tools
   * @param operationId ID d'opération unique pour cette relance
   * @param relanceIndex Index de la relance (0-based)
   * @param includeAssistantMessage Si true, inclut le message assistant avec tool_calls
   * @param assistantMessage Message assistant à inclure si nécessaire
   * @returns Résultat de la persistance
   */
  async persistToolMessages(
    sessionId: string,
    toolCalls: any[],
    toolResults: any[],
    operationId: string,
    relanceIndex: number,
    includeAssistantMessage: boolean = false,
    assistantMessage?: any
  ): Promise<BatchPersistResult> {
    try {
      logger.info(`[BatchMessageService] 💾 Persistance batch (op: ${operationId}, relance: ${relanceIndex})`);

      // 1. Validation stricte des messages tool
      const validationResult = this.validateToolMessages(toolCalls, toolResults);
      if (!validationResult.isValid) {
        logger.error(`[BatchMessageService] ❌ Validation échouée:`, validationResult.errors);
        throw new Error(`Messages tool invalides: ${validationResult.errors.join(', ')}`);
      }

      // 2. Construction des messages à persister
      const messagesToPersist = this.buildMessagesToPersist(
        toolCalls,
        toolResults,
        relanceIndex,
        includeAssistantMessage,
        assistantMessage
      );

      // 3. Appel à l'API batch avec retry et gestion des conflits
      const batchResult = await this.callBatchAPI(sessionId, messagesToPersist, operationId, relanceIndex);

      logger.info(`[BatchMessageService] ✅ Persistance réussie:`, {
        operationId,
        relanceIndex,
        messagesPersisted: messagesToPersist.length,
        applied: batchResult.applied
      });

      return {
        success: true,
        applied: batchResult.applied,
        messagesPersisted: messagesToPersist.length,
        operationId,
        relanceIndex,
        sessionUpdatedAt: batchResult.updated_at
      };

    } catch (error) {
      logger.error(`[BatchMessageService] ❌ Erreur persistance:`, error);
      throw error;
    }
  }

  /**
   * Valide strictement les messages tool
   */
  private validateToolMessages(toolCalls: any[], toolResults: any[]): ToolValidationResult {
    const errors: string[] = [];

    // Vérifier la correspondance 1:1
    if (toolCalls.length !== toolResults.length) {
      errors.push(`Mismatch tool_calls (${toolCalls.length}) vs tool_results (${toolResults.length})`);
    }

    // Validation de chaque tool call
    toolCalls.forEach((toolCall, index) => {
      if (!toolCall.id || typeof toolCall.id !== 'string') {
        errors.push(`Tool call ${index}: id invalide`);
      }
      if (!toolCall.function?.name || typeof toolCall.function.name !== 'string') {
        errors.push(`Tool call ${index}: nom de fonction invalide`);
      }
      if (!toolCall.function?.arguments || typeof toolCall.function.arguments !== 'string') {
        errors.push(`Tool call ${index}: arguments invalides`);
      }
    });

    // Validation de chaque tool result
    toolResults.forEach((result, index) => {
      if (!result.tool_call_id || typeof result.tool_call_id !== 'string') {
        errors.push(`Tool result ${index}: tool_call_id invalide`);
      }
      if (!result.name || typeof result.name !== 'string') {
        errors.push(`Tool result ${index}: nom invalide`);
      }
      if (result.result === undefined) {
        errors.push(`Tool result ${index}: résultat manquant`);
      }
    });

    // Vérifier la cohérence des IDs
    const toolCallIds = new Set(toolCalls.map(tc => tc.id));
    const resultIds = new Set(toolResults.map(tr => tr.tool_call_id));
    
    for (const id of toolCallIds) {
      if (!resultIds.has(id)) {
        errors.push(`Tool call ID ${id} n'a pas de résultat correspondant`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Construit les messages à persister
   */
  private buildMessagesToPersist(
    toolCalls: any[],
    toolResults: any[],
    relanceIndex: number,
    includeAssistantMessage: boolean,
    assistantMessage?: any
  ): any[] {
    const messages: any[] = [];

    // 1. Message assistant avec tool_calls (si demandé et pas encore en DB)
    if (includeAssistantMessage && assistantMessage) {
      const assistantMsg = {
        role: 'assistant' as const,
        content: assistantMessage.content || null,
        tool_calls: toolCalls,
        timestamp: new Date().toISOString(),
        relance_index: relanceIndex
      };
      messages.push(assistantMsg);
    }

    // 2. Messages tool dans l'ordre EXACT des tool_calls
    const toolMessages = toolCalls.map((toolCall, index) => {
      const toolResult = toolResults[index];
      if (!toolResult) {
        throw new Error(`Tool result manquant pour tool call ${index}`);
      }

      return {
        role: 'tool' as const,
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
        content: this.normalizeToolContent(toolResult.result),
        timestamp: new Date().toISOString(),
        relance_index: relanceIndex,
        success: toolResult.success,
        error: toolResult.result?.error || null,
        duration_ms: toolResult.duration_ms
      };
    });

    messages.push(...toolMessages);

          logger.dev(`[BatchMessageService] 🔧 Messages construits:`, {
        assistantMessage: includeAssistantMessage,
        toolMessages: toolMessages.length,
        total: messages.length
      });

    return messages;
  }

  /**
   * Normalise le contenu des messages tool (toujours string JSON)
   */
  private normalizeToolContent(result: any): string {
    try {
      if (typeof result === 'string') {
        // Vérifier si c'est déjà du JSON valide
        JSON.parse(result);
        return result;
      } else {
        // Convertir en JSON string
        return JSON.stringify(result);
      }
    } catch {
      // Si ce n'est pas du JSON valide, le stringifier
      return JSON.stringify(result);
    }
  }

  /**
   * Appelle l'API batch avec gestion des conflits
   */
  private async callBatchAPI(
    sessionId: string,
    messages: any[],
    operationId: string,
    relanceIndex: number
  ): Promise<BatchAPIResponse> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        logger.dev(`[BatchMessageService] 🔄 Tentative ${attempt}/${maxRetries} pour l'API batch`);

        const response = await fetch(`/api/ui/chat-sessions/${sessionId}/messages/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': operationId,
            'X-Relance-Index': relanceIndex.toString(),
            'X-Operation-ID': operationId
          },
          body: JSON.stringify({
            messages,
            operation_id: operationId,
            relance_index: relanceIndex
          })
        });

        if (response.ok) {
          const result = await response.json();
          return {
            applied: result.success,
            updated_at: result.data?.session?.updated_at || new Date().toISOString()
          };
        }

        if (response.status === 409) {
          // Conflit ETag - refetch et replay
          logger.warn(`[BatchMessageService] ⚠️ Conflit ETag (tentative ${attempt})`);
          await this.handleETagConflict(sessionId, operationId, relanceIndex);
          continue; // Retry avec le nouvel ETag
        }

        if (response.status === 422) {
          // Erreur de validation - ne pas retry
          const errorText = await response.text();
          throw new Error(`Validation échouée (422): ${errorText}`);
        }

        // Autres erreurs - retry si possible
        const errorText = await response.text();
        throw new Error(`Erreur API (${response.status}): ${errorText}`);

      } catch (error) {
        if (attempt >= maxRetries) {
          throw error;
        }
        
        logger.warn(`[BatchMessageService] ⚠️ Tentative ${attempt} échouée, retry...`, error);
        await this.delay(1000 * attempt); // Backoff exponentiel
      }
    }

    throw new Error(`Échec après ${maxRetries} tentatives`);
  }

  /**
   * Gère les conflits ETag (409)
   */
  private async handleETagConflict(sessionId: string, operationId: string, relanceIndex: number): Promise<void> {
    try {
      // Refetch de la session pour obtenir le nouvel ETag
      const sessionResponse = await fetch(`/api/ui/chat-sessions/${sessionId}`);
      if (!sessionResponse.ok) {
        throw new Error(`Impossible de refetch la session: ${sessionResponse.status}`);
      }

      const session = await sessionResponse.json();
      logger.info(`[BatchMessageService] 🔄 Session refetchée après conflit ETag`);

      // Note: Le replay sera géré par la boucle de retry
    } catch (error) {
      logger.error(`[BatchMessageService] ❌ Erreur gestion conflit ETag:`, error);
      throw error;
    }
  }

  /**
   * Délai avec backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Types pour le service
export interface BatchPersistResult {
  success: boolean;
  applied: boolean;
  messagesPersisted: number;
  operationId: string;
  relanceIndex: number;
  sessionUpdatedAt: string;
}

export interface ToolValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BatchAPIResponse {
  applied: boolean;
  updated_at: string;
} 