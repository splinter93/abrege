/**
 * Types TypeScript stricts pour l'API V2
 * Zéro any, parfaitement fidèle aux endpoints
 */

// ============================================================================
// TYPES DE BASE
// ============================================================================

export interface ApiV2Response<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export interface ApiV2Error {
  error: string;
  details?: string;
  code?: string;
  status?: number;
}

// ============================================================================
// TYPES POUR LES NOTES
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
  share_settings?: ShareSettings;
  markdown_content?: string;
  html_content?: string;
}

export interface CreateNoteRequest {
  source_title: string;
  notebook_id: string; // UUID ou slug
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

export interface MoveNoteRequest {
  folder_id?: string;
  classeur_id?: string;
}

export interface InsertNoteContentRequest {
  content: string;
  position: 'start' | 'end' | number;
}

export interface ContentOperation {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
}

export interface ApplyContentOperationsRequest {
  ops: ContentOperation[];
  dry_run?: boolean;
}

export interface ShareSettings {
  visibility: 'private' | 'public' | 'unlisted';
  allow_edit?: boolean;
  allow_comments?: boolean;
}

export interface UpdateShareSettingsRequest {
  visibility?: 'private' | 'public' | 'unlisted';
  allow_edit?: boolean;
  allow_comments?: boolean;
}

export interface TableOfContents {
  success: boolean;
  toc: Array<{
    level: number;
    title: string;
    anchor: string;
    position: number;
  }>;
  message?: string;
}

// ============================================================================
// TYPES POUR LES CLASSEURS
// ============================================================================

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

export interface CreateClasseurRequest {
  name: string;
  description?: string;
  emoji?: string;
}

export interface UpdateClasseurRequest {
  name?: string;
  description?: string;
  emoji?: string;
}

export interface ClasseurTree {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  position: number;
  slug: string;
  created_at: string;
  updated_at: string;
  folders: Folder[];
  notes: Note[];
}

// ============================================================================
// TYPES POUR LES DOSSIERS
// ============================================================================

export interface Folder {
  id: string;
  name: string;
  position: number;
  parent_id: string | null;
  classeur_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderRequest {
  name: string;
  classeur_id: string;
  parent_id?: string;
  position?: number;
}

export interface UpdateFolderRequest {
  name?: string;
  position?: number;
}

export interface MoveFolderRequest {
  classeur_id?: string;
  parent_id?: string;
  position?: number;
}

export interface FolderTree {
  id: string;
  name: string;
  position: number;
  parent_id: string | null;
  classeur_id: string;
  created_at: string;
  updated_at: string;
  children: FolderTree[];
  notes: Note[];
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

export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  total: number;
}

// ============================================================================
// TYPES POUR LES FICHIERS
// ============================================================================

export interface FileSearchRequest {
  q?: string;
  type?: string;
  created_from?: string;
  created_to?: string;
  min_size?: number;
  max_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface FileSearchResult {
  filename: string;
  type: string;
  size: number;
  url: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileSearchResponse {
  success: boolean;
  files: FileSearchResult[];
  total: number;
  has_more: boolean;
  filters_applied: string[];
}

// ============================================================================
// TYPES POUR LES STATISTIQUES
// ============================================================================

export interface StatsResponse {
  success: boolean;
  stats: {
    notes_count: number;
    classeurs_count: number;
    folders_count: number;
    content_size: number;
  };
}

// ============================================================================
// TYPES POUR LE PROFIL UTILISATEUR
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileResponse {
  success: boolean;
  profile: UserProfile;
}

// ============================================================================
// TYPES POUR LA CORBEILLE
// ============================================================================

export interface TrashItem {
  id: string;
  type: 'note' | 'folder' | 'classeur';
  title: string;
  trashed_at: string;
  original_data: Record<string, unknown>;
}

export interface TrashResponse {
  success: boolean;
  items: TrashItem[];
  total: number;
}

export interface RestoreRequest {
  item_id: string;
  item_type: 'note' | 'folder' | 'classeur';
}

// ============================================================================
// TYPES POUR LES TOOLS
// ============================================================================

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
        format?: string;
        maxLength?: number;
        items?: {
          type: string;
          properties?: Record<string, unknown>;
          required?: string[];
        };
        required?: string[];
      }>;
      required: string[];
    };
  };
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
  code?: string;
}

// ============================================================================
// TYPES POUR LES RÉPONSES D'ERREUR
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationErrorResponse {
  success: false;
  error: string;
  details: string;
  validation_errors: ValidationError[];
}

// ============================================================================
// TYPES POUR LES PARAMÈTRES DE REQUÊTE
// ============================================================================

export interface GetNoteParams {
  ref: string;
  fields?: 'all' | 'content' | 'metadata';
}

export interface GetClasseurParams {
  ref: string;
}

export interface GetFolderParams {
  ref: string;
}

export interface GetRecentNotesParams {
  limit?: number;
}

// ============================================================================
// TYPES POUR LES RÉPONSES SPÉCIFIQUES
// ============================================================================

export interface CreateNoteResponse extends ApiV2Response<Note> {
  note: Note;
}

export interface GetNoteResponse extends ApiV2Response<Note> {
  note: Note;
  mode: string;
}

export interface UpdateNoteResponse extends ApiV2Response<Note> {
  note: Note;
}

export interface MoveNoteResponse extends ApiV2Response<Note> {
  note: Note;
}

export interface InsertNoteContentResponse extends ApiV2Response<Note> {
  note: Note;
}

export interface ApplyContentOperationsResponse extends ApiV2Response<{
  success: boolean;
  message: string;
  operations_applied: number;
  dry_run: boolean;
}> {
  operations_applied: number;
  dry_run: boolean;
}

export interface GetNoteTOCResponse extends ApiV2Response<TableOfContents> {
  toc: TableOfContents;
}

export interface GetNoteShareSettingsResponse extends ApiV2Response<ShareSettings> {
  visibility: string;
  allow_edit: boolean;
  allow_comments: boolean;
}

export interface UpdateNoteShareSettingsResponse extends ApiV2Response<{
  success: boolean;
  message: string;
}> {
  message: string;
}

export interface CreateClasseurResponse extends ApiV2Response<Classeur> {
  classeur: Classeur;
}

export interface GetClasseurResponse extends ApiV2Response<Classeur> {
  classeur: Classeur;
}

export interface UpdateClasseurResponse extends ApiV2Response<Classeur> {
  classeur: Classeur;
}

export interface GetClasseurTreeResponse extends ApiV2Response<ClasseurTree> {
  classeur: ClasseurTree;
}

export interface ListClasseursResponse extends ApiV2Response<Classeur[]> {
  classeurs: Classeur[];
}

export interface CreateFolderResponse extends ApiV2Response<Folder> {
  folder: Folder;
}

export interface GetFolderResponse extends ApiV2Response<Folder> {
  folder: Folder;
}

export interface UpdateFolderResponse extends ApiV2Response<Folder> {
  folder: Folder;
}

export interface MoveFolderResponse extends ApiV2Response<Folder> {
  folder: Folder;
}

export interface GetFolderTreeResponse extends ApiV2Response<FolderTree> {
  folder: FolderTree;
}

export interface GetRecentNotesResponse extends ApiV2Response<Note[]> {
  notes: Note[];
}

export interface GetClasseursWithContentResponse extends ApiV2Response<{
  classeurs: ClasseurTree[];
  folders: Folder[];
  notes: Note[];
}> {
  classeurs: ClasseurTree[];
  folders: Folder[];
  notes: Note[];
}
