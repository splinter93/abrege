/**
 * Types pour le système d'agents spécialisés
 * Extension de l'architecture existante avec endpoints dédiés
 */

import { Agent } from './chat';

/**
 * Configuration d'un agent spécialisé
 * Extension de l'interface Agent existante
 */
export interface SpecializedAgentConfig extends Agent {
  // Nouvelles propriétés pour agents spécialisés
  // slug, display_name, description sont déjà dans Agent
  is_chat_agent?: boolean;
  is_endpoint_agent?: boolean;
  input_schema?: OpenAPISchema;
  output_schema?: OpenAPISchema;
  priority?: number;
  version?: string;
  openapi_schema_id?: string | null; // Référence vers un schéma OpenAPI réutilisable
  voice?: string;
  is_default?: boolean;
  context_template?: string;
  api_config?: Record<string, unknown> | null;
  is_favorite?: boolean;
  category?: string;
}

/**
 * Schéma OpenAPI pour validation
 */
export interface OpenAPISchema {
  type: 'object';
  properties: Record<string, OpenAPIProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface OpenAPIProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  format?: string;
  enum?: string[];
  items?: OpenAPIProperty;
  properties?: Record<string, OpenAPIProperty>;
  default?: string | number | boolean | null;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Requête pour exécuter un agent spécialisé
 */
export interface SpecializedAgentRequest {
  agentId: string;
  input: Record<string, unknown>;
  userToken: string;
  sessionId?: string;
}

/**
 * Réponse d'un agent spécialisé
 */
export interface SpecializedAgentResponse {
  success: boolean;
  result?: Record<string, unknown>;
  data?: {
    response: string;
    model: string;
    provider: string;
  };
  error?: string;
  metadata?: {
    agentId: string;
    executionTime: number;
    model: string;
    tokensUsed?: number;
  };
}

/**
 * Validation d'entrée
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Configuration pour la création d'un agent spécialisé
 */
export interface CreateSpecializedAgentRequest {
  slug: string;
  name?: string; // Nom complet de l'agent (ex: "Timothy Cavendish"), par défaut = display_name
  display_name: string; // Nom court affiché (ex: "Timothy")
  description: string;
  model: string;
  provider?: string;
  system_instructions: string;
  input_schema?: OpenAPISchema;
  output_schema?: OpenAPISchema;
  is_chat_agent?: boolean;
  temperature?: number;
  max_tokens?: number;
  api_v2_capabilities?: string[];
}

// Modèles Groq supportés
export const SUPPORTED_GROQ_MODELS = {
  // Modèles Llama 4
  'meta-llama/llama-4-maverick-17b-128e-instruct': {
    name: 'Llama 4 Maverick 17B',
    type: 'multimodal',
    contextWindow: 131072,
    maxOutput: 8192,
    capabilities: ['text', 'images', 'tool_use', 'json_mode'],
    description: 'Modèle multimodal avec 128 experts, supporte texte et images'
  },
  'meta-llama/llama-4-scout-17b-16e-instruct': {
    name: 'Llama 4 Scout 17B',
    type: 'multimodal',
    contextWindow: 131072,
    maxOutput: 8192,
    capabilities: ['text', 'images', 'tool_use', 'json_mode'],
    description: 'Modèle multimodal avec 16 experts, optimisé pour le raisonnement et l\'analyse d\'images'
  },
  // Modèles existants
  'deepseek-chat': {
    name: 'DeepSeek Chat',
    type: 'text',
    contextWindow: 32000,
    maxOutput: 4000,
    capabilities: ['text', 'tool_use'],
    description: 'Modèle de chat optimisé pour les conversations'
  },
  'deepseek-vision': {
    name: 'DeepSeek Vision',
    type: 'multimodal',
    contextWindow: 32000,
    maxOutput: 4000,
    capabilities: ['text', 'images', 'tool_use'],
    description: 'Modèle multimodal pour analyse d\'images'
  }
} as const;

export type SupportedGroqModel = keyof typeof SUPPORTED_GROQ_MODELS;

/**
 * Réponse de création d'agent spécialisé
 */
export interface CreateSpecializedAgentResponse {
  success: boolean;
  agent?: SpecializedAgentConfig;
  endpoint?: string;
  error?: string;
}

/**
 * Liste des agents spécialisés
 */
export interface SpecializedAgentsListResponse {
  success: boolean;
  agents: SpecializedAgentConfig[];
  total: number;
}

/**
 * Informations d'un agent spécialisé (pour GET)
 */
export interface SpecializedAgentInfo {
  name: string;
  description: string;
  model: string;
  input_schema?: OpenAPISchema;
  output_schema?: OpenAPISchema;
  is_active: boolean;
  slug: string;
  display_name: string;
}

/**
 * Erreurs spécifiques aux agents spécialisés
 */
export enum SpecializedAgentError {
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  SCHEMA_ERROR = 'SCHEMA_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}

/**
 * Configuration des limites pour les agents spécialisés
 */
export interface SpecializedAgentLimits {
  maxInputSize: number;
  maxExecutionTime: number;
  maxTokensPerRequest: number;
  maxConcurrentRequests: number;
}

/**
 * Métriques d'exécution d'un agent
 */
export interface AgentExecutionMetrics {
  agentId: string;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecuted: Date;
  errorCount: number;
}

/**
 * Configuration de cache pour les agents
 */
export interface AgentCacheConfig {
  enabled: boolean;
  ttl: number; // Time to live en secondes
  maxSize: number;
  strategy: 'lru' | 'fifo' | 'ttl';
}

/**
 * Hook pour la gestion des agents spécialisés
 */
export interface UseSpecializedAgentsReturn {
  agents: SpecializedAgentConfig[];
  loading: boolean;
  error: string | null;
  executeAgent: (agentId: string, input: Record<string, unknown>) => Promise<SpecializedAgentResponse>;
  createAgent: (config: CreateSpecializedAgentRequest) => Promise<CreateSpecializedAgentResponse>;
  updateAgent: (agentId: string, updates: Partial<SpecializedAgentConfig>) => Promise<boolean>;
  deleteAgent: (agentId: string) => Promise<boolean>;
  refreshAgents: () => Promise<void>;
}

/**
 * Configuration d'un endpoint d'agent spécialisé
 */
export interface AgentEndpointConfig {
  path: string;
  method: 'POST' | 'GET';
  agentId: string;
  description: string;
  inputSchema?: OpenAPISchema;
  outputSchema?: OpenAPISchema;
}

/**
 * Résultat de validation de schéma
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
}

export interface SchemaValidationError {
  path: string;
  message: string;
  code: string;
  value?: string | number | boolean | null;
}

export interface SchemaValidationWarning {
  path: string;
  message: string;
  code: string;
  value?: string | number | boolean | null;
}
