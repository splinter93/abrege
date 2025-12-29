/**
 * Types pour le provider Liminality (Synesia LLM Exec API)
 * 
 * Liminality utilise l'API Synesia LLM Exec qui supporte une orchestration
 * avancée avec plusieurs types de tools spécialisés.
 */

/**
 * Types de tools supportés par Liminality/Synesia
 */
export type LiminalityToolType = 
  | 'callable'    // Agent Synesia existant
  | 'knowledge'   // Base de connaissances vectorielle
  | 'openapi'     // API REST via OpenAPI schema
  | 'mcp'         // Model Context Protocol server
  | 'custom'      // Tool personnalisé avec fonction
  | 'kit'         // Groupement de tools
  | 'websearch'   // Recherche web temps réel
  | 'code_interpreter'  // Exécution code Python sécurisé
  | 'image_generation'; // Génération d'images

/**
 * Tool Callable : Exécute un agent ou pipeline Synesia existant
 */
export interface LiminalityCallableTool {
  type: 'callable';
  callable_id: string;
}

/**
 * Tool Knowledge : Recherche dans une base de connaissances vectorielle
 */
export interface LiminalityKnowledgeTool {
  type: 'knowledge';
  knowledge_id: string;
  name: string;
  description: string;
  allowed_actions: ['search'];
}

/**
 * Tool OpenAPI : Intègre n'importe quelle API REST via sa spécification OpenAPI
 */
export interface LiminalityOpenAPITool {
  type: 'openapi';
  schema: object;
  base_url: string;
  description: string;
  allowed_operations: string[];
  flatten?: boolean;
  security?: Array<{
    type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
    scheme?: 'bearer' | 'basic';
    value: string;
  }>;
}

/**
 * Tool MCP : Connecte à un serveur Model Context Protocol
 */
export interface LiminalityMCPTool {
  type: 'mcp';
  server_label: string;
  server_url: string;
  allowed_tools?: string[];
  require_approval?: 'always' | 'never' | 'auto';
  headers?: Record<string, string>;
}

/**
 * Tool Custom : Définit un outil personnalisé
 */
export interface LiminalityCustomTool {
  type: 'custom';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tool Kit : Regroupe plusieurs outils sous un même namespace
 */
export interface LiminalityKitTool {
  type: 'kit';
  name: string;
  description: string;
  tools: LiminalityTool[];
}

/**
 * Tool WebSearch : Recherche web en temps réel
 */
export interface LiminalityWebSearchTool {
  type: 'websearch';
}

/**
 * Tool Code Interpreter : Exécution de code Python dans un environnement sécurisé
 */
export interface LiminalityCodeInterpreterTool {
  type: 'code_interpreter';
}

/**
 * Tool Image Generation : Génération d'images via DALL-E, Stable Diffusion, etc.
 */
export interface LiminalityImageGenerationTool {
  type: 'image_generation';
}

/**
 * Union type pour tous les tools Liminality
 */
export type LiminalityTool = 
  | LiminalityCallableTool
  | LiminalityKnowledgeTool
  | LiminalityOpenAPITool
  | LiminalityMCPTool
  | LiminalityCustomTool
  | LiminalityKitTool
  | LiminalityWebSearchTool
  | LiminalityCodeInterpreterTool
  | LiminalityImageGenerationTool;

/**
 * Configuration LLM pour Liminality (format Synesia)
 */
export interface LiminalityLLMConfig {
  temperature?: number;
  max_completion_tokens?: number;
  top_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  seed?: number;
  verbosity?: 'low' | 'medium' | 'high';
  tool_choice?: 'auto' | 'none' | 'required';
  parallel_tool_calls?: boolean;
  reasoning_effort?: 'low' | 'medium' | 'high';
  reasoning_summary?: 'none' | 'brief' | 'detailed';
}

/**
 * Configuration d'orchestration pour les tool calls multi-tours
 */
export interface LiminalityOrchestrationConfig {
  max_loops?: number;
  timeout_ms?: number;
}

/**
 * Message dans le format Synesia (compatible OpenAI)
 */
export interface LiminalityMessage {
  role: 'user' | 'assistant' | 'system' | 'tool_request' | 'tool_response';
  content?: string;  // ✅ Optionnel car absent dans tool_response
  name?: string;
  reasoning?: string;
  tool_calls?: Array<{
    id?: string;                    // Pour tool_request (assistant)
    name?: string;                  // Pour tool_request (assistant)
    arguments?: Record<string, unknown>;  // Pour tool_request (assistant)
    tool_call_id?: string;          // ✅ Pour tool_response
    content?: string;               // ✅ Pour tool_response
    tool_name?: string;             // ✅ Pour tool_response
  }>;
}

/**
 * Réponse de l'API Liminality/Synesia
 */
export interface LiminalityResponse {
  message: LiminalityMessage;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
  thread_id?: string;
}

/**
 * Events de streaming SSE (format réel de l'API Liminality)
 * 
 * Types d'events observés :
 * - 'start' : Démarrage du stream
 * - 'text.delta' : Chunk de texte avec delta
 * - 'chunk' : Chunk de contenu (ancien format)
 * - 'text.done' : Fin du texte
 * - 'tool_block.start' : Début d'un tool call
 * - 'tool_block.done' : Fin d'un tool call
 * - 'done' : Fin du stream avec messages complets
 * - 'tool_call' : Tool call en cours (ancien format)
 * - 'tool_result' : Résultat de tool (ancien format)
 * - 'end' : Fin du stream (ancien format)
 * - 'error' : Erreur
 */
export interface LiminalityStreamEvent {
  type: 'start' | 'text.delta' | 'chunk' | 'text.done' | 'tool_block.start' | 'tool_block.done' | 'done' | 'tool_call' | 'tool_result' | 'end' | 'error';
  delta?: string; // Pour 'text.delta'
  content?: string; // Pour 'chunk' ou contenu général
  block_id?: string; // Pour 'tool_block.start' et 'tool_block.done'
  tool_name?: string; // Pour 'tool_call' et 'tool_result' (ancien format)
  messages?: Array<{
    role: string;
    tool_calls?: Array<LiminalityToolCallInMessage>;
  }>;
  complete?: boolean; // Pour 'done'
  usage?: LiminalityResponse['usage'];
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Tool call dans un message Liminality (format API)
 */
export interface LiminalityToolCallInMessage {
  id: string;
  name: string;
  arguments: string | Record<string, unknown>;
}

/**
 * Payload complet pour l'API /llm-exec/round
 */
export interface LiminalityRequestPayload {
  model: string;
  messages: LiminalityMessage[];
  tools?: LiminalityTool[];
  llmConfig?: LiminalityLLMConfig;
  config?: LiminalityOrchestrationConfig;
  instructions?: string;
  thread_id?: string;
}

