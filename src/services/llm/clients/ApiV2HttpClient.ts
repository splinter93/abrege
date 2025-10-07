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
    
    // 🔧 SERVER-SIDE (Vercel Production)
    if (process.env.VERCEL_URL) {
      const vercelUrl = `https://${process.env.VERCEL_URL}`;
      logger.info(`[ApiV2HttpClient] 🚀 Vercel URL: ${vercelUrl}`);
      return vercelUrl;
    }
    
    // 🔧 SERVER-SIDE (Custom ou local)
    const fallbackUrl = process.env.NEXT_PUBLIC_API_BASE_URL 
      || process.env.NEXT_PUBLIC_SITE_URL 
      || 'http://localhost:3000';
    
    logger.info(`[ApiV2HttpClient] 🔧 Fallback URL: ${fallbackUrl}`);
    return fallbackUrl;
  }

  /**
   * Méthode générique pour tous les appels HTTP
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    params: Record<string, unknown> | null,
    userToken: string
  ): Promise<T> {
    let url = `${this.baseUrl}/api/v2${endpoint}`;
    
    // 🔧 CORRECTION PROD : Si on est côté serveur (Node.js), utiliser SERVICE_ROLE + userId dans headers
    const isServerSide = typeof window === 'undefined';
    
    let headers: Record<string, string>;
    
    if (isServerSide && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      // SERVEUR : Utiliser SERVICE_ROLE_KEY + X-User-Id pour impersonation
      headers = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'agent',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'X-User-Id': userToken, // Le userToken est en fait l'userId côté serveur
        'X-Service-Role': 'true'
      };
      
      logger.info(`[ApiV2HttpClient] 🔑 Authentification SERVICE_ROLE (serveur)`, {
        userId: userToken.substring(0, 8) + '...',
        hasServiceKey: true
      });
    } else {
      // CLIENT : Utiliser le JWT du user classique
      headers = {
        'Content-Type': 'application/json',
        'X-Client-Type': 'agent',
        'Authorization': `Bearer ${userToken}`
      };
      
      logger.info(`[ApiV2HttpClient] 🔑 Authentification JWT (client)`, {
        tokenLength: userToken.length
      });
    }
    
    // 🔍 LOGS DE DIAGNOSTIC POUR PROD
    logger.dev(`[ApiV2HttpClient] 📡 ${method} ${endpoint}`, {
      baseUrl: this.baseUrl,
      isServerSide,
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'Vercel' : 'Local'
    });

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
          headers: Object.fromEntries(response.headers.entries()),
          tokenInfo: {
            length: userToken.length,
            start: userToken.substring(0, 20) + '...'
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

  // Notes - Opérations avancées
  async applyContentOperations(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/note/${ref}/apply`, 'POST', params, userToken);
  }

  async insertNoteContent(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/note/${ref}/insert`, 'POST', params, userToken);
  }

  async getNoteTOC(ref: string, userToken: string) {
    return this.makeRequest(`/note/${ref}/toc`, 'GET', null, userToken);
  }

  async getNoteShareSettings(ref: string, userToken: string) {
    return this.makeRequest(`/note/${ref}/share`, 'GET', null, userToken);
  }

  async updateNoteShareSettings(ref: string, params: any, userToken: string) {
    return this.makeRequest(`/note/${ref}/share`, 'PUT', params, userToken);
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