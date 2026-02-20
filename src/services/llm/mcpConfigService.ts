/**
 * Service de configuration MCP pour les agents
 * Lit les serveurs MCP depuis Factoria (table agent_mcp_servers)
 * 
 * Architecture :
 * - agents <-> agent_mcp_servers <-> mcp_servers (Factoria)
 * - Mode hybride par défaut : OpenAPI (Scrivia) + MCP (Factoria)
 */

import { McpServerConfig, AgentMcpConfig, ExternalMcpServer, externalServerToMcpTool, createMcpTool } from '@/types/mcp';
import type { Tool } from './types/strictTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

/**
 * Résultat de la jointure agent_mcp_servers -> mcp_servers
 */
interface McpServerLink {
  priority: number;
  is_active: boolean;
  mcp_servers: {
    id: string;
    name: string;
    description: string | null;
    url: string;
    header: string;
    api_key: string;
    server_description: string | null;  // ✅ NOUVEAU
    require_approval: 'never' | 'always' | null;  // ✅ NOUVEAU
    allowed_tools: string[] | null;  // ✅ NOUVEAU
  } | null;
}

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
   * Récupère la configuration MCP d'un agent depuis la DB
   * Lit depuis mcp_servers via agent_mcp_servers
   */
  async getAgentMcpConfig(agentId: string): Promise<AgentMcpConfig | null> {
    try {
      logger.info(`[McpConfigService] 🔍 Recherche serveurs MCP pour agent: ${agentId}`);
      
      // Récupérer les serveurs MCP via la jointure
      const { data: links, error } = await this.supabase
        .from('agent_mcp_servers')
        .select(`
          priority,
          is_active,
          mcp_servers (
            id,
            name,
            description,
            url,
            header,
            api_key,
            is_active,
            server_description,
            require_approval,
            allowed_tools
          )
        `)
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .order('priority');

      if (error) {
        logger.error('[McpConfigService] ❌ Erreur récupération serveurs MCP:', error);
        return null;
      }

      logger.info(`[McpConfigService] 🔍 Résultat requête: ${links?.length || 0} liens trouvés`);

      if (!links || links.length === 0) {
        logger.info(`[McpConfigService] ⚠️ Aucun serveur MCP configuré pour agent: ${agentId}`);
        return null;
      }

      // Convertir en tools MCP Groq
      const servers: McpServerConfig[] = (links as unknown as McpServerLink[])
        .filter(link => 
          link.mcp_servers && 
          link.mcp_servers.url
        )
        .map(link => {
          const server = link.mcp_servers!; // Non-null après le filter
          
          // Par défaut : tous les tools acceptés (allowed_tools vide = tous, doc LLM Exec MCP)
          const allowedTools = Array.isArray(server.allowed_tools) && server.allowed_tools.length > 0
            ? server.allowed_tools
            : [];

          const mcpServer: McpServerConfig = {
            type: 'mcp' as const,
            server_label: server.name?.toLowerCase().replace(/\s+/g, '-') || 'unnamed',
            server_url: server.url,
            headers: server.header && server.api_key 
              ? { [server.header]: server.api_key }
              : undefined,
            server_description: server.server_description || undefined,
            require_approval: server.require_approval || 'never',
            allowed_tools
          };
          
          return mcpServer;
        });

      if (servers.length === 0) {
        logger.dev('[McpConfigService] Aucun serveur MCP valide trouvé');
        return null;
      }

      logger.dev(`[McpConfigService] ✅ ${servers.length} serveurs MCP trouvés pour cet agent`);

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
   * 
   * @param agentId - ID de l'agent
   * @param userToken - JWT de l'utilisateur authentifié (pour remplacer {{USER_JWT}})
   * @param openApiTools - Tools OpenAPI à combiner avec les serveurs MCP
   */
  async buildHybridTools(
    agentId: string,
    userToken: string,
    openApiTools: Tool[]
  ): Promise<Array<Tool | McpServerConfig>> {
    const mcpConfig = await this.getAgentMcpConfig(agentId);
    
    if (!mcpConfig || !mcpConfig.enabled || mcpConfig.servers.length === 0) {
      // Pas de MCP, retourner seulement les tools OpenAPI
      logger.dev(`[McpConfigService] 📦 Mode OpenAPI pur: ${openApiTools.length} tools`);
      return openApiTools;
    }

    // ✅ Mode hybride : OpenAPI + MCP Factoria
    // Injecter le JWT de l'utilisateur dans les serveurs qui utilisent {{USER_JWT}}
    const mcpServers = mcpConfig.servers.map(server => {
      if (server.headers) {
        const processedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(server.headers)) {
          // Remplacer {{USER_JWT}} par le vrai JWT de l'utilisateur
          if (value === '{{USER_JWT}}' && userToken) {
            processedHeaders[key] = `Bearer ${userToken}`;
            logger.dev(`[McpConfigService] 🔑 JWT injecté pour serveur: ${server.server_label}`);
          } else {
            processedHeaders[key] = value;
          }
        }
        return {
          ...server,
          headers: processedHeaders
        };
      }
      return server;
    });
    
    logger.dev(`[McpConfigService] 🔀 Mode hybride: ${openApiTools.length} OpenAPI (Scrivia) + ${mcpServers.length} MCP (Factoria)`);
    
    // Retourner tous les tools : OpenAPI + serveurs MCP
    return [...openApiTools, ...mcpServers];
  }
}

// Export de l'instance singleton
export const mcpConfigService = McpConfigService.getInstance();

