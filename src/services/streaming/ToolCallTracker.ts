/**
 * ToolCallTracker - Track et déduplique les tool calls
 * 
 * Responsabilité unique : Gérer l'état des tool calls et éviter les duplications
 * 
 * @module services/streaming/ToolCallTracker
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ToolCall } from '@/hooks/useChatHandlers';

/**
 * Service pour tracker les tool calls et éviter les notifications doubles
 */
export class ToolCallTracker {
  // Map global de tous les tool calls (ID → ToolCall)
  private readonly allToolCalls: Map<string, ToolCall>;
  
  // Set des tool calls déjà notifiés (onToolCalls)
  private readonly notifiedToolCallIds: Set<string>;
  
  // Set des tool calls déjà notifiés pour exécution (onToolExecution)
  private readonly executionNotifiedToolCallIds: Set<string>;
  
  // Map du round actuel (réinitialisé après chaque tool_execution)
  private readonly currentRoundToolCalls: Map<string, ToolCall>;

  constructor() {
    this.allToolCalls = new Map();
    this.notifiedToolCallIds = new Set();
    this.executionNotifiedToolCallIds = new Set();
    this.currentRoundToolCalls = new Map();
  }

  /**
   * Ajoute un tool call (avec accumulation progressive des arguments si streaming)
   * @param toolCall - Tool call à ajouter
   */
  addToolCall(toolCall: {
    id: string;
    type?: string;
    function?: {
      name?: string;
      arguments?: string;
    };
  }): void {
    const tc: ToolCall = {
      id: toolCall.id,
      type: 'function',
      function: {
        name: toolCall.function?.name || '',
        arguments: toolCall.function?.arguments || ''
      }
    };

    // Ajouter au round actuel
    if (!this.currentRoundToolCalls.has(tc.id)) {
      this.currentRoundToolCalls.set(tc.id, tc);
      this.allToolCalls.set(tc.id, tc);
    } else {
      // Accumuler arguments progressifs (streaming)
      const existing = this.currentRoundToolCalls.get(tc.id)!;
      if (tc.function.name) existing.function.name = tc.function.name;
      if (tc.function.arguments) existing.function.arguments += tc.function.arguments;
      
      // Mettre à jour aussi dans le Map global
      const globalExisting = this.allToolCalls.get(tc.id);
      if (globalExisting) {
        if (tc.function.name) globalExisting.function.name = tc.function.name;
        if (tc.function.arguments) globalExisting.function.arguments += tc.function.arguments;
      }
    }
  }

  /**
   * Retourne les tool calls non encore notifiés (onToolCalls)
   * @returns Array de tool calls
   */
  getNewToolCallsForNotification(): ToolCall[] {
    return Array.from(this.allToolCalls.values()).filter(
      tc => !this.notifiedToolCallIds.has(tc.id)
    );
  }

  /**
   * Retourne les tool calls non encore notifiés pour exécution (onToolExecution)
   * @returns Array de tool calls
   */
  getNewToolCallsForExecution(): ToolCall[] {
    return Array.from(this.allToolCalls.values()).filter(
      tc => !this.executionNotifiedToolCallIds.has(tc.id)
    );
  }

  /**
   * Marque des tool calls comme notifiés (onToolCalls)
   * @param toolCalls - Tool calls à marquer
   */
  markNotified(toolCalls: ToolCall[]): void {
    toolCalls.forEach(tc => this.notifiedToolCallIds.add(tc.id));
  }

  /**
   * Marque des tool calls comme notifiés pour exécution (onToolExecution)
   * @param toolCalls - Tool calls à marquer
   */
  markExecutionNotified(toolCalls: ToolCall[]): void {
    toolCalls.forEach(tc => this.executionNotifiedToolCallIds.add(tc.id));
  }

  /**
   * Réinitialise le round actuel (après tool_execution)
   */
  clearCurrentRound(): void {
    this.currentRoundToolCalls.clear();
  }

  /**
   * Retourne tous les tool calls accumulés
   * @returns Array de tool calls
   */
  getAllToolCalls(): ToolCall[] {
    return Array.from(this.allToolCalls.values());
  }

  /**
   * Réinitialise complètement le tracker
   */
  reset(): void {
    this.allToolCalls.clear();
    this.notifiedToolCallIds.clear();
    this.executionNotifiedToolCallIds.clear();
    this.currentRoundToolCalls.clear();
  }

  /**
   * Retourne l'état du tracker (pour debug)
   */
  getState(): {
    totalToolCalls: number;
    notified: number;
    executionNotified: number;
    currentRound: number;
  } {
    return {
      totalToolCalls: this.allToolCalls.size,
      notified: this.notifiedToolCallIds.size,
      executionNotified: this.executionNotifiedToolCallIds.size,
      currentRound: this.currentRoundToolCalls.size
    };
  }
}

