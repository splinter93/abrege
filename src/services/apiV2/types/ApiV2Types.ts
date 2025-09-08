/**
 * Types TypeScript stricts pour l'API V2
 * Architecture modulaire et production-ready
 */

// ============================================================================
// TYPES DE BASE
// ============================================================================

export type ResourceType = 'note' | 'folder' | 'classeur' | 'agent' | 'file';

export type OperationType = 
  | 'get' | 'create' | 'update' | 'delete' | 'patch'
  | 'list' | 'search' | 'move' | 'reorder'
  | 'execute' | 'apply' | 'insert';

export interface ApiV2Context {
  userId: string;
  userToken: string;
  sessionId?: string;
  traceId: string;
  operation: string;
  component: string;
}

export interface ApiV2Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  metadata?: {
    timestamp: string;
    executionTime: number;
    operation: string;
    traceId: string;
  };
}

// ============================================================================
// TYPES POUR LES TOOLS
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: string; // Nom du handler (ex: 'notes', 'folders', etc.)
  operation: string; // Nom de l'opération (ex: 'getNote', 'createNote')
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
  error?: string;
  code?: string;
}

// ============================================================================
// TYPES POUR LES HANDLERS
// ============================================================================

export interface BaseHandler {
  readonly name: string;
  readonly supportedOperations: string[];
  
  execute(operation: string, params: unknown, context: ApiV2Context): Promise<ApiV2Response>;
  validateParams(operation: string, params: unknown): ValidationResult;
  getToolDefinitions(): ToolDefinition[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// ============================================================================
// TYPES POUR LES NOTES
// ============================================================================

export interface Note {
  id: string;
  slug: string;
  source_title: string;
  content: string;
  html_content: string;
  notebook_id: string;
  folder_id?: string;
  header_image?: string;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: boolean;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  a4_mode?: boolean;
  slash_lang?: string;
  font_family?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateNoteParams {
  source_title: string;
  notebook_id: string;
  folder_id?: string;
  markdown_content?: string;
  header_image?: string;
}

export interface UpdateNoteParams {
  ref: string;
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: boolean;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  a4_mode?: boolean;
  slash_lang?: string;
  font_family?: string;
  folder_id?: string;
  description?: string;
}

export interface MoveNoteParams {
  ref: string;
  folder_id?: string;
  classeur_id?: string;
}

export interface InsertNoteContentParams {
  ref: string;
  content: string;
  position?: 'start' | 'end' | number;
}

export interface ApplyContentOperationsParams {
  ref: string;
  ops: ContentOperation[];
  dry_run?: boolean;
}

export interface ContentOperation {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
}

// ============================================================================
// TYPES POUR LES DOSSIERS
// ============================================================================

export interface Folder {
  id: string;
  slug: string;
  name: string;
  classeur_id: string;
  parent_folder_id?: string;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateFolderParams {
  name: string;
  classeur_id: string;
  parent_folder_id?: string;
  position?: number;
}

export interface UpdateFolderParams {
  ref: string;
  name?: string;
  position?: number;
}

export interface MoveFolderParams {
  ref: string;
  classeur_id?: string;
  parent_folder_id?: string;
  position?: number;
}

// ============================================================================
// TYPES POUR LES CLASSEURS
// ============================================================================

export interface Classeur {
  id: string;
  slug: string;
  name: string;
  description?: string;
  color?: string;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateClasseurParams {
  name: string;
  description?: string;
  color?: string;
  position?: number;
}

export interface UpdateClasseurParams {
  ref: string;
  name?: string;
  description?: string;
  color?: string;
  position?: number;
}

export interface ReorderClasseursParams {
  classeur_orders: Array<{
    classeur_id: string;
    position: number;
  }>;
}

// ============================================================================
// TYPES POUR LES AGENTS
// ============================================================================

export interface Agent {
  id: string;
  slug: string;
  name: string;
  display_name: string;
  description?: string;
  model: string;
  provider: string;
  system_instructions: string;
  temperature: number;
  max_tokens: number;
  capabilities: string[];
  api_v2_capabilities: string[];
  is_endpoint_agent: boolean;
  is_chat_agent: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface CreateAgentParams {
  display_name: string;
  slug: string;
  description?: string;
  model: string;
  provider?: string;
  system_instructions: string;
  temperature?: number;
  max_tokens?: number;
  capabilities?: string[];
  api_v2_capabilities?: string[];
  is_chat_agent?: boolean;
}

export interface UpdateAgentParams {
  agentId: string;
  display_name?: string;
  description?: string;
  model?: string;
  system_instructions?: string;
  temperature?: number;
  max_tokens?: number;
  capabilities?: string[];
  api_v2_capabilities?: string[];
  is_chat_agent?: boolean;
  is_active?: boolean;
}

export interface ExecuteAgentParams {
  ref: string;
  input: string;
  image?: string;
  options?: Record<string, unknown>;
}

// ============================================================================
// TYPES POUR LA RECHERCHE
// ============================================================================

export interface SearchContentParams {
  q: string;
  limit?: number;
  offset?: number;
  type?: ResourceType;
}

export interface SearchFilesParams {
  q: string;
  limit?: number;
  offset?: number;
  file_type?: string;
}

export interface SearchResult {
  id: string;
  type: ResourceType;
  title: string;
  content: string;
  relevance_score: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TYPES POUR LES FICHIERS
// ============================================================================

export interface File {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// ============================================================================
// TYPES POUR LES UTILITAIRES
// ============================================================================

export interface RefResolutionResult {
  success: boolean;
  id?: string;
  type?: ResourceType;
  error?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DeleteResourceParams {
  resource: ResourceType;
  ref: string;
}

// ============================================================================
// TYPES POUR LE REGISTRY
// ============================================================================

export interface ToolRegistry {
  registerHandler(handler: BaseHandler): void;
  getHandler(operation: string): BaseHandler | null;
  getAllToolDefinitions(): ToolDefinition[];
  getSupportedOperations(): string[];
}

export interface ApiV2Orchestrator {
  executeToolCall(toolCall: ToolCall, context: ApiV2Context): Promise<ToolResult>;
  validateToolCall(toolCall: ToolCall): ValidationResult;
  getAvailableTools(): ToolDefinition[];
}
