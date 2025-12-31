/**
 * TimelineCapture - Capture la timeline des événements streaming
 * 
 * Responsabilité unique : Enregistrer l'ordre exact des événements (text, tool_execution, tool_result)
 * 
 * @module services/streaming/TimelineCapture
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { StreamTimeline, StreamTimelineItem } from '@/types/streamTimeline';
import type { ToolCall } from '@/hooks/useChatHandlers';

/**
 * Service pour capturer la timeline des événements streaming
 */
export class TimelineCapture {
  private readonly items: StreamTimelineItem[];
  private readonly startTime: number;
  private currentRoundNumber: number;

  constructor() {
    this.items = [];
    this.startTime = Date.now();
    this.currentRoundNumber = 0;
  }

  /**
   * Ajoute un événement text à la timeline
   * @param content - Contenu du texte
   */
  addTextEvent(content: string): void {
    // Fusionner avec l'événement text existant du même round
    const lastEvent = this.items[this.items.length - 1];
    
    if (lastEvent && lastEvent.type === 'text' && lastEvent.roundNumber === this.currentRoundNumber) {
      // Fusionner avec l'événement text existant
      lastEvent.content += content;
    } else {
      // Créer un nouvel événement text
      this.items.push({
        type: 'text',
        content,
        timestamp: Date.now() - this.startTime,
        roundNumber: this.currentRoundNumber
      });
    }
  }

  /**
   * Ajoute un événement tool_execution à la timeline
   * @param toolCalls - Tool calls à exécuter
   * @param toolCount - Nombre de tools
   */
  addToolExecutionEvent(toolCalls: ToolCall[], toolCount: number): void {
    // ✅ DÉDUPLICATION: Extraire les IDs des tool calls déjà présents dans la timeline
    const existingToolCallIds = new Set(
      this.items
        .filter(item => item.type === 'tool_execution')
        .flatMap(item => item.toolCalls.map(tc => tc.id))
    );
    
    // Filtrer les tool calls qui ne sont pas déjà présents
    const newToolCalls = toolCalls.filter(tc => !existingToolCallIds.has(tc.id));
    
    // Si tous les tool calls sont déjà présents, ne pas ajouter de doublon
    if (newToolCalls.length === 0) {
      logger.dev('[TimelineCapture] 🔧 Tool calls déjà présents dans timeline, skip duplication', {
        totalToolCalls: toolCalls.length,
        existingIds: Array.from(existingToolCallIds)
      });
      return;
    }
    
    const toolCallsSnapshot = newToolCalls.map(tc => ({
      id: tc.id,
      type: tc.type as 'function',
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments
      }
    }));

    logger.dev(`[TimelineCapture] 📋 Tool execution capturé pour timeline:`, {
      totalToolCalls: toolCalls.length,
      newToolCalls: toolCallsSnapshot.length,
      skippedDuplicates: toolCalls.length - toolCallsSnapshot.length,
      toolNames: toolCallsSnapshot.map(tc => tc.function.name)
    });

    this.items.push({
      type: 'tool_execution',
      toolCalls: toolCallsSnapshot,
      toolCount: toolCount || toolCallsSnapshot.length,
      timestamp: Date.now() - this.startTime,
      roundNumber: this.currentRoundNumber
    });
  }

  /**
   * Ajoute un événement tool_result à la timeline
   * @param toolCallId - ID du tool call
   * @param toolName - Nom du tool
   * @param result - Résultat
   * @param success - Succès ou échec
   */
  addToolResultEvent(
    toolCallId: string,
    toolName: string,
    result: unknown,
    success: boolean
  ): void {
    this.items.push({
      type: 'tool_result',
      toolCallId,
      toolName,
      result,
      success,
      timestamp: Date.now() - this.startTime
    });
  }

  /**
   * Incrémente le numéro de round (après tool_execution)
   */
  incrementRound(): void {
    this.currentRoundNumber++;
  }

  /**
   * Retourne la timeline complète
   * @returns StreamTimeline
   */
  getTimeline(): StreamTimeline {
    return {
      items: this.items,
      startTime: this.startTime,
      endTime: Date.now()
    };
  }

  /**
   * Retourne les événements text uniquement (pour anti-hallucination)
   * @returns Array d'événements text
   */
  getTextEvents(): Array<{ content: string; roundNumber: number }> {
    return this.items
      .filter((item): item is Extract<StreamTimelineItem, { type: 'text' }> => item.type === 'text')
      .map(item => ({
        content: item.content,
        roundNumber: item.roundNumber || 0
      }));
  }

  /**
   * Vérifie si la timeline contient des tool executions
   * @returns true si au moins 1 tool_execution
   */
  hasToolExecution(): boolean {
    return this.items.some(item => item.type === 'tool_execution');
  }

  /**
   * Réinitialise la timeline
   */
  reset(): void {
    this.items.length = 0;
    this.currentRoundNumber = 0;
  }

  /**
   * Retourne l'état de la timeline (pour debug)
   */
  getState(): {
    itemCount: number;
    textEvents: number;
    toolExecutions: number;
    toolResults: number;
    currentRound: number;
    durationMs: number;
  } {
    return {
      itemCount: this.items.length,
      textEvents: this.items.filter(i => i.type === 'text').length,
      toolExecutions: this.items.filter(i => i.type === 'tool_execution').length,
      toolResults: this.items.filter(i => i.type === 'tool_result').length,
      currentRound: this.currentRoundNumber,
      durationMs: Date.now() - this.startTime
    };
  }
}

