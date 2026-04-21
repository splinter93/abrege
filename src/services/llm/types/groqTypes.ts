import type { ChatMessage } from '@/types/chat';
import type { AppContext } from '../types';
import type { AgentConfig, LLMResponse, ToolCall, ToolResult } from './agentTypes';

// 🎯 Types pour l'orchestration des rounds
export interface GroqRoundParams {
  message: string;
  appContext: AppContext;
  sessionHistory: ChatMessage[];
  agentConfig?: AgentConfig;
  userToken: string;
  sessionId: string;
}

export interface GroqRoundResult {
  success: boolean;
  content?: string;
  reasoning?: string;
  tool_calls?: ToolCall[];
  tool_results?: ToolResult[];
  sessionId: string;
  is_relance?: boolean;
  error?: string;
  details?: string;
  status?: number;
  thinking?: unknown[];
  progress?: unknown[];
}

// 🎯 Types pour la construction d'historique - OBSOLÈTE (gardé temporairement pour compatibilité)
// TODO: Supprimer après nettoyage de GroqHistoryBuilder
export interface HistoryBuildContext {
  systemContent: string;
  userMessage: string;
  cleanedHistory: ChatMessage[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
}

export interface HistoryBuildResult {
  messages: ChatMessage[];
  validationErrors: string[];
  isValid: boolean;
}

// 🎯 Types pour l'exécution des tools
export interface ToolExecutionResult {
  tool_call_id: string;
  name: string;
  result: unknown;
  success: boolean;
  timestamp: string;
}

export interface ToolExecutionContext {
  userToken: string;
  batchId: string;
  maxRetries: number;
}

// 🎯 Types pour la validation
export interface ToolCallValidationResult {
  isValid: boolean;
  errors: string[];
}

// 🎯 Types pour la gestion des erreurs
export interface ErrorAnalysisResult {
  hasFailedTools: boolean;
  hasAuthErrors: boolean;
  errorCodes: string[];
  canRetry: boolean;
}

// 🎯 Configuration des limites
export interface GroqLimits {
  maxToolCalls: number;
  maxRelances: number;
  maxContextMessages: number;
  maxHistoryMessages: number;
}

// 🎯 Configuration par défaut
export const DEFAULT_GROQ_LIMITS: GroqLimits = {
  maxToolCalls: 20,
  maxRelances: 10, // 🔧 NOUVEAU: 10 relances maximum pour chaînages complexes, avec mécanismes robustes
  maxContextMessages: 50, // 🔧 CORRECTION: Augmenté de 25 à 50 pour garder l'historique des tool calls
  maxHistoryMessages: 100 // 🔧 CORRECTION: Augmenté de 50 à 100 pour plus de contexte
};

// 🆕 NOUVEAUX TYPES POUR LA PERSISTANCE ET L'ORCHESTRATION ROBUSTE

// 🎯 Types pour la persistance batch
export interface BatchPersistResult {
  success: boolean;
  applied: boolean;
  messagesPersisted: number;
  operationId: string;
  relanceIndex: number;
  sessionUpdatedAt: string;
}

// 🎯 Types pour la validation des messages tool
export interface ToolValidationResult {
  isValid: boolean;
  errors: string[];
}

// 🎯 Types pour l'API batch
export interface BatchAPIResponse {
  applied: boolean;
  updated_at: string;
}

// 🎯 Types pour le contexte de relance
export interface RelanceContext {
  roundId: string;
  operationId: string;
  relanceIndex: number;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  thread: ChatMessage[];
}

// 🎯 États de la FSM
export type RoundState = 
  | 'IDLE'
  | 'CALL_MODEL_1'
  | 'EXECUTE_TOOLS'
  | 'PERSIST_TOOLS_BATCH'
  | 'RELOAD_THREAD'
  | 'CALL_MODEL_2'
  | 'DONE'
  | 'ERROR';

// 🎯 Contexte du round avec FSM
export interface RoundContext {
  roundId: string;
  sessionId: string;
  currentState: RoundState;
  previousState: RoundState;
  stateHistory: Array<{ state: RoundState; timestamp: string; reason?: string }>;
  lockAcquired: boolean;
  lockExpiresAt: string;
}

// 🎯 Données du round
export interface RoundData {
  userMessage: string;
  systemContent: string;
  firstResponse: LLMResponse | null;
  toolCalls: ToolCall[];
  toolResults: ToolExecutionResult[];
  secondResponse: LLMResponse | null;
  finalResult: GroqRoundResult;
}

// 🎯 Configuration de l'API batch
export interface BatchApiConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  idempotencyKey: string;
}

// 🎯 Payload pour l'API batch
export interface BatchApiPayload {
  messages: Array<{
    role: 'assistant' | 'tool';
    content?: string | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
  }>;
  operationId: string;
  sessionId: string;
  roundId: string;
}

// 🎯 Réponse de l'API batch
export interface BatchApiResponse {
  success: boolean;
  applied: boolean;
  operationId: string;
  messageIds: string[];
  sequence: number;
  error?: string;
}

// 🎯 Schémas de validation Zod
export interface ValidationSchemas {
  assistantWithToolCalls: unknown;
  toolMessage: unknown;
  batchPayload: unknown;
}

// 🎯 Métriques du round
export interface RoundMetrics {
  roundId: string;
  sessionId: string;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  toolCallsCount: number;
  toolResultsCount: number;
  stateTransitions: number;
  errors: string[];
  conflicts409: number;
  appliedFalse: number;
}

// 🎯 Configuration de la FSM
export interface FSMConfig {
  enableStrictMode: boolean;
  requirePersistBeforeReload: boolean;
  enableConcurrencyLock: boolean;
  lockTimeoutMs: number;
  maxStateTransitions: number;
}

// 🎯 Configuration par défaut de la FSM
export const DEFAULT_FSM_CONFIG: FSMConfig = {
  enableStrictMode: true,
  requirePersistBeforeReload: true,
  enableConcurrencyLock: true,
  lockTimeoutMs: 30000, // 30 secondes
  maxStateTransitions: 10
}; 