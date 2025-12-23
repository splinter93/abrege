/**
 * Types stricts pour le système LLM
 * Remplace tous les 'any' par des types précis
 */

// ============================================================================
// TYPES DE BASE
// ============================================================================

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
  result?: unknown;
  duration_ms?: number;
  timestamp?: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// ============================================================================
// TYPES GROQ API
// ============================================================================

export interface GroqMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface GroqChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
      reasoning?: string;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage: Usage;
}

export interface GroqResponsesApiOutput {
  type: 'mcp_list_tools' | 'reasoning' | 'mcp_call' | 'message';
  server_label?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  output?: unknown;
  content?: Array<{
    type: 'reasoning_text' | 'output_text' | 'text';
    text: string;
  }> | string;
  role?: 'assistant';
  tools?: Array<{
    name: string;
    description?: string;
    input_schema?: Record<string, unknown>;
  }>;
}

export interface GroqResponsesApiResponse {
  id: string;
  status: string;
  model: string;
  output: GroqResponsesApiOutput[];
  usage?: Usage;
  x_groq?: {
    id: string;
    [key: string]: unknown;
  };
}

export interface McpCall {
  server_label: string;
  name: string;
  arguments: Record<string, unknown>;
  output: unknown;
}

export interface LLMResponse {
  content: string;
  tool_calls?: ToolCall[];
  model?: string;
  usage?: Usage;
  reasoning?: string;
  finish_reason?: string;
  x_groq?: {
    mcp_calls?: McpCall[];
    [key: string]: unknown;
  };
  validation_error?: {
    message: string;
    failed_generation?: unknown;
    recoverable: boolean;
  };
}

// ============================================================================
// TYPES POUR LES TOOLS
// ============================================================================

export interface FunctionTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        [key: string]: unknown;
      }>;
      required?: string[];
      [key: string]: unknown;
    };
  };
}

export interface McpTool {
  type: 'mcp';
  server_label: string;
  name?: string;
  [key: string]: unknown;
}

export type Tool = FunctionTool | McpTool;

// ============================================================================
// TYPES POUR LES PARAMÈTRES D'ENDPOINTS
// ============================================================================

// Notes
export interface CreateNoteParams {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  folder_id?: string;
  header_image?: string;
}

export interface GetNoteParams {
  ref: string;
  fields?: 'all' | 'metadata' | 'content';
}

export interface UpdateNoteParams {
  source_title?: string;
  markdown_content?: string;
  description?: string;
  header_image?: string;
  header_image_offset?: number;
  header_image_blur?: number;
  header_image_overlay?: number;
  header_title_in_image?: boolean;
  wide_mode?: boolean;
  font_family?: string;
  slash_lang?: 'fr' | 'en';
  a4_mode?: boolean;
}

export interface MoveNoteParams {
  classeur_id: string;
  folder_id?: string | null;
  position?: number;
}

export interface InsertNoteContentParams {
  content: string;
  position?: number;
  where?: 'before' | 'after' | 'replace';
}

export interface ContentOperation {
  id: string;
  action: 'insert' | 'replace' | 'delete' | 'upsert_section';
  target: {
    type: 'heading' | 'regex' | 'position' | 'anchor';
    heading?: {
      heading_id?: string;
      level?: number;
      path?: string[];
    };
    regex?: {
      pattern: string;
      flags?: string;
      nth?: number;
    };
    position?: {
      mode: 'offset' | 'start' | 'end';
      offset?: number;
    };
    anchor?: {
      name: 'doc_start' | 'doc_end' | 'after_toc' | 'before_first_heading';
    };
  };
  where: 'before' | 'after' | 'inside_start' | 'inside_end' | 'at' | 'replace_match';
  content?: string;
  options?: {
    surround_with_blank_lines?: number;
    dedent?: boolean;
    ensure_heading?: boolean;
  };
}

export interface ApplyContentOperationsParams {
  ops: ContentOperation[];
  transaction?: 'all_or_nothing' | 'best_effort';
  conflict_strategy?: 'fail' | 'skip';
  return?: 'content' | 'diff' | 'none';
  idempotency_key?: string;
}

