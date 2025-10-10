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
 * Configuration MCP pour une requête Groq (selon la spec)
 */
export interface GroqMcpToolConfig {
  type: 'mcp';
  server_label: string;
  server_url: string;
  headers?: Record<string, string>;
  require_approval?: 'never' | 'always' | 'auto';
  allowed_tools?: string[];
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
