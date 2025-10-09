/**
 * Service de configuration MCP pour les agents
 * Gère la configuration des serveurs MCP externes (Exa, ClickUp, Notion, etc.)
 * 
 * ⚠️ IMPORTANT : Le serveur MCP Scrivia n'est PAS utilisé ici
 * Raison : Nos agents utilisent déjà les endpoints OpenAPI v2 pour accéder aux données Scrivia
 * MCP est réservé aux services externes (websearch, intégrations tierces)
 */

import { McpServerConfig, AgentMcpConfig, createMcpTool } from '@/types/mcp';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Service de gestion des configurations MCP pour les agents
 */
export class McpConfigService {
  private static instance: McpConfigService;

  private constructor() {}

  static getInstance(): McpConfigService {
    if (!McpConfigService.instance) {
      McpConfigService.instance = new McpConfigService();
    }
    return McpConfigService.instance;
  }

  /**
   * Récupère la configuration MCP d'un agent depuis la DB
   */
  async getAgentMcpConfig(agentId: string): Promise<AgentMcpConfig | null> {
    try {
      // TODO: Récupérer depuis la table agents (colonne mcp_config JSONB)
      // Pour l'instant, retourner null
      return null;
    } catch (error) {
      logger.error('[McpConfigService] Erreur récupération config MCP:', error);
      return null;
    }
  }

  /**
   * Construit les outils MCP pour Groq depuis la config de l'agent
   * 
   * ⚠️ Cette méthode ne construit que les serveurs MCP EXTERNES (Exa, ClickUp, etc.)
   * Les outils Scrivia restent en OpenAPI v2
   */
  buildMcpTools(mcpConfig: AgentMcpConfig | null, userId: string): McpServerConfig[] {
    if (!mcpConfig || !mcpConfig.enabled) {
      return [];
    }

    const mcpTools: McpServerConfig[] = [];

    for (const server of mcpConfig.servers) {
      // Injecter le userId dans les headers si nécessaire pour certains services
      const headers = { ...server.headers };
      
      // Note : On ne traite PAS le serveur Scrivia ici (il reste en OpenAPI)
      if (server.server_label === 'scrivia') {
        logger.warn(`[McpConfigService] ⚠️ Serveur MCP Scrivia détecté mais ignoré (utiliser OpenAPI v2 à la place)`);
        continue;
      }

      mcpTools.push({
        type: 'mcp',
        server_label: server.server_label,
        server_url: server.server_url,
        headers
      });
    }

    logger.dev(`[McpConfigService] 🔧 ${mcpTools.length} serveurs MCP externes configurés`);
    return mcpTools;
  }

  /**
   * Combine les tools OpenAPI et MCP pour un agent
   * 
   * Architecture recommandée :
   * - OpenAPI v2 : Pour les données Scrivia (notes, classeurs, etc.)
   * - MCP : Pour les services externes (Exa, ClickUp, Notion, etc.)
   * 
   * ⚠️ TOUJOURS en mode hybride pour garder l'accès aux données Scrivia
   */
  async buildHybridTools(
    agentId: string,
    userId: string,
    openApiTools: any[]
  ): Promise<any[]> {
    const mcpConfig = await this.getAgentMcpConfig(agentId);
    
    if (!mcpConfig || !mcpConfig.enabled) {
      // Pas de MCP, retourner seulement les tools OpenAPI
      logger.dev(`[McpConfigService] 📦 Mode OpenAPI pur: ${openApiTools.length} tools`);
      return openApiTools;
    }

    const mcpTools = this.buildMcpTools(mcpConfig, userId);

    // ✅ TOUJOURS en mode hybride pour garder l'accès aux données Scrivia
    // Les outils MCP sont des AJOUTS, pas des remplacements
    logger.dev(`[McpConfigService] 🔀 Mode hybride: ${openApiTools.length} OpenAPI (Scrivia) + ${mcpTools.length} MCP (externes)`);
    return [...openApiTools, ...mcpTools];
  }

  /**
   * Crée une configuration MCP pour des services externes
   * 
   * Exemple : Exa (websearch), ClickUp (tasks), etc.
   */
  createExternalMcpConfig(
    servers: Array<{ label: string; url: string; apiKey?: string }>
  ): AgentMcpConfig {
    return {
      enabled: true,
      servers: servers.map(s => createMcpTool(
        s.label,
        s.url,
        s.apiKey ? { 'x-api-key': s.apiKey } : undefined
      )),
      hybrid_mode: true // Toujours hybride pour garder OpenAPI Scrivia
    };
  }
}

// Export de l'instance singleton
export const mcpConfigService = McpConfigService.getInstance();

