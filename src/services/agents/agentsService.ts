/**
 * Service client pour la gestion des agents spécialisés
 * Production-ready avec TypeScript strict
 */

import { SpecializedAgentConfig, CreateSpecializedAgentRequest } from '@/types/specializedAgents';

/**
 * Réponse de l'API pour la liste des agents
 */
interface ListAgentsResponse {
  success: boolean;
  data: SpecializedAgentConfig[];
  metadata: {
    timestamp: string;
    executionTime: number;
    totalCount: number;
  };
}

/**
 * Réponse de l'API pour un agent individuel
 */
interface AgentResponse {
  success: boolean;
  data?: SpecializedAgentConfig;
  agent?: SpecializedAgentConfig;
  message?: string;
  error?: string;
  metadata?: {
    agentId: string;
    executionTime: number;
    timestamp: string;
  };
}

/**
 * Réponse de l'API pour la suppression
 */
interface DeleteAgentResponse {
  success: boolean;
  message: string;
  metadata: {
    agentId: string;
    executionTime: number;
    timestamp: string;
  };
}

/**
 * Options pour les requêtes API
 */
interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  token?: string;
}

/**
 * Classe de service pour les agents spécialisés
 */
export class AgentsService {
  private readonly baseUrl = '/api/v2/agents';
  
  /**
   * Récupère le token d'authentification depuis Supabase
   */
  private async getAuthToken(): Promise<string> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration Supabase manquante (NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Aucune session active');
    }
    
    return session.access_token;
  }

  /**
   * Effectue une requête API avec gestion d'erreur
   */
  private async apiRequest<T>(
    endpoint: string, 
    options: ApiRequestOptions
  ): Promise<T> {
    const token = options.token || await this.getAuthToken();
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      method: options.method,
      headers,
    };

    if (options.body && options.method !== 'GET') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(endpoint, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(error.error || error.message || 'Erreur API');
    }

    return response.json();
  }

  /**
   * Liste tous les agents spécialisés
   */
  async listAgents(): Promise<SpecializedAgentConfig[]> {
    const response = await this.apiRequest<ListAgentsResponse>(
      this.baseUrl,
      { method: 'GET' }
    );

    if (!response.success || !response.data) {
      throw new Error('Échec de la récupération des agents');
    }

    return response.data;
  }

  /**
   * Récupère un agent spécifique par ID ou slug
   */
  async getAgent(agentId: string): Promise<SpecializedAgentConfig> {
    if (!agentId || agentId.trim() === '') {
      throw new Error('ID ou slug de l\'agent requis');
    }

    const response = await this.apiRequest<AgentResponse>(
      `${this.baseUrl}/${agentId}`,
      { method: 'GET' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Agent non trouvé');
    }

    // L'API peut retourner data ou directement les propriétés
    if (response.data) {
      return response.data;
    }

    // Construire l'agent depuis la réponse directe
    const { success, error, metadata, ...agentData } = response;
    
    // Validation des champs requis
    if (!('id' in agentData) || !('name' in agentData)) {
      throw new Error('Réponse API invalide: champs requis manquants (id, name)');
    }
    
    return agentData as SpecializedAgentConfig;
  }

  /**
   * Crée un nouvel agent spécialisé
   */
  async createAgent(
    agentData: CreateSpecializedAgentRequest
  ): Promise<SpecializedAgentConfig> {
    // Validation des champs requis
    if (!agentData.slug || agentData.slug.trim() === '') {
      throw new Error('Le slug est requis pour créer un agent');
    }

    if (!agentData.display_name || agentData.display_name.trim() === '') {
      throw new Error('Le nom d\'affichage est requis pour créer un agent');
    }

    if (!agentData.model || agentData.model.trim() === '') {
      throw new Error('Le modèle LLM est requis pour créer un agent');
    }

    if (!agentData.description || agentData.description.trim() === '') {
      throw new Error('La description est requise pour créer un agent');
    }

    if (!agentData.system_instructions || agentData.system_instructions.trim() === '') {
      throw new Error('Les instructions système sont requises pour créer un agent');
    }

    const response = await this.apiRequest<AgentResponse>(
      this.baseUrl,
      { 
        method: 'POST',
        body: agentData as unknown as Record<string, unknown>
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Échec de la création de l\'agent');
    }

    const agent = response.data || response.agent;
    if (!agent) {
      throw new Error('Aucune donnée d\'agent retournée');
    }

    return agent;
  }

  /**
   * Met à jour complètement un agent (PUT)
   */
  async updateAgent(
    agentId: string,
    updates: Partial<SpecializedAgentConfig>
  ): Promise<SpecializedAgentConfig> {
    if (!agentId || agentId.trim() === '') {
      throw new Error('ID ou slug de l\'agent requis');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('Aucune donnée de mise à jour fournie');
    }

    const response = await this.apiRequest<AgentResponse>(
      `${this.baseUrl}/${agentId}`,
      { 
        method: 'PUT',
        body: updates as Record<string, unknown>
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Échec de la mise à jour de l\'agent');
    }

    const agent = response.data || response.agent;
    if (!agent) {
      throw new Error('Aucune donnée d\'agent retournée');
    }

    return agent;
  }

  /**
   * Met à jour partiellement un agent (PATCH)
   */
  async patchAgent(
    agentId: string,
    updates: Partial<SpecializedAgentConfig>
  ): Promise<SpecializedAgentConfig> {
    if (!agentId || agentId.trim() === '') {
      throw new Error('ID ou slug de l\'agent requis');
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('Aucune donnée de mise à jour fournie');
    }

    const response = await this.apiRequest<AgentResponse>(
      `${this.baseUrl}/${agentId}`,
      { 
        method: 'PATCH',
        body: updates as Record<string, unknown>
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Échec de la mise à jour de l\'agent');
    }

    const agent = response.data || response.agent;
    if (!agent) {
      throw new Error('Aucune donnée d\'agent retournée');
    }

    return agent;
  }

  /**
   * Supprime un agent spécialisé
   */
  async deleteAgent(agentId: string): Promise<void> {
    if (!agentId || agentId.trim() === '') {
      throw new Error('ID ou slug de l\'agent requis');
    }

    const response = await this.apiRequest<DeleteAgentResponse>(
      `${this.baseUrl}/${agentId}`,
      { method: 'DELETE' }
    );

    if (!response.success) {
      throw new Error('Échec de la suppression de l\'agent');
    }
  }

  /**
   * Vérifie si un agent existe (HEAD)
   */
  async checkAgentExists(agentId: string): Promise<boolean> {
    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/${agentId}`, {
        method: 'HEAD',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Instance singleton du service
 */
export const agentsService = new AgentsService();

