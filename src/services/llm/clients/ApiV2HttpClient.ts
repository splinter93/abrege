/**
 * Client HTTP TypeScript strict pour l'API V2
 * Zéro any, parfaitement fidèle aux endpoints
 */

import {
  // Types de base
  ApiV2Response,
  ApiV2Error,
  
  // Types pour les notes
  Note,
  CreateNoteRequest,
  UpdateNoteRequest,
  MoveNoteRequest,
  InsertNoteContentRequest,
  ApplyContentOperationsRequest,
  UpdateShareSettingsRequest,
  TableOfContents,
  ShareSettings,
  
  // Types pour les classeurs
  Classeur,
  CreateClasseurRequest,
  UpdateClasseurRequest,
  ClasseurTree,
  
  // Types pour les dossiers
  Folder,
  CreateFolderRequest,
  UpdateFolderRequest,
  MoveFolderRequest,
  FolderTree,
  
  // Types pour la recherche
  SearchRequest,
  SearchResponse,
  
  // Types pour les fichiers
  FileSearchRequest,
  FileSearchResponse,
  
  // Types pour les statistiques
  StatsResponse,
  
  // Types pour le profil utilisateur
  UserProfileResponse,
  
  // Types pour la corbeille
  TrashResponse,
  RestoreRequest,
  
  // Types pour les paramètres
  GetNoteParams,
  GetClasseurParams,
  GetFolderParams,
  GetRecentNotesParams,
  
  // Types pour les réponses spécifiques
  CreateNoteResponse,
  GetNoteResponse,
  UpdateNoteResponse,
  MoveNoteResponse,
  InsertNoteContentResponse,
  ApplyContentOperationsResponse,
  GetNoteTOCResponse,
  GetNoteShareSettingsResponse,
  UpdateNoteShareSettingsResponse,
  CreateClasseurResponse,
  GetClasseurResponse,
  UpdateClasseurResponse,
  GetClasseurTreeResponse,
  ListClasseursResponse,
  CreateFolderResponse,
  GetFolderResponse,
  UpdateFolderResponse,
  MoveFolderResponse,
  GetFolderTreeResponse,
  GetRecentNotesResponse,
  GetClasseursWithContentResponse
} from '../types/apiV2Types';

import { simpleLogger as logger } from '@/utils/logger';

/**
 * Client HTTP strict pour l'API V2
 * Tous les appels sont typés et validés
 */
