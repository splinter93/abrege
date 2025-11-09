/**
 * Types stricts pour les agents spécialisés
 * Architecture robuste avec validation complète
 */

// ===== TYPES DE BASE =====

export interface AgentId {
  readonly value: string;
  readonly type: 'uuid' | 'slug';
}

export interface UserToken {
  readonly value: string;
  readonly type: 'uuid' | 'jwt';
}

export interface SessionId {
  readonly value: string;
}

// ===== TYPES D'ENTRÉE =====

export interface AgentInput {
  readonly [key: string]: unknown;
  readonly text?: string;
  readonly query?: string;
  readonly question?: string;
  readonly prompt?: string;
  readonly image?: string;
  readonly imageUrl?: string;
  readonly image_url?: string;
}

export interface MultimodalInput extends AgentInput {
  readonly text: string;
  readonly imageUrl: string;
}

// ===== TYPES DE SORTIE =====

export interface AgentResponse {
  readonly success: boolean;
  readonly data?: AgentResponseData;
  readonly error?: string;
  readonly metadata: AgentMetadata;
}

export interface AgentResponseData {
  readonly response: string;
  readonly model: string;
  readonly provider: 'groq';
  readonly confidence?: number;
  readonly changes?: readonly string[];
}

export interface AgentMetadata {
  readonly agentId: string;
  readonly executionTime: number;
  readonly model: string;
  readonly traceId?: string;
  readonly isMultimodal?: boolean;
}

// ===== TYPES D'EXÉCUTION =====

export interface ExecutionContext {
  readonly agentId: AgentId;
  readonly input: AgentInput;
  readonly userToken: UserToken;
  readonly sessionId?: SessionId;
  readonly traceId: string;
}

export interface ExecutionResult {
  readonly success: boolean;
  readonly response?: string;
  readonly error?: string;
  readonly isMultimodal: boolean;
  readonly executionTime: number;
}

// ===== TYPES DE CACHE =====

export interface CachedAgent {
  readonly agent: SpecializedAgentConfig;
  readonly timestamp: number;
  readonly ttl: number;
}

// ===== TYPES DE VALIDATION =====

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

// ===== TYPES D'ERREUR =====

export interface AgentError {
  readonly code: AgentErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly traceId?: string;
}

export type AgentErrorCode = 
  | 'INVALID_TOKEN'
  | 'INVALID_AGENT_ID'
  | 'INVALID_INPUT'
  | 'AGENT_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'EXECUTION_FAILED'
  | 'MULTIMODAL_ERROR'
  | 'CACHE_ERROR'
  | 'UNKNOWN_ERROR';

// ===== TYPES DE CONFIGURATION =====

export interface SpecializedAgentConfig {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly display_name: string;
  readonly description: string;
  readonly model: string;
  readonly provider: 'groq';
  readonly system_instructions: string;
  readonly is_endpoint_agent: boolean;
  readonly is_chat_agent: boolean;
  readonly is_active: boolean;
  readonly priority: number;
  readonly temperature: number;
  readonly max_tokens: number;
  readonly max_completion_tokens?: number;
  readonly top_p: number;
  readonly capabilities: readonly string[];
  readonly api_v2_capabilities: readonly string[];
  readonly input_schema?: OpenAPISchema;
  readonly output_schema?: OpenAPISchema;
  readonly voice?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface OpenAPISchema {
  readonly type: 'object';
  readonly properties: Record<string, OpenAPIProperty>;
  readonly required?: readonly string[];
}

export interface OpenAPIProperty {
  readonly type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  readonly description?: string;
  readonly default?: unknown;
  readonly enum?: readonly unknown[];
}

// ===== TYPES DE CRÉATION =====

export interface CreateSpecializedAgentRequest {
  readonly slug: string;
  readonly name?: string; // Nom complet de l'agent (ex: "Timothy Cavendish"), par défaut = display_name
  readonly display_name: string; // Nom court affiché (ex: "Timothy")
  readonly description: string;
  readonly model: string;
  readonly provider?: 'groq';
  readonly system_instructions: string;
  readonly is_chat_agent?: boolean;
  readonly temperature?: number;
  readonly max_tokens?: number;
  readonly input_schema?: OpenAPISchema;
  readonly output_schema?: OpenAPISchema;
  readonly api_v2_capabilities?: readonly string[];
  readonly voice?: string;
}

export interface CreateSpecializedAgentResponse {
  readonly success: boolean;
  readonly agent?: SpecializedAgentConfig;
  readonly endpoint?: string;
  readonly error?: string;
}

// ===== TYPES DE MÉTRIQUES =====

export interface AgentExecutionMetrics {
  readonly agentId: string;
  readonly success: boolean;
  readonly executionTime: number;
  readonly timestamp: string;
  readonly isMultimodal: boolean;
  readonly model: string;
}

// ===== TYPES DE GROQ MULTIMODAL =====

export interface GroqMultimodalMessage {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string | readonly GroqContentBlock[];
}

export interface GroqContentBlock {
  readonly type: 'text' | 'image_url';
  readonly text?: string;
  readonly image_url?: {
    readonly url: string;
    readonly detail?: 'low' | 'high' | 'auto';
  };
}

export interface GroqMultimodalPayload {
  readonly messages: readonly GroqMultimodalMessage[];
  readonly model: string;
  readonly temperature?: number;
  readonly max_completion_tokens?: number;
  readonly top_p?: number;
  readonly stream?: boolean;
  readonly stop?: string | readonly string[] | null;
}

// ===== TYPES D'ORCHESTRATION =====

export interface AgentOrchestrationResult {
  readonly success: boolean;
  readonly response: string;
  readonly isMultimodal: boolean;
  readonly executionTime: number;
  readonly error?: string;
}