export interface ShareSettingsParams {
  visibility?: 'private' | 'link-private' | 'link-public' | 'limited' | 'scrivia';
  allow_edit?: boolean;
  allow_comments?: boolean;
  invited_users?: string[];
  link_expires?: string;
}

export interface RecentNotesParams {
  limit?: number;
  offset?: number;
}

// Classeurs
export interface CreateClasseurParams {
  name: string;
  color?: string;
  description?: string;
  position?: number;
}

export interface GetClasseurParams {
  ref: string;
}

export interface UpdateClasseurParams {
  name?: string;
  color?: string;
  description?: string;
  position?: number;
}

export interface ReorderClasseursParams {
  classeur_orders: Array<{
    classeur_id: string;
    position: number;
  }>;
}

// Dossiers
export interface CreateFolderParams {
  name: string;
  classeur_id: string;
  parent_id?: string | null;
  position?: number;
}

export interface GetFolderParams {
  ref: string;
}

export interface UpdateFolderParams {
  name?: string;
  position?: number;
}

export interface MoveFolderParams {
  classeur_id: string;
  parent_folder_id?: string | null;
  position?: number;
}

// Recherche
export interface SearchContentParams {
  q?: string | null;
  classeur_id?: string;
  type?: 'all' | 'notes' | 'classeurs' | 'files';
  limit?: number;
}

export interface SearchFilesParams {
  q: string;
  classeur_id?: string;
  file_type?: 'all' | 'image' | 'document' | 'pdf' | 'text';
  limit?: number;
}

// Trash
export interface RestoreFromTrashParams {
  resource_type: 'note' | 'folder' | 'classeur';
  ref: string;
}

// Agents
export interface CreateAgentParams {
  name?: string; // Nom complet optionnel (ex: "Timothy Cavendish")
  display_name: string; // Nom court affiché (ex: "Timothy")
  slug: string;
  description: string;
  model: string;
  system_instructions?: string;
  temperature?: number;
  max_tokens?: number;
  provider?: 'groq' | 'openai' | 'anthropic';
  is_chat_agent?: boolean;
  api_v2_capabilities?: string[];
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

export interface UpdateAgentParams {
  name?: string; // Nom complet optionnel (ex: "Timothy Cavendish")
  display_name?: string; // Nom court affiché (ex: "Timothy")
  description?: string;
  model?: string;
  system_instructions?: string;
  temperature?: number;
  max_tokens?: number;
  is_active?: boolean;
  api_v2_capabilities?: string[];
}

export interface ExecuteAgentParams {
  ref: string;
  input: string;
  options?: {
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isFunctionTool(tool: Tool): tool is FunctionTool {
  return tool.type === 'function';
}

export function isMcpTool(tool: Tool): tool is McpTool {
  return tool.type === 'mcp';
}

export function isGroqChatCompletionResponse(response: unknown): response is GroqChatCompletionResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'choices' in response &&
    Array.isArray((response as GroqChatCompletionResponse).choices)
  );
}

export function isGroqResponsesApiResponse(response: unknown): response is GroqResponsesApiResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'output' in response &&
    Array.isArray((response as GroqResponsesApiResponse).output)
  );
}

// ============================================================================
// UNION TYPES POUR LES PARAMÈTRES
// ============================================================================

export type ToolParams =
  | CreateNoteParams
  | GetNoteParams
  | UpdateNoteParams
  | MoveNoteParams
  | InsertNoteContentParams
  | ApplyContentOperationsParams
  | ShareSettingsParams
  | RecentNotesParams
  | CreateClasseurParams
  | GetClasseurParams
  | UpdateClasseurParams
  | ReorderClasseursParams
  | CreateFolderParams
  | GetFolderParams
  | UpdateFolderParams
  | MoveFolderParams
  | SearchContentParams
  | SearchFilesParams
  | RestoreFromTrashParams
  | CreateAgentParams
  | UpdateAgentParams
  | ExecuteAgentParams;

