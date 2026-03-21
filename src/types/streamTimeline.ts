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
  /** Si présent : outil MCP (Liminality/Synesia), server_label */
  mcp_server?: string;
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
  /** Si présent : outil MCP, server_label */
  mcp_server?: string;
}

/**
 * Événement de mise à jour d'un plan dans le stream
 */
export interface StreamPlanEvent {
  type: 'plan';
  title?: string;
  steps: Array<{
    id: string;
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  timestamp: number;
  /** Dernier tool_call_id __plan_update (debug / clé React stable) */
  toolCallId?: string;
}

/**
 * Union type pour tous les événements possibles
 */
export type StreamTimelineItem = 
  | StreamTextEvent 
  | StreamToolExecutionEvent 
  | StreamToolResultEvent
  | StreamPlanEvent;

/**
 * Timeline complète d'un message streamed
 */
export interface StreamTimeline {
  items: StreamTimelineItem[];
  startTime: number;
  endTime?: number;
}




