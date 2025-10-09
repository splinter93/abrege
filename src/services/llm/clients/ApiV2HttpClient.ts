/**
 * ApiV2HttpClient - Version simplifiée et robuste
 * 200 lignes max, générique, zéro répétition
 */

import { simpleLogger as logger } from '@/utils/logger';

/**
 * Types simplifiés
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
}

/**
 * Client HTTP simplifié pour l'API V2
 * Approche générique au lieu de 50+ méthodes répétitives
 */
export class ApiV2HttpClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(baseUrl?: string, timeout: number = 30000) {
    this.baseUrl = baseUrl || this.getDefaultBaseUrl();
    this.timeout = timeout;
  }

  private getDefaultBaseUrl(): string {
    // 🌐 CLIENT-SIDE : Utiliser l'origine de la page courante
    if (typeof window !== 'undefined') {
      const clientUrl = window.location.origin;
      logger.dev(`[ApiV2HttpClient] 🌐 Client-side URL: ${clientUrl}`);
      return clientUrl;
    }
    
    // 🔧 DEBUG: Log toutes les variables d'environnement pertinentes
    logger.info(`[ApiV2HttpClient] 🔍 Env vars:`, {
      VERCEL: process.env.VERCEL,
      VERCEL_URL: process.env.VERCEL_URL,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    });
    
    // 🔧 SERVER-SIDE (Vercel Production)
    // PROBLÈME : VERCEL_URL pointe vers l'URL interne, pas le domaine custom
    // SOLUTION : Utiliser le domaine custom pour les appels internes
    if (process.env.VERCEL && process.env.NEXT_PUBLIC_API_BASE_URL) {
      const customUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      logger.info(`[ApiV2HttpClient] 🌐 Custom URL (domaine): ${customUrl}`);
      return customUrl;
    }
    
    if (process.env.VERCEL_URL) {
      const vercelUrl = `https://${process.env.VERCEL_URL}`;
      logger.info(`[ApiV2HttpClient] 🚀 Vercel URL (interne): ${vercelUrl}`);
      return vercelUrl;
    }
    
    // 🔧 SERVER-SIDE (Local ou autre)
    const fallbackUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    logger.info(`[ApiV2HttpClient] 🔧 Fallback URL: ${fallbackUrl}`);
    return fallbackUrl;
  }

  /**
   * Méthode générique pour tous les appels HTTP
   * @param endpoint - Endpoint de l'API (ex: /note/create)
   * @param method - Méthode HTTP
   * @param params - Paramètres de la requête
   * @param userToken - JWT d'authentification (jamais userId)
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    params: Record<string, unknown> | null,
    userToken: string
  ): Promise<T> {
    let url = `${this.baseUrl}/api/v2${endpoint}`;
    
    // ✅ FIX PROD CRITIQUE : Si c'est un UUID, utiliser SERVICE_ROLE + impersonation
    // Si c'est un JWT, l'utiliser tel quel (mais il peut expirer)
    let headers: Record<string, string>;
    
    if (this.isUUID(userToken)) {
      // 🔧 C'est un UUID : Utiliser SERVICE_ROLE avec impersonation
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante pour l\'impersonation');
      }
      
      headers = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'agent',
        'X-User-Id': userToken,
        'X-Service-Role': 'true',
        'Authorization': `Bearer ${serviceRoleKey}`
      };
      
      logger.dev(`[ApiV2HttpClient] 🤖 Impersonation: userId=${userToken.substring(0, 8)}...`);
    } else {
      // 🔧 C'est un JWT : L'utiliser tel quel
      headers = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'agent',
        'Authorization': `Bearer ${userToken}`
      };
      
      logger.dev(`[ApiV2HttpClient] 🔑 JWT utilisé directement`);
    }
    
    const isServerSide = typeof window === 'undefined';

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
      logger.dev(`[ApiV2HttpClient] ${method} ${url}`);

      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        // 🔍 DIAGNOSTIC DÉTAILLÉ EN CAS D'ERREUR
        const errorData = await response.json().catch(() => ({}));
        
        logger.error(`[ApiV2HttpClient] ❌ ${response.status} ${response.statusText}`, {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          errorData,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          requestHeaders: {
            'Authorization': headers['Authorization'] ? 'Bearer ***' : 'MISSING',
            'Content-Type': headers['Content-Type'],
            'X-Client-Type': headers['X-Client-Type']
          },
          tokenInfo: {
            type: this.detectTokenType(userToken),
            length: userToken.length,
            start: userToken.substring(0, 20) + '...',
            end: '...' + userToken.substring(userToken.length - 20)
          }
        });
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as T;
      logger.dev(`[ApiV2HttpClient] ✅ ${method} ${url} success`);
      return data;

    } catch (error) {
      logger.error(`[ApiV2HttpClient] ❌ ${method} ${url} failed:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        url,
        method
      });
      throw error;
    }
  }

  /**
   * Détecte le type de token (JWT vs UUID)
   * @param token - Token à analyser
   * @returns Type du token détecté
   */
  private detectTokenType(token: string): 'JWT' | 'UUID' | 'UNKNOWN' {
    // UUID v4 pattern
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
      return 'UUID';
    }
    
    // JWT pattern (3 parts séparés par des points)
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token)) {
      return 'JWT';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Vérifie si une string est un UUID valide
   */
  private isUUID(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  // ============================================================================
  // MÉTHODES GÉNÉRIQUES POUR TOUS LES ENDPOINTS
  // ============================================================================

  // Notes
  async createNote(params: any, userToken: string) {
    return this.makeRequest('/note/create', 'POST', params, userToken);
  }

  async getNote(params: any, userToken: string) {
    const { ref, fields = 'all' } = params;
    return this.makeRequest(`/note/${ref}`, 'GET', { fields }, userToken);
  }

  async updateNote(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/note/${ref}/update`, 'PUT', params, userToken);
  }

  async moveNote(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/note/${ref}/move`, 'POST', params, userToken);
  }

  async insertNoteContent(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/note/${ref}/insert-content`, 'POST', params, userToken);
  }

  async applyContentOperations(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/note/${ref}/content:apply`, 'POST', params, userToken);
  }

  async getNoteTOC(ref: string, userToken: string) {
    return this.makeRequest(`/note/${ref}/table-of-contents`, 'GET', null, userToken);
  }

  async getNoteShareSettings(ref: string, userToken: string) {
    return this.makeRequest(`/note/${ref}/share`, 'GET', null, userToken);
  }

  async updateNoteShareSettings(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/note/${ref}/share`, 'PUT', params, userToken);
  }

  async getRecentNotes(params: any, userToken: string) {
    return this.makeRequest('/note/recent', 'GET', params, userToken);
  }

  // Classeurs
  async createClasseur(params: any, userToken: string) {
    return this.makeRequest('/classeur/create', 'POST', params, userToken);
  }

  async getClasseur(params: any, userToken: string) {
    const { ref } = params;
    return this.makeRequest(`/classeur/${ref}`, 'GET', null, userToken);
  }

  async updateClasseur(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/classeur/${ref}/update`, 'PUT', params, userToken);
  }

  async getClasseurTree(ref: string, userToken: string) {
    return this.makeRequest(`/classeur/${ref}/tree`, 'GET', null, userToken);
  }

  async getClasseursWithContent(userToken: string) {
    return this.makeRequest('/classeurs/with-content', 'GET', null, userToken);
  }

  async listClasseurs(userToken: string) {
    return this.makeRequest('/classeurs', 'GET', null, userToken);
  }

  // Dossiers
  async createFolder(params: any, userToken: string) {
    return this.makeRequest('/folder/create', 'POST', params, userToken);
  }

  async getFolder(params: any, userToken: string) {
    const { ref } = params;
    return this.makeRequest(`/folder/${ref}`, 'GET', null, userToken);
  }

  async updateFolder(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/folder/${ref}/update`, 'PUT', params, userToken);
  }

  async moveFolder(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/folder/${ref}/move`, 'POST', params, userToken);
  }

  async getFolderTree(ref: string, userToken: string) {
    return this.makeRequest(`/folder/${ref}/tree`, 'GET', null, userToken);
  }

  // Recherche
  async searchContent(params: any, userToken: string) {
    return this.makeRequest('/search', 'GET', params, userToken);
  }

  async searchFiles(params: any, userToken: string) {
    return this.makeRequest('/files/search', 'GET', params, userToken);
  }

  // Autres
  async getStats(userToken: string) {
    return this.makeRequest('/stats', 'GET', null, userToken);
  }

  async getUserProfile(userToken: string) {
    return this.makeRequest('/me', 'GET', null, userToken);
  }

  async getTrash(userToken: string) {
    return this.makeRequest('/trash', 'GET', null, userToken);
  }

  async restoreFromTrash(params: any, userToken: string) {
    return this.makeRequest('/trash/restore', 'POST', params, userToken);
  }

  async purgeTrash(userToken: string) {
    return this.makeRequest('/trash/purge', 'POST', null, userToken);
  }

  async deleteResource(resource: string, ref: string, userToken: string) {
    return this.makeRequest(`/delete/${resource}/${ref}`, 'DELETE', null, userToken);
  }

  // Agents
  async listAgents(userToken: string) {
    return this.makeRequest('/agents', 'GET', null, userToken);
  }

  async createAgent(params: any, userToken: string) {
    return this.makeRequest('/agents', 'POST', params, userToken);
  }

  async getAgent(agentId: string, userToken: string) {
    return this.makeRequest(`/agents/${agentId}`, 'GET', null, userToken);
  }

  async executeAgent(params: any, userToken: string) {
    return this.makeRequest('/agents/execute', 'POST', params, userToken);
  }

  async updateAgent(agentId: string, params: any, userToken: string) {
    return this.makeRequest(`/agents/${agentId}`, 'PUT', params, userToken);
  }

  async patchAgent(agentId: string, params: any, userToken: string) {
    return this.makeRequest(`/agents/${agentId}`, 'PATCH', params, userToken);
  }

  async deleteAgent(agentId: string, userToken: string) {
    return this.makeRequest(`/agents/${agentId}`, 'DELETE', null, userToken);
  }

  // Classeurs - Opérations avancées
  async reorderClasseurs(params: any, userToken: string) {
    return this.makeRequest('/classeurs/reorder', 'POST', params, userToken);
  }

  // Debug
  async listTools(userToken: string) {
    return this.makeRequest('/tools', 'GET', null, userToken);
  }

  async debugInfo(userToken: string) {
    return this.makeRequest('/debug', 'GET', null, userToken);
  }
}

// Instance singleton exportée
export const apiV2HttpClient = new ApiV2HttpClient();