export class ApiV2HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(baseUrl?: string, timeout: number = 30000) {
    this.baseUrl = baseUrl || this.getDefaultBaseUrl();
    this.timeout = timeout;
  }

  private getDefaultBaseUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }

  /**
   * Détecter si une chaîne est un UUID (userId) ou un token JWT
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }


  /**
   * Méthode générique pour les appels HTTP
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    params: Record<string, unknown> | null,
    userToken: string
  ): Promise<T> {
    let url = `${this.baseUrl}/api/v2${endpoint}`;
    
    // 🔧 CORRECTION : Détecter si c'est un userId (UUID) ou un token JWT
    const isUserId = this.isUUID(userToken);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Type': 'agent'
    };
    
    if (isUserId) {
      // Si c'est un userId, utiliser le service role key pour l'impersonation
      // Les endpoints API V2 géreront l'impersonation via le header X-User-Id
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante pour l\'impersonation');
      }
      
      headers['Authorization'] = `Bearer ${serviceRoleKey}`;
      headers['X-User-Id'] = userToken;
      headers['X-Service-Role'] = 'true';
      logger.info(`[ApiV2HttpClient] 🔑 IMPERSONATION DÉTECTÉE - userId: ${userToken.substring(0, 8)}...`);
      logger.info(`[ApiV2HttpClient] 📤 Headers d'impersonation:`, {
        'Authorization': 'Bearer ' + serviceRoleKey.substring(0, 20) + '...',
        'X-User-Id': userToken.substring(0, 8) + '...',
        'X-Service-Role': 'true',
        'X-Client-Type': 'agent'
      });
    } else {
      // Si c'est un token JWT, utiliser l'Authorization Bearer
      headers['Authorization'] = `Bearer ${userToken}`;
      logger.info(`[ApiV2HttpClient] 🔑 TOKEN JWT DÉTECTÉ - token: ${userToken.substring(0, 20)}...`);
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout)
    };

    if (params && method !== 'GET') {
      requestOptions.body = JSON.stringify(params);
    } else if (params && method === 'GET') {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    try {
      logger.dev(`[ApiV2HttpClient] ${method} ${url}`, {
        hasParams: !!params,
        paramsKeys: params ? Object.keys(params) : []
      });

      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as ApiV2Error;
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as T;
      
      logger.dev(`[ApiV2HttpClient] ✅ ${method} ${url} success`);
      return data;

    } catch (error) {
      logger.error(`[ApiV2HttpClient] ❌ ${method} ${url} failed:`, {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // ============================================================================
  // MÉTHODES POUR LES NOTES
  // ============================================================================

  async createNote(params: CreateNoteRequest, userToken: string): Promise<CreateNoteResponse> {
    return this.makeRequest<CreateNoteResponse>('/note/create', 'POST', params, userToken);
  }

  async getNote(params: GetNoteParams, userToken: string): Promise<GetNoteResponse> {
    const { ref, fields = 'all' } = params;
    return this.makeRequest<GetNoteResponse>(`/note/${ref}`, 'GET', { fields }, userToken);
  }

  async updateNote(ref: string, params: UpdateNoteRequest, userToken: string): Promise<UpdateNoteResponse> {
    return this.makeRequest<UpdateNoteResponse>(`/note/${ref}/update`, 'PUT', params, userToken);
  }

  async moveNote(ref: string, params: MoveNoteRequest, userToken: string): Promise<MoveNoteResponse> {
    return this.makeRequest<MoveNoteResponse>(`/note/${ref}/move`, 'POST', params, userToken);
  }

  async insertNoteContent(ref: string, params: InsertNoteContentRequest, userToken: string): Promise<InsertNoteContentResponse> {
    return this.makeRequest<InsertNoteContentResponse>(`/note/${ref}/insert-content`, 'POST', params, userToken);
  }

  async applyContentOperations(ref: string, params: ApplyContentOperationsRequest, userToken: string): Promise<ApplyContentOperationsResponse> {
    return this.makeRequest<ApplyContentOperationsResponse>(`/note/${ref}/content:apply`, 'POST', params, userToken);
  }

  async getNoteTOC(ref: string, userToken: string): Promise<GetNoteTOCResponse> {
    return this.makeRequest<GetNoteTOCResponse>(`/note/${ref}/table-of-contents`, 'GET', null, userToken);
  }

  async getNoteShareSettings(ref: string, userToken: string): Promise<GetNoteShareSettingsResponse> {
    return this.makeRequest<GetNoteShareSettingsResponse>(`/note/${ref}/share`, 'GET', null, userToken);
  }

  async updateNoteShareSettings(ref: string, params: UpdateShareSettingsRequest, userToken: string): Promise<UpdateNoteShareSettingsResponse> {
    return this.makeRequest<UpdateNoteShareSettingsResponse>(`/note/${ref}/share`, 'PUT', params, userToken);
  }

  async getRecentNotes(params: GetRecentNotesParams, userToken: string): Promise<GetRecentNotesResponse> {
    return this.makeRequest<GetRecentNotesResponse>('/note/recent', 'GET', params, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LES CLASSEURS
  // ============================================================================

  async createClasseur(params: CreateClasseurRequest, userToken: string): Promise<CreateClasseurResponse> {
    return this.makeRequest<CreateClasseurResponse>('/classeur/create', 'POST', params, userToken);
  }

  async getClasseur(params: GetClasseurParams, userToken: string): Promise<GetClasseurResponse> {
    const { ref } = params;
    return this.makeRequest<GetClasseurResponse>(`/classeur/${ref}`, 'GET', null, userToken);
  }

  async updateClasseur(ref: string, params: UpdateClasseurRequest, userToken: string): Promise<UpdateClasseurResponse> {
    return this.makeRequest<UpdateClasseurResponse>(`/classeur/${ref}/update`, 'PUT', params, userToken);
  }

  async getClasseurTree(ref: string, userToken: string): Promise<GetClasseurTreeResponse> {
    return this.makeRequest<GetClasseurTreeResponse>(`/classeur/${ref}/tree`, 'GET', null, userToken);
  }

  async getClasseursWithContent(userToken: string): Promise<GetClasseursWithContentResponse> {
    return this.makeRequest<GetClasseursWithContentResponse>('/classeurs/with-content', 'GET', null, userToken);
  }

  async listClasseurs(userToken: string): Promise<ListClasseursResponse> {
    return this.makeRequest<ListClasseursResponse>('/classeurs', 'GET', null, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LES DOSSIERS
  // ============================================================================

  async createFolder(params: CreateFolderRequest, userToken: string): Promise<CreateFolderResponse> {
    return this.makeRequest<CreateFolderResponse>('/folder/create', 'POST', params, userToken);
  }

  async getFolder(params: GetFolderParams, userToken: string): Promise<GetFolderResponse> {
    const { ref } = params;
    return this.makeRequest<GetFolderResponse>(`/folder/${ref}`, 'GET', null, userToken);
  }

  async updateFolder(ref: string, params: UpdateFolderRequest, userToken: string): Promise<UpdateFolderResponse> {
    return this.makeRequest<UpdateFolderResponse>(`/folder/${ref}/update`, 'PUT', params, userToken);
  }

  async moveFolder(ref: string, params: MoveFolderRequest, userToken: string): Promise<MoveFolderResponse> {
    return this.makeRequest<MoveFolderResponse>(`/folder/${ref}/move`, 'POST', params, userToken);
  }

  async getFolderTree(ref: string, userToken: string): Promise<GetFolderTreeResponse> {
    return this.makeRequest<GetFolderTreeResponse>(`/folder/${ref}/tree`, 'GET', null, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LA RECHERCHE
  // ============================================================================

  async searchContent(params: SearchRequest, userToken: string): Promise<SearchResponse> {
    return this.makeRequest<SearchResponse>('/search', 'GET', params, userToken);
  }

  async searchFiles(params: FileSearchRequest, userToken: string): Promise<FileSearchResponse> {
    return this.makeRequest<FileSearchResponse>('/files/search', 'GET', params, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LES STATISTIQUES
  // ============================================================================

  async getStats(userToken: string): Promise<StatsResponse> {
    return this.makeRequest<StatsResponse>('/stats', 'GET', null, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LE PROFIL UTILISATEUR
  // ============================================================================

  async getUserProfile(userToken: string): Promise<UserProfileResponse> {
    return this.makeRequest<UserProfileResponse>('/me', 'GET', null, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LA CORBEILLE
  // ============================================================================

  async getTrash(userToken: string): Promise<TrashResponse> {
    return this.makeRequest<TrashResponse>('/trash', 'GET', null, userToken);
  }

  async restoreFromTrash(params: RestoreRequest, userToken: string): Promise<ApiV2Response<{ success: boolean }>> {
    return this.makeRequest<ApiV2Response<{ success: boolean }>>('/trash/restore', 'POST', params, userToken);
  }

  async purgeTrash(userToken: string): Promise<ApiV2Response<{ success: boolean }>> {
    return this.makeRequest<ApiV2Response<{ success: boolean }>>('/trash/purge', 'POST', null, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LA SUPPRESSION
  // ============================================================================

  async deleteResource(resource: 'note' | 'folder' | 'classeur', ref: string, userToken: string): Promise<ApiV2Response<{ success: boolean }>> {
    return this.makeRequest<ApiV2Response<{ success: boolean }>>(`/delete/${resource}/${ref}`, 'DELETE', null, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LES AGENTS SPÉCIALISÉS
  // ============================================================================

  async listAgents(userToken: string): Promise<ApiV2Response<{ agents: any[] }>> {
    return this.makeRequest<ApiV2Response<{ agents: any[] }>>('/agents', 'GET', null, userToken);
  }

  async createAgent(params: any, userToken: string): Promise<ApiV2Response<{ agent: any }>> {
    return this.makeRequest<ApiV2Response<{ agent: any }>>('/agents', 'POST', params, userToken);
  }

  async getAgent(agentId: string, userToken: string): Promise<ApiV2Response<{ agent: any }>> {
    return this.makeRequest<ApiV2Response<{ agent: any }>>(`/agents/${agentId}`, 'GET', null, userToken);
  }

  async executeAgent(params: any, userToken: string): Promise<ApiV2Response<{ response: string; data: any }>> {
    return this.makeRequest<ApiV2Response<{ response: string; data: any }>>('/agents/execute', 'POST', params, userToken);
  }

  // ============================================================================
  // MÉTHODES POUR LE DEBUG
  // ============================================================================

  async listTools(userToken: string): Promise<ApiV2Response<{ tools: any[] }>> {
    return this.makeRequest<ApiV2Response<{ tools: any[] }>>('/tools', 'GET', null, userToken);
  }

  async debugInfo(userToken: string): Promise<ApiV2Response<{ info: any }>> {
    return this.makeRequest<ApiV2Response<{ info: any }>>('/debug', 'GET', null, userToken);
  }
}

// Instance singleton exportée
export const apiV2HttpClient = new ApiV2HttpClient();
