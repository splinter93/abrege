/**
 * Adaptateur de tools pour le provider Liminality
 * 
 * Convertit les tools au format Groq/xAI (function calls, MCP) vers le format
 * Liminality/Synesia (callable, knowledge, openapi, mcp, custom, etc.)
 * 
 * Architecture :
 * - Function tools → Custom tools Synesia
 * - MCP tools → MCP tools Synesia (passthrough avec adaptation format)
 * - Ajout de tools Synesia spécifiques (callable, knowledge, datasources agent)
 */

import type { Tool, FunctionTool, McpTool } from '../../types/strictTypes';
import type {
  LiminalityTool,
  LiminalityCustomTool,
  LiminalityMCPTool,
  LiminalityCallableTool,
  LiminalityKnowledgeTool,
  LiminalitySpreadsheetTool,
  LiminalityKvStorageTool,
  LiminalityMemoryTool,
  LiminalityDatasourceOperationConfig,
} from '../../types/liminalityTypes';
import { isMcpTool } from '../../types/strictTypes';
import type { LlmAgentDatasourceRef } from '../../types';
import { simpleLogger as logger } from '@/utils/logger';

/** Defaults doc LLM Exec — spreadsheet */
const DEFAULT_SPREADSHEET_CONFIG: LiminalityDatasourceOperationConfig = {
  read: { enabled: true },
  insert: { enabled: true },
  update: { enabled: true },
  delete: { enabled: false },
};

/** Defaults doc LLM Exec — kv_storage */
const DEFAULT_KV_CONFIG: LiminalityDatasourceOperationConfig = {
  list: { enabled: true },
  get: { enabled: true },
  put: { enabled: true },
  remove: { enabled: false },
};

/** Defaults doc LLM Exec — memory */
const DEFAULT_MEMORY_CONFIG: LiminalityDatasourceOperationConfig = {
  search: { enabled: true, top_k: 5 },
  insert: { enabled: true },
};

function cloneDatasourceConfig(c: LiminalityDatasourceOperationConfig): LiminalityDatasourceOperationConfig {
  return JSON.parse(JSON.stringify(c)) as LiminalityDatasourceOperationConfig;
}

/**
 * Configuration pour l'ajout de tools Synesia spécifiques
 */
export interface SynesiaToolsConfig {
  callables?: string[];
  knowledgeBases?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  /** Datasources liées à l’agent (types Synesia → entrées `tools` POST /v1/llm-exec/round). */
  datasources?: LlmAgentDatasourceRef[];
}

/**
 * Adaptateur de tools Liminality
 */
export class LiminalityToolsAdapter {
  /**
   * Convertit les tools Groq/xAI vers le format Liminality/Synesia
   * 
   * @param tools - Tools au format Groq/xAI (function calls ou MCP)
   * @returns Tools au format Liminality/Synesia
   */
  static convert(tools: Tool[]): LiminalityTool[] {
    if (!tools || tools.length === 0) {
      return [];
    }

    const converted: LiminalityTool[] = [];

    for (const tool of tools) {
      try {
        if (isMcpTool(tool)) {
          // MCP tools : passthrough avec adaptation format
          converted.push(this.convertMcpTool(tool));
        } else {
          // Function tools : conversion vers custom tool
          converted.push(this.convertFunctionTool(tool as FunctionTool));
        }
      } catch (error) {
        logger.error('[LiminalityToolsAdapter] Erreur conversion tool:', {
          error: error instanceof Error ? error.message : String(error),
          toolType: isMcpTool(tool) ? 'mcp' : 'function',
          tool
        });
        // Continue avec les autres tools même si un échoue
      }
    }

    logger.dev(`[LiminalityToolsAdapter] ✅ Converti ${converted.length}/${tools.length} tools`);
    return converted;
  }

