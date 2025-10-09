/**
 * Types pour Model Context Protocol (MCP)
 * Support natif Groq pour les serveurs MCP
 */

/**
 * Configuration d'un serveur MCP pour Groq
 */
export interface McpServerConfig {
  /** Type de tool (toujours 'mcp' pour les serveurs MCP) */
  type: 'mcp';
  
  /** Label du serveur (nom lisible) */
  server_label: string;
  
  /** URL du serveur MCP */
  server_url: string;
  
  /** Headers d'authentification pour le serveur MCP */
  headers?: Record<string, string>;
}

/**
 * Configuration MCP pour un agent
 */
export interface AgentMcpConfig {
  /** Activer le support MCP natif pour cet agent */
  enabled: boolean;
  
  /** Serveurs MCP disponibles pour cet agent */
  servers: McpServerConfig[];
  
  /** Mode hybride : utiliser à la fois MCP et OpenAPI tools */
  hybrid_mode?: boolean;
}

/**
 * Payload Groq avec support MCP
 */
export interface GroqPayloadWithMcp {
  model: string;
  messages: any[];
  temperature: number;
  max_completion_tokens: number;
  top_p: number;
  stream: boolean;
  reasoning_effort?: 'low' | 'medium' | 'high';
  stop?: string[] | null;
  
  /** Tools : peut contenir à la fois des functions et des serveurs MCP */
  tools?: Array<
    | { type: 'function'; function: { name: string; description: string; parameters: any } }
    | McpServerConfig
  >;
  
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * Helper pour créer un outil MCP Groq
 */
export function createMcpTool(
  serverLabel: string,
  serverUrl: string,
  headers?: Record<string, string>
): McpServerConfig {
  return {
    type: 'mcp',
    server_label: serverLabel,
    server_url: serverUrl,
    headers
  };
}

/**
 * Helper pour créer la config MCP d'un agent
 */
export function createAgentMcpConfig(
  servers: Array<{ label: string; url: string; apiKey?: string }>,
  hybridMode: boolean = false
): AgentMcpConfig {
  return {
    enabled: true,
    servers: servers.map(s => createMcpTool(
      s.label,
      s.url,
      s.apiKey ? { 'x-api-key': s.apiKey } : undefined
    )),
    hybrid_mode: hybridMode
  };
}