// ============================================================================
// TYPE MAP POUR LES HANDLERS
// ============================================================================

export type ToolHandlerMap = {
  // Notes
  createNote: (args: CreateNoteParams, token: string) => Promise<unknown>;
  getNote: (args: GetNoteParams, token: string) => Promise<unknown>;
  updateNote: (args: UpdateNoteParams & { ref: string }, token: string) => Promise<unknown>;
  moveNote: (args: MoveNoteParams & { ref: string }, token: string) => Promise<unknown>;
  insertNoteContent: (args: InsertNoteContentParams & { ref: string }, token: string) => Promise<unknown>;
  applyContentOperations: (args: ApplyContentOperationsParams & { ref: string }, token: string) => Promise<unknown>;
  getNoteTOC: (args: { ref: string }, token: string) => Promise<unknown>;
  getNoteShareSettings: (args: { ref: string }, token: string) => Promise<unknown>;
  updateNoteShareSettings: (args: ShareSettingsParams & { ref: string }, token: string) => Promise<unknown>;
  getRecentNotes: (args: RecentNotesParams, token: string) => Promise<unknown>;
  
  // Classeurs
  createClasseur: (args: CreateClasseurParams, token: string) => Promise<unknown>;
  getClasseur: (args: GetClasseurParams, token: string) => Promise<unknown>;
  updateClasseur: (args: UpdateClasseurParams & { ref: string }, token: string) => Promise<unknown>;
  getClasseurTree: (args: { ref: string }, token: string) => Promise<unknown>;
  getClasseursWithContent: (args: Record<string, never>, token: string) => Promise<unknown>;
  listClasseurs: (args: Record<string, never>, token: string) => Promise<unknown>;
  reorderClasseurs: (args: ReorderClasseursParams, token: string) => Promise<unknown>;
  
  // Dossiers
  createFolder: (args: CreateFolderParams, token: string) => Promise<unknown>;
  getFolder: (args: GetFolderParams, token: string) => Promise<unknown>;
  updateFolder: (args: UpdateFolderParams & { ref: string }, token: string) => Promise<unknown>;
  moveFolder: (args: MoveFolderParams & { ref: string }, token: string) => Promise<unknown>;
  getFolderTree: (args: { ref: string }, token: string) => Promise<unknown>;
  
  // Recherche
  searchContent: (args: SearchContentParams, token: string) => Promise<unknown>;
  searchFiles: (args: SearchFilesParams, token: string) => Promise<unknown>;
  
  // Autres
  getStats: (args: Record<string, never>, token: string) => Promise<unknown>;
  getUserProfile: (args: Record<string, never>, token: string) => Promise<unknown>;
  getTrash: (args: Record<string, never>, token: string) => Promise<unknown>;
  restoreFromTrash: (args: RestoreFromTrashParams, token: string) => Promise<unknown>;
  purgeTrash: (args: Record<string, never>, token: string) => Promise<unknown>;
  deleteResource: (args: { resource: string; ref: string }, token: string) => Promise<unknown>;
  
  // Agents
  listAgents: (args: Record<string, never>, token: string) => Promise<unknown>;
  createAgent: (args: CreateAgentParams, token: string) => Promise<unknown>;
  getAgent: (args: { agentId: string }, token: string) => Promise<unknown>;
  executeAgent: (args: ExecuteAgentParams, token: string) => Promise<unknown>;
  updateAgent: (args: UpdateAgentParams & { agentId: string }, token: string) => Promise<unknown>;
  patchAgent: (args: UpdateAgentParams & { agentId: string }, token: string) => Promise<unknown>;
  deleteAgent: (args: { agentId: string }, token: string) => Promise<unknown>;
  
  // Debug
  listTools: (args: Record<string, never>, token: string) => Promise<unknown>;
  debugInfo: (args: Record<string, never>, token: string) => Promise<unknown>;
};

export type ToolHandlerFunction<K extends keyof ToolHandlerMap> = ToolHandlerMap[K];