  /**
   * Convertit un MCP tool vers le format Liminality/Synesia
   * Conforme doc « Intégration des outils MCP » : allowed_tools et require_approval obligatoires.
   *
   * @param tool - Tool MCP au format Groq/xAI (McpTool)
   * @returns Tool MCP au format Liminality (payload /llm-exec/round)
   */
  private static convertMcpTool(tool: McpTool): LiminalityMCPTool {
    let serverLabel = 'mcp-server';
    if (tool.server_label && typeof tool.server_label === 'string') {
      serverLabel = tool.server_label;
    } else if (tool.name && typeof tool.name === 'string') {
      serverLabel = tool.name;
    }

    const allowedTools = tool.allowed_tools;
    const allowedToolsArray =
      Array.isArray(allowedTools) && allowedTools.every((t): t is string => typeof t === 'string')
        ? allowedTools
        : [];

    const requireApproval = tool.require_approval;
    const validApproval = requireApproval === 'always' || requireApproval === 'never' || requireApproval === 'auto'
      ? requireApproval
      : 'auto';

    const base: LiminalityMCPTool = {
      type: 'mcp',
      server_label: serverLabel,
      server_url: (tool.server_url as string) || '',
      allowed_tools: allowedToolsArray,
      require_approval: validApproval
    };

    if (tool.headers && typeof tool.headers === 'object' && Object.keys(tool.headers).length > 0) {
      base.headers = tool.headers as Record<string, string | { secret_key: string }>;
    }

    return base;
  }

  /**
   * Convertit un function tool vers le format Liminality custom
   * 
   * @param tool - Function tool au format Groq/xAI (OpenAI)
   * @returns Custom tool au format Liminality
   */
  private static convertFunctionTool(tool: FunctionTool): LiminalityCustomTool {
    // Validation des paramètres
    if (!tool.function || !tool.function.name) {
      throw new Error('Function tool doit avoir un nom');
    }

    return {
      type: 'custom',
      name: tool.function.name,
      description: tool.function.description || '',
      parameters: tool.function.parameters || {
        type: 'object',
        properties: {},
        required: []
      }
    };
  }

  /**
   * Ajoute des tools Synesia spécifiques (callable, knowledge) à la liste existante
   * 
   * @param tools - Tools déjà convertis
   * @param synesiaTools - Configuration des tools Synesia à ajouter
   * @returns Liste de tools enrichie avec les tools Synesia
   */
  static addSynesiaTools(
    tools: LiminalityTool[],
    synesiaTools: SynesiaToolsConfig
  ): LiminalityTool[] {
    const enhanced = [...tools];
    let addedCount = 0;

    // Ajouter les agents callables
    if (synesiaTools.callables && synesiaTools.callables.length > 0) {
      for (const callableId of synesiaTools.callables) {
        if (!callableId || callableId.trim() === '') {
          logger.warn('[LiminalityToolsAdapter] ⚠️ Callable ID vide ignoré');
          continue;
        }

        const callableTool: LiminalityCallableTool = {
          type: 'callable',
          callable_id: callableId
        };
        
        enhanced.push(callableTool);
        addedCount++;
        
        logger.dev(`[LiminalityToolsAdapter] ➕ Ajouté callable: ${callableId}`);
      }
    }

    // Ajouter les knowledge bases
    if (synesiaTools.knowledgeBases && synesiaTools.knowledgeBases.length > 0) {
      for (const kb of synesiaTools.knowledgeBases) {
        if (!kb.id || !kb.name) {
          logger.warn('[LiminalityToolsAdapter] ⚠️ Knowledge base invalide ignorée:', kb);
          continue;
        }

        const knowledgeTool: LiminalityKnowledgeTool = {
          type: 'knowledge',
          knowledge_id: kb.id,
          name: `search_${kb.name.replace(/[^a-zA-Z0-9_]/g, '_')}`, // Sanitize name
          description: kb.description || `Recherche dans ${kb.name}`,
          allowed_actions: ['search']
        };
        
        enhanced.push(knowledgeTool);
        addedCount++;
        
        logger.dev(`[LiminalityToolsAdapter] ➕ Ajouté knowledge: ${kb.name} (${kb.id})`);
      }
    }

    // Datasources agent (knowledge | spreadsheet | kv_storage | memory)
    if (synesiaTools.datasources && synesiaTools.datasources.length > 0) {
      for (const ds of synesiaTools.datasources) {
        const mapped = this.datasourceRefToLiminalityTool(ds);
        if (mapped) {
          enhanced.push(mapped);
          addedCount++;
          logger.dev(`[LiminalityToolsAdapter] ➕ Ajouté datasource ${ds.type}: ${ds.name} (${ds.id})`);
        }
      }
    }

    if (addedCount > 0) {
      logger.info(`[LiminalityToolsAdapter] ✅ Ajouté ${addedCount} tools Synesia spécifiques`);
    }

    return enhanced;
  }

  private static sanitizeDatasourceToolName(name: string): string {
    const base = name.replace(/[^a-zA-Z0-9_]/g, '_');
    return base.length > 0 ? base : 'datasource';
  }

