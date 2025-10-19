import { createClient } from '@supabase/supabase-js';

// Types pour l'API UI
export interface UIApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface NoteData {
  id?: string;
  title: string;
  content: string;
  folder_id?: string;
  classeur_id?: string;
  slug?: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FolderData {
  id?: string;
  name: string;
  parent_id?: string;
  classeur_id?: string;
  slug?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClasseurData {
  id?: string;
  name: string;
  description?: string;
  slug?: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SearchResult {
  notes: NoteData[];
  folders: FolderData[];
  classeurs: ClasseurData[];
  total: number;
}

/**
 * Service unifié pour l'API UI
 * 
 * Ce service centralise toutes les opérations d'interface utilisateur
 * et remplace progressivement les services V1 et V2 existants
 */
export class UIApiService {
  private baseUrl: string;
  private supabase: ReturnType<typeof createClient>;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = '/api/ui';
    
    // Initialisation Supabase pour la validation des tokens
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * Définit le token d'authentification
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Récupère le token d'authentification
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  /**
   * Effectue une requête HTTP avec authentification
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<UIApiResponse<T>> {
    if (!this.authToken) {
      throw new Error('Token d\'authentification requis');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`[UI API] Erreur lors de la requête ${endpoint}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // OPÉRATIONS SUR LES NOTES
  // ============================================================================

  /**
   * Crée une nouvelle note
   */
  async createNote(noteData: NoteData): Promise<UIApiResponse<NoteData>> {
    return this.makeRequest<NoteData>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        resource: 'note',
        data: noteData
      })
    });
  }

  /**
   * Récupère une note par son ID
   */
  async getNote(id: string): Promise<UIApiResponse<NoteData>> {
    return this.makeRequest<NoteData>(`?action=get&resource=note&id=${encodeURIComponent(id)}`);
  }

  /**
   * Met à jour une note existante
   */
  async updateNote(noteData: NoteData): Promise<UIApiResponse<NoteData>> {
    if (!noteData.id) {
      throw new Error('ID de note requis pour la mise à jour');
    }

    return this.makeRequest<NoteData>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        resource: 'note',
        data: noteData
      })
    });
  }

  /**
   * Supprime une note
   */
  async deleteNote(id: string): Promise<UIApiResponse<void>> {
    return this.makeRequest<void>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        resource: 'note',
        data: { id }
      })
    });
  }

  /**
   * Liste toutes les notes de l'utilisateur
   */
  async listNotes(params?: {
    classeur_id?: string;
    folder_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<UIApiResponse<NoteData[]>> {
    const searchParams = new URLSearchParams();
    searchParams.set('action', 'list');
    searchParams.set('resource', 'notes');
    
    if (params?.classeur_id) searchParams.set('classeur_id', params.classeur_id);
    if (params?.folder_id) searchParams.set('folder_id', params.folder_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    return this.makeRequest<NoteData[]>(`?${searchParams.toString()}`);
  }

  /**
   * Déplace une note vers un autre dossier/classeur
   */
  async moveNote(
    noteId: string,
    targetFolderId?: string,
    targetClasseurId?: string
  ): Promise<UIApiResponse<void>> {
    return this.makeRequest<void>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'move',
        resource: 'note',
        data: {
          id: noteId,
          targetFolderId,
          targetClasseurId
        }
      })
    });
  }

  // ============================================================================
  // OPÉRATIONS SUR LES DOSSIERS
  // ============================================================================

  /**
   * Crée un nouveau dossier
   */
  async createFolder(folderData: FolderData): Promise<UIApiResponse<FolderData>> {
    return this.makeRequest<FolderData>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        resource: 'folder',
        data: folderData
      })
    });
  }

  /**
   * Récupère un dossier par son ID
   */
  async getFolder(id: string): Promise<UIApiResponse<FolderData>> {
    return this.makeRequest<FolderData>(`?action=get&resource=folder&id=${encodeURIComponent(id)}`);
  }

  /**
   * Met à jour un dossier existant
   */
  async updateFolder(folderData: FolderData): Promise<UIApiResponse<FolderData>> {
    if (!folderData.id) {
      throw new Error('ID de dossier requis pour la mise à jour');
    }

    return this.makeRequest<FolderData>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        resource: 'folder',
        data: folderData
      })
    });
  }

  /**
   * Supprime un dossier
   */
  async deleteFolder(id: string): Promise<UIApiResponse<void>> {
    return this.makeRequest<void>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        resource: 'folder',
        data: { id }
      })
    });
  }

  /**
   * Liste tous les dossiers de l'utilisateur
   */
  async listFolders(params?: {
    classeur_id?: string;
    parent_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<UIApiResponse<FolderData[]>> {
    const searchParams = new URLSearchParams();
    searchParams.set('action', 'list');
    searchParams.set('resource', 'folders');
    
    if (params?.classeur_id) searchParams.set('classeur_id', params.classeur_id);
    if (params?.parent_id) searchParams.set('parent_id', params.parent_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    return this.makeRequest<FolderData[]>(`?${searchParams.toString()}`);
  }

  /**
   * Déplace un dossier vers un autre parent/classeur
   */
  async moveFolder(
    folderId: string,
    targetParentId?: string,
    targetClasseurId?: string
  ): Promise<UIApiResponse<void>> {
    return this.makeRequest<void>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'move',
        resource: 'folder',
        data: {
          id: folderId,
          targetParentId,
          targetClasseurId
        }
      })
    });
  }

  // ============================================================================
  // OPÉRATIONS SUR LES CLASSEURS
  // ============================================================================

  /**
   * Crée un nouveau classeur
   */
  async createClasseur(classeurData: ClasseurData): Promise<UIApiResponse<ClasseurData>> {
    return this.makeRequest<ClasseurData>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create',
        resource: 'classeur',
        data: classeurData
      })
    });
  }

  /**
   * Récupère un classeur par son ID
   */
  async getClasseur(id: string): Promise<UIApiResponse<ClasseurData>> {
    return this.makeRequest<ClasseurData>(`?action=get&resource=classeur&id=${encodeURIComponent(id)}`);
  }

  /**
   * Met à jour un classeur existant
   */
  async updateClasseur(classeurData: ClasseurData): Promise<UIApiResponse<ClasseurData>> {
    if (!classeurData.id) {
      throw new Error('ID de classeur requis pour la mise à jour');
    }

    return this.makeRequest<ClasseurData>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        resource: 'classeur',
        data: classeurData
      })
    });
  }

  /**
   * Supprime un classeur
   */
  async deleteClasseur(id: string): Promise<UIApiResponse<void>> {
    return this.makeRequest<void>('', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        resource: 'classeur',
        data: { id }
      })
    });
  }

  /**
   * Liste tous les classeurs de l'utilisateur
   */
  async listClasseurs(params?: {
    limit?: number;
    offset?: number;
    include_content?: boolean;
  }): Promise<UIApiResponse<ClasseurData[]>> {
    const searchParams = new URLSearchParams();
    searchParams.set('action', 'list');
    searchParams.set('resource', 'classeurs');
    
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.include_content) searchParams.set('include_content', 'true');

    return this.makeRequest<ClasseurData[]>(`?${searchParams.toString()}`);
  }

  // ============================================================================
  // RECHERCHE ET OPÉRATIONS SPÉCIALES
  // ============================================================================

  /**
   * Effectue une recherche globale
   */
  async search(query: string, params?: {
    limit?: number;
    resource_types?: string[];
  }): Promise<UIApiResponse<SearchResult>> {
    const searchParams = new URLSearchParams();
    searchParams.set('action', 'search');
    searchParams.set('q', query);
    
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.resource_types) searchParams.set('resource_types', params.resource_types.join(','));

    return this.makeRequest<SearchResult>(`?${searchParams.toString()}`);
  }

  /**
   * Récupère l'activité récente
   */
  async getRecentActivity(params?: {
    limit?: number;
    resource_types?: string[];
  }): Promise<UIApiResponse<{
    notes: NoteData[];
    folders: FolderData[];
    classeurs: ClasseurData[];
  }>> {
    const searchParams = new URLSearchParams();
    searchParams.set('action', 'list');
    searchParams.set('resource', 'recent');
    
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.resource_types) searchParams.set('resource_types', params.resource_types.join(','));

    return this.makeRequest<{
      notes: NoteData[];
      folders: FolderData[];
      classeurs: ClasseurData[];
    }>(`?${searchParams.toString()}`);
  }

  // ============================================================================
  // MÉTHODES UTILITAIRES
  // ============================================================================

  /**
   * Vérifie la santé de l'API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?action=status`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Récupère les statistiques de l'utilisateur
   */
  async getUserStats(): Promise<UIApiResponse<{
    notes_count: number;
    folders_count: number;
    classeurs_count: number;
    total_size: number;
  }>> {
    return this.makeRequest<{
      notes_count: number;
      folders_count: number;
      classeurs_count: number;
      total_size: number;
    }>('?action=stats');
  }

  /**
   * Nettoie les ressources temporaires
   */
  async cleanup(): Promise<void> {
    // TODO: Implémenter le nettoyage des ressources temporaires
    console.log('[UI API] Nettoyage des ressources temporaires');
  }
}

// Instance singleton du service
export const uiApiService = new UIApiService();

// Export des types pour utilisation externe
export type { UIApiResponse, NoteData, FolderData, ClasseurData, SearchResult };
