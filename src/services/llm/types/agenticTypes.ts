/**
 * Types simplifiés pour l'orchestrateur MCP
 * Juste ce qui est nécessaire pour les tool calls
 */

import type { ToolCall, ToolResult } from '../services/SimpleToolExecutor';

/**
 * Catégories d'outils pour la parallélisation
 */
export enum ToolCategory {
  READ = 'read',
  WRITE = 'write',
  SEARCH = 'search',
  AGENT = 'agent',
  DATABASE = 'database',
  EXTERNAL = 'external',
  UNKNOWN = 'unknown'
}

/**
 * Métadonnées d'un outil
 */
export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  parallelizable: boolean;
  cacheable: boolean;
  timeout?: number;
  priority?: number;
  fallbacks?: string[];
}
