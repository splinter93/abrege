/**
 * Types simplifiés pour l'API V2
 * 100 lignes max, zéro duplication
 */

// ============================================================================
// TYPES DE BASE
// ============================================================================

export interface ApiV2Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
  error?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required: string[];
    };
  };
}

// ============================================================================
// TYPES POUR LES RESSOURCES
// ============================================================================

export interface Note {
  id: string;
  title: string;
  slug: string;
  public_url: string | null;
  header_image: string | null;
  folder_id: string | null;
  classeur_id: string;
  created_at: string;
  updated_at: string;
  markdown_content?: string;
  html_content?: string;
}

export interface Classeur {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  position: number;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  position: number;
  parent_id: string | null;
  classeur_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TYPES POUR LES REQUÊTES
// ============================================================================

export interface CreateNoteRequest {
  source_title: string;
  notebook_id: string;
  folder_id?: string;
  markdown_content?: string;
  header_image?: string;
}

export interface UpdateNoteRequest {
  source_title?: string;
  markdown_content?: string;
  html_content?: string;
  header_image?: string;
  folder_id?: string;
}

export interface CreateClasseurRequest {
  name: string;
  description?: string;
  emoji?: string;
}

export interface CreateFolderRequest {
  name: string;
  classeur_id: string;
  parent_id?: string;
  position?: number;
}

// ============================================================================
// TYPES POUR LA RECHERCHE
// ============================================================================

export interface SearchRequest {
  q: string;
  type?: 'all' | 'notes' | 'folders' | 'classeurs';
  classeur_id?: string;
  limit?: number;
}

export interface SearchResult {
  type: 'note' | 'folder' | 'classeur';
  id: string;
  title: string;
  slug: string;
  classeur_id?: string;
  score: number;
  excerpt: string;
}

// ============================================================================
// TYPES POUR LES AGENTS
// ============================================================================

export interface AgentInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  model: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentRequest {
  name: string;
  slug: string;
  description: string;
  model: string;
  provider: string;
  system_instructions: string;
  is_chat_agent?: boolean;
  is_endpoint_agent?: boolean;
  temperature?: number;
  max_tokens?: number;
}

// ============================================================================
// TYPES POUR LES RÉPONSES SPÉCIFIQUES
// ============================================================================

export interface CreateNoteResponse extends ApiV2Response<Note> {
  note: Note;
}

export interface GetNoteResponse extends ApiV2Response<Note> {
  note: Note;
}

export interface CreateClasseurResponse extends ApiV2Response<Classeur> {
  classeur: Classeur;
}

export interface GetClasseurResponse extends ApiV2Response<Classeur> {
  classeur: Classeur;
}

export interface ListClasseursResponse extends ApiV2Response<Classeur[]> {
  classeurs: Classeur[];
}

export interface SearchResponse extends ApiV2Response<SearchResult[]> {
  results: SearchResult[];
  total: number;
}