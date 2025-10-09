/**
 * Service de configuration MCP pour les agents
 * Lit les serveurs MCP depuis Factoria (table agent_mcp_servers)
 * 
 * Architecture :
 * - agents <-> agent_mcp_servers <-> mcp_servers (Factoria)
 * - Mode hybride par défaut : OpenAPI (Scrivia) + MCP (Factoria)
 */

import { McpServerConfig, AgentMcpConfig, createMcpTool } from '@/types/mcp';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

/**
 * Service de gestion des configurations MCP pour les agents
 */
export class McpConfigService {
  private static instance: McpConfigService;
  private supabase: ReturnType<typeof createClient>;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  static getInstance(): McpConfigService {
    if (!McpConfigService.instance) {
      McpConfigService.instance = new McpConfigService();
    }
    return McpConfigService.instance;
  }

  /**
   * Récupère la configuration MCP d'un agent depuis Factoria
   */
  async getAgentMcpConfig(agentId: string): Promise<AgentMcpConfig | null> {
    try {
      // Récupérer les serveurs MCP liés à cet agent
      const { data: links, error } = await this.supabase
        .from('agent_mcp_servers')
        .select(`
          is_active,
          priority,
          mcp_servers (
            id,
            name,
            deployment_url,
            config
          )
        `)
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('priority');

      if (error) {
        logger.error('[McpConfigService] Erreur récupération liaisons MCP:', error);
        return null;
      }

      if (!links || links.length === 0) {
        logger.dev('[McpConfigService] Aucun serveur MCP lié à cet agent');
        return null;
      }

      // Construire la config MCP depuis les liaisons
      const servers: McpServerConfig[] = links.map((link: any) => {
        const server = link.mcp_servers;
        const config = server.config || {};
        
        return {
          type: 'mcp',
          server_label: server.name.toLowerCase().replace(/\s+/g, '-'),
          server_url: server.deployment_url,
          headers: config.apiKey ? { 'x-api-key': config.apiKey } : undefined
        };
      });

      return {
        enabled: true,
        servers,
        hybrid_mode: true // Toujours hybride
      };
    } catch (error) {
      logger.error('[McpConfigService] Erreur récupération config MCP:', error);
      return null;
    }
  }

  /**
   * Combine les tools OpenAPI et MCP pour un agent
   * 
   * Architecture hybride :
   * - OpenAPI v2 : Pour les données Scrivia (notes, classeurs, etc.)
   * - MCP Factoria : Pour les serveurs MCP personnalisés
   * 
   * ⚠️ TOUJOURS en mode hybride pour garder l'accès aux données Scrivia
   */
  async buildHybridTools(
    agentId: string,
    userId: string,
    openApiTools: any[]
  ): Promise<any[]> {
    const mcpConfig = await this.getAgentMcpConfig(agentId);
    
    if (!mcpConfig || !mcpConfig.enabled || mcpConfig.servers.length === 0) {
      // Pas de MCP, retourner seulement les tools OpenAPI
      logger.dev(`[McpConfigService] 📦 Mode OpenAPI pur: ${openApiTools.length} tools`);
      return openApiTools;
    }

    // ✅ Mode hybride : OpenAPI + MCP Factoria
    const mcpServers = mcpConfig.servers;
    logger.dev(`[McpConfigService] 🔀 Mode hybride: ${openApiTools.length} OpenAPI (Scrivia) + ${mcpServers.length} MCP (Factoria)`);
    
    // Retourner tous les tools : OpenAPI + serveurs MCP
    return [...openApiTools, ...mcpServers];
  }
}

// Export de l'instance singleton
export const mcpConfigService = McpConfigService.getInstance();