  /**
   * Mappe une ligne datasource Synesia vers un tool LLM Exec (doc origins / llm-exec).
   */
  static datasourceRefToLiminalityTool(ref: LlmAgentDatasourceRef): LiminalityTool | null {
    const id = typeof ref.id === 'string' ? ref.id.trim() : '';
    if (!id) {
      return null;
    }

    const typeStr = typeof ref.type === 'string' ? ref.type : '';
    const rawType = typeStr.trim().toLowerCase();
    if (!rawType) {
      logger.warn('[LiminalityToolsAdapter] ⚠️ Datasource sans type ignorée');
      return null;
    }

    const nameStr = typeof ref.name === 'string' ? ref.name : '';
    const safeName = this.sanitizeDatasourceToolName(nameStr);
    const descSource =
      typeof ref.description === 'string' && ref.description.trim().length > 0
        ? ref.description.trim()
        : nameStr.trim();
    const description = descSource.length > 0 ? descSource : safeName;

    switch (rawType) {
      case 'knowledge': {
        const tool: LiminalityKnowledgeTool = {
          type: 'knowledge',
          knowledge_id: id,
          name: `search_${safeName}`,
          description,
          allowed_actions: ['search'],
        };
        return tool;
      }
      case 'spreadsheet': {
        const tool: LiminalitySpreadsheetTool = {
          type: 'spreadsheet',
          spreadsheet_id: id,
          name: safeName,
          description,
          config: cloneDatasourceConfig(DEFAULT_SPREADSHEET_CONFIG),
        };
        return tool;
      }
      case 'kv_storage': {
        const tool: LiminalityKvStorageTool = {
          type: 'kv_storage',
          kv_storage_id: id,
          name: safeName,
          description,
          config: cloneDatasourceConfig(DEFAULT_KV_CONFIG),
        };
        return tool;
      }
      case 'memory': {
        const tool: LiminalityMemoryTool = {
          type: 'memory',
          memory_id: id,
          name: safeName,
          description,
          config: cloneDatasourceConfig(DEFAULT_MEMORY_CONFIG),
        };
        return tool;
      }
      default:
        logger.warn(`[LiminalityToolsAdapter] ⚠️ Type datasource non exposé au LLM Exec: ${typeStr}`);
        return null;
    }
  }

  /**
   * Valide qu'un tool Liminality est bien formé
   * 
   * @param tool - Tool à valider
   * @returns true si valide, false sinon
   */
  static validateTool(tool: LiminalityTool): boolean {
    if (!tool || !tool.type) {
      return false;
    }

    switch (tool.type) {
      case 'callable':
        return !!(tool as LiminalityCallableTool).callable_id;
      
      case 'knowledge': {
        const kt = tool as LiminalityKnowledgeTool;
        return !!(kt.knowledge_id && kt.name && kt.description);
      }

      case 'spreadsheet': {
        const st = tool as LiminalitySpreadsheetTool;
        return !!(st.spreadsheet_id && st.name && st.description && st.config && typeof st.config === 'object');
      }

      case 'kv_storage': {
        const kv = tool as LiminalityKvStorageTool;
        return !!(kv.kv_storage_id && kv.name && kv.description && kv.config && typeof kv.config === 'object');
      }

      case 'memory': {
        const mem = tool as LiminalityMemoryTool;
        return !!(mem.memory_id && mem.name && mem.description && mem.config && typeof mem.config === 'object');
      }
      
      case 'mcp': {
        const mt = tool as LiminalityMCPTool;
        return !!(mt.server_label && mt.server_url);
      }
      
      case 'custom': {
        const ct = tool as LiminalityCustomTool;
        return !!(ct.name && ct.parameters);
      }
      
      case 'openapi':
      case 'kit':
      case 'websearch':
      case 'code_interpreter':
      case 'image_generation':
        return true; // Types plus complexes, validation basique
      
      default:
        return false;
    }
  }

  /**
   * Filtre les tools invalides d'une liste
   * 
   * @param tools - Liste de tools à filtrer
   * @returns Liste de tools valides uniquement
   */
  static filterValidTools(tools: LiminalityTool[]): LiminalityTool[] {
    const valid = tools.filter(tool => this.validateTool(tool));
    
    if (valid.length < tools.length) {
      logger.warn(`[LiminalityToolsAdapter] ⚠️ ${tools.length - valid.length} tools invalides filtrés`);
    }
    
    return valid;
  }
}

