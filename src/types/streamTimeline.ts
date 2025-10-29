/**
 * Types pour capturer la chronologie exacte du streaming
 * La timeline reflète l'ordre réel des événements pendant le stream
 */

/**
 * Événement de texte dans le stream
 */
export interface StreamTextEvent {
  type: 'text';
  content: string;
  timestamp: number;
  roundNumber?: number;
}

/**
 * Événement d'exécution de tools dans le stream
 */
export interface StreamToolExecutionEvent {
  type: 'tool_execution';
  toolCalls: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
    success?: boolean; // ✅ Statut du résultat (ajouté après exécution)
    result?: string; // ✅ Résultat du tool call (ajouté après exécution)
  }>;
  toolCount: number;
  timestamp: number;
  roundNumber: number;
}

/**
 * Événement de résultat de tool dans le stream
 */
export interface StreamToolResultEvent {
  type: 'tool_result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  success: boolean;
  timestamp: number;
}

/**
 * Union type pour tous les événements possibles
 */
export type StreamTimelineItem = 
  | StreamTextEvent 
  | StreamToolExecutionEvent 
  | StreamToolResultEvent;

/**
 * Timeline complète d'un message streamed
 */
export interface StreamTimeline {
  items: StreamTimelineItem[];
  startTime: number;
  endTime?: number;
}




