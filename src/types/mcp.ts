/**
 * Types pour le système MCP (Model Context Protocol)
 * Basé sur la spécification Groq MCP: https://console.groq.com/docs/mcp
 */

/**
 * Serveur MCP configuré
 */
export interface McpServer {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  url: string;
  header: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Liaison entre un agent et un serveur MCP
 */
export interface AgentMcpServer {
  id: string;
  agent_id: string;
  mcp_server_id: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Serveur MCP avec informations de liaison (JOIN)
 */
export interface AgentMcpServerWithDetails extends AgentMcpServer {
  mcp_server: McpServer;
}

/**
 * Configuration MCP pour l'appel d'outils (format Groq MCP)
 */
export interface McpServerConfig {
  type: 'mcp';
  server_label: string;
  server_url: string;
  headers?: Record<string, string>;
  server_description?: string;  // ✅ NOUVEAU: Description pour aider le modèle
  require_approval?: 'never' | 'always' | 'auto';
  /** Liste des tools autorisés ; [] = tous les tools du serveur (défaut). */
  allowed_tools?: string[];
}

export interface AgentMcpConfig {
  enabled: boolean;
  servers: McpServerConfig[];
  hybrid_mode?: boolean;
}

/**
 * Serveur MCP externe (catalogue)
 */
export interface ExternalMcpServer {
  name: string;
  url: string;
  description?: string;
  server_description?: string;  // ✅ NOUVEAU: Description pour le modèle
  header?: string;
  api_key?: string;
  require_approval?: 'never' | 'always' | 'auto';
  allowed_tools?: string[] | null;
}

// Helpers pour convertir un serveur externe en config MCP Groq
export function externalServerToMcpTool(server: ExternalMcpServer): McpServerConfig {
  return {
    type: 'mcp',
    server_label: server.name.toLowerCase().replace(/\s+/g, '-'),
    server_url: server.url,
    headers: server.header && server.api_key ? { [server.header]: server.api_key } : undefined,
    server_description: server.server_description,
    require_approval: server.require_approval,
    allowed_tools: server.allowed_tools
  };
}

// Factory minimale (placeholder)
export function createMcpTool(config: McpServerConfig): McpServerConfig {
  return config;
}

/**
 * Convertit McpServerConfig (format Groq/interne) vers XaiMcpServerConfig (format xAI conforme)
 * 
 * Règles de conversion :
 * - allowed_tools → allowed_tool_names
 * - headers avec "Authorization" → authorization (token direct)
 * - headers autres → extra_headers
 */
export function convertToXaiMcpConfig(config: McpServerConfig): XaiMcpServerConfig {
  const xaiConfig: XaiMcpServerConfig = {
    type: 'mcp',
    server_url: config.server_url,
    server_label: config.server_label,
    server_description: config.server_description
  };

  // Convertir allowed_tools → allowed_tool_names
  if (config.allowed_tools !== undefined && config.allowed_tools !== null) {
    xaiConfig.allowed_tool_names = config.allowed_tools;
  }

  // Séparer headers en authorization + extra_headers
  if (config.headers) {
    const authHeader = config.headers['Authorization'] || config.headers['authorization'];
    if (authHeader) {
      // Token Authorization → champ authorization direct
      xaiConfig.authorization = authHeader.startsWith('Bearer ') ? authHeader : `Bearer ${authHeader}`;
    }

    // Autres headers → extra_headers
    const extraHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'authorization') {
        extraHeaders[key] = value;
      }
    }
    if (Object.keys(extraHeaders).length > 0) {
      xaiConfig.extra_headers = extraHeaders;
    }
  }

  return xaiConfig;
}

/**
 * Configuration MCP pour une requête Groq (selon la spec)
 */
export interface GroqMcpToolConfig {
  type: 'mcp';
  server_label: string;
  server_url: string;
  headers?: Record<string, string>;
  server_description?: string;
  require_approval?: 'never' | 'always' | 'auto';
  allowed_tools?: string[] | null;
}

/**
 * Configuration MCP pour xAI (selon la doc officielle)
 * https://docs.x.ai/docs/guides/tools/remote-mcp-tools
 * 
 * Différences avec GroqMcpToolConfig :
 * - allowed_tool_names (au lieu de allowed_tools)
 * - authorization (token direct, au lieu de headers)
 * - extra_headers (headers custom, séparés de authorization)
 */
export interface XaiMcpServerConfig {
  type: 'mcp';
  server_url: string;
  server_label?: string;
  server_description?: string;
  allowed_tool_names?: string[] | null;  // null = tous les tools
  authorization?: string;  // Token d'authentification (ex: "Bearer TOKEN")
  extra_headers?: Record<string, string>;  // Headers supplémentaires (hors authorization)
}

/**
 * Requête pour lier un serveur MCP à un agent
 */
export interface LinkMcpServerRequest {
  agent_id: string;
  mcp_server_id: string;
  priority?: number;
  is_active?: boolean;
}

/**
 * Requête pour créer un serveur MCP
 */
export interface CreateMcpServerRequest {
  name: string;
  description?: string;
  url: string;
  header?: string;
  api_key: string;
}

/**
 * Liste des serveurs MCP populaires (exemples de la doc Groq)
 */
export const POPULAR_MCP_SERVERS = {
  HUGGINGFACE: {
    name: 'Hugging Face',
    url: 'https://huggingface.co/mcp',
    description: 'Recherche de modèles ML trending sur Hugging Face',
    requiresAuth: false,
  },
  STRIPE: {
    name: 'Stripe',
    url: 'https://mcp.stripe.com',
    description: 'Création de factures, gestion des paiements',
    requiresAuth: true,
    header: 'Authorization',
  },
  EXA: {
    name: 'Exa',
    url: 'https://api.exa.ai/mcp',
    description: 'Recherche web avancée et extraction de contenu',
    requiresAuth: true,
    header: 'x-api-key',
  },
  NOTION: {
    name: 'Notion',
    url: 'https://mcp.notion.com/mcp',
    description: 'Gestion de pages et bases de données Notion',
    requiresAuth: true,
    header: 'Authorization',
  },
} as const;
