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
 * Valeur d'un header MCP : littérale ou référence à un secret Synesia (onglet Authentication).
 * Doc §3 : "chaque clé est un nom d'en-tête HTTP et la valeur est soit une chaîne,
 * soit une référence à un secret stocké dans le projet" via { "secret_key": "MCP_TOKEN" }.
 */
export type LiminalityMCPHeaderValue = string | { secret_key: string };

/**
 * Tool MCP : Connecte à un serveur Model Context Protocol
 * Conforme doc « Intégration des outils MCP dans les requêtes LLM Exec » :
 * - type, server_label, server_url, allowed_tools, require_approval obligatoires
 * - allowed_tools = [] signifie « tous les tools du serveur »
 * - headers optionnel ; valeurs string ou { secret_key: "..." }
 */
export interface LiminalityMCPTool {
  type: 'mcp';
  server_label: string;
  server_url: string;
  /** Liste des tools autorisés ; [] = tous les tools retournés par le serveur. */
  allowed_tools: string[];
  /** Comportement d'approbation avant exécution (always | never | auto). */
  require_approval: 'always' | 'never' | 'auto';
  /** En-têtes HTTP (auth, etc.) ; valeur = string ou { secret_key: "..." }. */
  headers?: Record<string, LiminalityMCPHeaderValue>;
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
 * Types d'événements internal_tool (callables) — doc LLM Exec §6
 */
export type LiminalityInternalToolEventType = 'internal_tool.start' | 'internal_tool.done' | 'internal_tool.error';

/**
 * Chunk émis par le provider pour internal_tool.start (début d'exécution callable).
 * La route le traduit en assistant_round_complete pour l'affichage chat.
 */
export interface InternalToolStartChunk {
  type: 'internal_tool.start';
  tool_call_id: string;
  name: string;
  arguments?: Record<string, unknown>;
  block_id?: string;
}

/**
 * Chunk émis par le provider pour internal_tool.done (fin réussie callable).
 * La route le traduit en tool_result (success: true).
 */
export interface InternalToolDoneChunk {
  type: 'internal_tool.done';
  tool_call_id: string;
  name: string;
  result: unknown;
  block_id?: string;
}

/**
 * Chunk émis par le provider pour internal_tool.error (échec callable).
 * La route le traduit en tool_result (success: false).
 */
export interface InternalToolErrorChunk {
  type: 'internal_tool.error';
  tool_call_id: string;
  name: string;
  error: string;
  block_id?: string;
}

/**
 * Events de streaming SSE (format réel de l'API Liminality / Synesia LLM Exec)
 *
 * Conforme doc « Intégration des callables dans les requêtes LLM Exec » :
 * - internal_tool.start : début exécution callable (tool_call_id, name, arguments)
 * - internal_tool.done : fin callable (tool_call_id, name, result)
 * - internal_tool.error : erreur callable (tool_call_id, name, error)
 */
export interface LiminalityStreamEvent {
  type:
    | 'start'
    | 'text.start'
    | 'text.delta'
    | 'chunk'
    | 'text.done'
    | 'tool_block.start'
    | 'tool_block.done'
    | 'internal_tool.start'
    | 'internal_tool.done'
    | 'internal_tool.error'
    | 'done'
    | 'tool_call'
    | 'tool_result'
    | 'end'
    | 'error';
  delta?: string; // Pour 'text.delta'
  content?: string; // Pour 'chunk' ou contenu général
  block_id?: string; // Pour 'tool_block.start' et 'tool_block.done'
  tool_name?: string; // Pour 'tool_call' et 'tool_result' (ancien format)
  /** internal_tool.* : identifiant du tool call */
  tool_call_id?: string;
  /** internal_tool.* : nom du callable/outil */
  name?: string;
  /** internal_tool.start : arguments envoyés au callable */
  arguments?: Record<string, unknown>;
  /** internal_tool.done : résultat du callable */
  result?: unknown;
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
 * Métadonnées optionnelles pour l'API Synesia LLM Exec.
 * Les images doivent être envoyées uniquement via metadata.imageInputs
 * (jamais dans messages[].content). Le serveur les injecte dans le dernier message user.
 */
export interface LiminalityRequestMetadata {
  /** URLs ou data URLs d'images. Max 10 par requête, ~5 MB par image en base64. */
  imageInputs?: string[];
}

/**
 * Payload complet pour l'API /llm-exec/round (et /llm-exec/round/stream)
 */
export interface LiminalityRequestPayload {
  model: string;
  messages: LiminalityMessage[];
  tools?: LiminalityTool[];
  llmConfig?: LiminalityLLMConfig;
  config?: LiminalityOrchestrationConfig;
  instructions?: string;
  thread_id?: string;
  /** Images pour modèles vision : tableau d'URLs ou data URLs. Injecté côté serveur dans le dernier message user. */
  metadata?: LiminalityRequestMetadata;
}

