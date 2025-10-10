/**
 * Types stricts pour le système de tool calls
 * Remplace les 'any' par des types précis
 */

/**
 * Résultat de l'exécution d'un tool (version typée)
 */
export type ToolExecutionResult =
  | ToolExecutionSuccess
  | ToolExecutionError
  | ToolExecutionDuplicate
  | ToolExecutionSkipped;

export interface ToolExecutionSuccess {
  success: true;
  data: unknown;
  duration_ms?: number;
}

export interface ToolExecutionError {
  success: false;
  error: string;
  errorCode?: string;
  details?: unknown;
}

export interface ToolExecutionDuplicate {
  success: false;
  error: string;
  duplicate_count: number;
  detected_by: 'id' | 'content';
}

export interface ToolExecutionSkipped {
  success: false;
  error: string;
  skipped: true;
  reason: string;
}

/**
 * Tool Call (format standardisé)
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/**
 * Tool Result (réponse après exécution)
 */
export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string; // JSON string
  success: boolean;
  timestamp?: string;
}

/**
 * Métadonnées d'un tool call
 */
export interface ToolCallMetadata {
  id: string;
  contentHash: string;
  executionStart: number;
  executionEnd?: number;
  duration?: number;
  retryCount: number;
  wasParallel: boolean;
}

/**
 * Statistiques de duplication
 */
export interface DuplicationStats {
  totalExecuted: number;
  uniqueByContent: number;
  duplicateAttempts: number;
  activeLocks: number;
}

/**
 * Options d'exécution d'un tool call
 */
export interface ToolCallExecutionOptions {
  batchId?: string;
  maxRetries?: number;
  timeout?: number;
  skipCache?: boolean;
}

/**
 * Contexte d'exécution d'un tool
 */
export interface ToolExecutionContext {
  userToken: string;
  sessionId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  metadata?: ToolCallMetadata;
}

