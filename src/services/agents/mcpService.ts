/**
 * Service pour la gestion des serveurs MCP et leurs liaisons avec les agents
 * Production-ready avec TypeScript strict
 */

import { McpServer, AgentMcpServerWithDetails, LinkMcpServerRequest } from '@/types/mcp';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Réponse de l'API pour la liste des serveurs MCP
 */
interface ListMcpServersResponse {
  success: boolean;
  servers: McpServer[];
  total: number;
}

/**
 * Réponse de l'API pour les serveurs MCP d'un agent
 */
interface AgentMcpServersResponse {
  success: boolean;
  servers: AgentMcpServerWithDetails[];
  total: number;
}

/**
 * Service pour gérer les serveurs MCP
 */
export class McpService {
  /**
   * Récupère le token d'authentification depuis Supabase
   */
  private async getAuthToken(): Promise<string> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuration Supabase manquante');
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
   * Liste tous les serveurs MCP de l'utilisateur
   */
  async listMcpServers(): Promise<McpServer[]> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuration Supabase manquante');
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase
        .from('mcp_servers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        logger.error('McpService.listMcpServers:', error);
        throw new Error('Erreur lors de la récupération des serveurs MCP');
      }

      return data || [];
    } catch (error) {
      logger.error('McpService.listMcpServers:', error);
      throw error instanceof Error ? error : new Error('Erreur inconnue');
    }
  }

  /**
   * Récupère les serveurs MCP liés à un agent
   */
  async getAgentMcpServers(agentId: string): Promise<AgentMcpServerWithDetails[]> {
    if (!agentId || agentId.trim() === '') {
      throw new Error('ID de l\'agent requis');
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuration Supabase manquante');
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase
        .from('agent_mcp_servers')
        .select(`
          *,
          mcp_server:mcp_servers(*)
        `)
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('priority');

      if (error) {
        logger.error('McpService.getAgentMcpServers:', error);
        throw new Error('Erreur lors de la récupération des serveurs MCP de l\'agent');
      }

      return (data || []) as AgentMcpServerWithDetails[];
    } catch (error) {
      logger.error('McpService.getAgentMcpServers:', error);
      throw error instanceof Error ? error : new Error('Erreur inconnue');
    }
  }

  /**
   * Lie un serveur MCP à un agent
   */
  async linkMcpServerToAgent(request: LinkMcpServerRequest): Promise<boolean> {
    if (!request.agent_id || request.agent_id.trim() === '') {
      throw new Error('ID de l\'agent requis');
    }

    if (!request.mcp_server_id || request.mcp_server_id.trim() === '') {
      throw new Error('ID du serveur MCP requis');
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuration Supabase manquante');
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error } = await supabase
        .from('agent_mcp_servers')
        .insert({
          agent_id: request.agent_id,
          mcp_server_id: request.mcp_server_id,
          priority: request.priority || 0,
          is_active: request.is_active !== false,
        });

      if (error) {
        // Si erreur de contrainte unique, c'est que le lien existe déjà
        if (error.code === '23505') {
          throw new Error('Ce serveur MCP est déjà lié à cet agent');
        }
        logger.error('McpService.linkMcpServerToAgent:', error);
        throw new Error('Erreur lors de la liaison du serveur MCP');
      }

      return true;
    } catch (error) {
      logger.error('McpService.linkMcpServerToAgent:', error);
      throw error instanceof Error ? error : new Error('Erreur inconnue');
    }
  }

  /**
   * Délie un serveur MCP d'un agent
   */
  async unlinkMcpServerFromAgent(agentId: string, mcpServerId: string): Promise<boolean> {
    if (!agentId || agentId.trim() === '') {
      throw new Error('ID de l\'agent requis');
    }

    if (!mcpServerId || mcpServerId.trim() === '') {
      throw new Error('ID du serveur MCP requis');
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuration Supabase manquante');
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error } = await supabase
        .from('agent_mcp_servers')
        .delete()
        .eq('agent_id', agentId)
        .eq('mcp_server_id', mcpServerId);

      if (error) {
        logger.error('McpService.unlinkMcpServerFromAgent:', error);
        throw new Error('Erreur lors de la suppression de la liaison');
      }

      return true;
    } catch (error) {
      logger.error('McpService.unlinkMcpServerFromAgent:', error);
      throw error instanceof Error ? error : new Error('Erreur inconnue');
    }
  }
}

/**
 * Instance singleton du service
 */
export const mcpService = new McpService();

