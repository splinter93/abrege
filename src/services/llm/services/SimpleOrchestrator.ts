/**
 * SimpleOrchestrator - Orchestrateur minimaliste pour tool calls MCP
 * 
 * Fait juste ce qui est nécessaire :
 * - Appelle le LLM avec les tools MCP
 * - Exécute les tool calls
 * - Retourne la réponse
 */

import { GroqProvider, LLMResponse } from '../providers/implementations/groq';
import { XAIProvider } from '../providers/implementations/xai';
import { SimpleToolExecutor, ToolCall, ToolResult } from './SimpleToolExecutor';
import { OpenApiToolExecutor } from '../executors/OpenApiToolExecutor';
import { GroqHistoryBuilder } from './GroqHistoryBuilder';
import { DEFAULT_GROQ_LIMITS } from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { ChatMessage } from '@/types/chat';
import { agentTemplateService, AgentTemplateConfig } from '../agentTemplateService';
import { UIContext } from '../ContextCollector';
import { mcpConfigService } from '../mcpConfigService';
import { openApiSchemaService } from '../openApiSchemaService';
import { createClient } from '@supabase/supabase-js';
import { groqCircuitBreaker } from '@/services/circuitBreaker';
import { addToolCallInstructions } from '../toolCallInstructions';
import type { Tool, GroqMessage, McpCall } from '../types/strictTypes';
import { isMcpTool } from '../types/strictTypes';

/**
 * Contexte d'exécution
 */
export interface ChatContext {
  userToken: string;
  sessionId: string;
  agentConfig?: AgentTemplateConfig;
  uiContext?: UIContext;
  maxToolCalls?: number;
}

/**
 * Réponse de l'orchestrateur
 */
export interface OrchestratorResponse {
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  finishReason: string;
  stopReason?: string;
}

/**
 * Configuration de l'orchestrateur
 */
const DEFAULT_CONFIG = {
  maxToolCalls: 50,
  maxIterations: 10,
  timeout: 120000, // 2 minutes max
};

/**
 * Orchestrateur simple pour gérer les conversations avec tool calls MCP
 */
export class SimpleOrchestrator {
  private llmProvider: GroqProvider | XAIProvider;
  private toolExecutor: SimpleToolExecutor;
  private openApiToolExecutor: OpenApiToolExecutor;
  private historyBuilder: GroqHistoryBuilder;

  constructor() {
    this.llmProvider = new GroqProvider(); // Default provider
    this.toolExecutor = new SimpleToolExecutor();
    this.openApiToolExecutor = new OpenApiToolExecutor();
    this.historyBuilder = new GroqHistoryBuilder(DEFAULT_GROQ_LIMITS);
  }

  /**
   * Détecter si les tools sont des tools OpenAPI
   * Vérifie si au moins un tool call existe dans les endpoints OpenAPI configurés
   */
  private isOpenApiTools(toolCalls: ToolCall[]): boolean {
    // Si l'exécuteur OpenAPI n'a pas d'endpoints configurés, ce ne sont pas des tools OpenAPI
    if (!this.openApiToolExecutor || !this.openApiToolExecutor.endpoints || this.openApiToolExecutor.endpoints.size === 0) {
      return false;
    }

    // Vérifier si au moins un tool call existe dans les endpoints OpenAPI
    return toolCalls.some(toolCall => {
      const exists = this.openApiToolExecutor.endpoints.has(toolCall.function.name);
      if (exists) {
        logger.dev(`[SimpleOrchestrator] ✅ Tool OpenAPI détecté: ${toolCall.function.name}`);
      }
      return exists;
    });
  }

  /**
   * Charger les schémas OpenAPI liés à un agent
   */
  private async loadAgentOpenApiSchemas(agentId?: string): Promise<Array<{ openapi_schema_id: string }>> {
    if (!agentId) return [];

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: links, error } = await supabase
        .from('agent_openapi_schemas')
        .select('openapi_schema_id')
        .eq('agent_id', agentId);

      if (error) {
        logger.error(`[SimpleOrchestrator] ❌ Erreur chargement schémas agent:`, error);
        return [];
      }

      return links || [];
    } catch (error) {
      logger.error(`[SimpleOrchestrator] ❌ Erreur:`, error);
      return [];
    }
  }

  /**
   * Configurer l'exécuteur OpenAPI pour plusieurs schémas
   */
  private async configureOpenApiExecutorForMultipleSchemas(
    agentSchemas: Array<{ openapi_schema_id: string }>
  ): Promise<void> {
    if (agentSchemas.length === 0) return;

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Récupérer tous les schémas
      const schemaIds = agentSchemas.map(s => s.openapi_schema_id);
      const { data: schemas, error } = await supabase
        .from('openapi_schemas')
        .select('id, content, api_key, header')
        .in('id', schemaIds)
        .eq('status', 'active');

      if (error || !schemas || schemas.length === 0) {
        logger.warn(`[SimpleOrchestrator] ⚠️ Aucun schéma OpenAPI actif trouvé`);
        return;
      }

      // Combiner tous les endpoints de tous les schémas
      const allEndpoints = new Map<string, { method: string; path: string; apiKey?: string; headerName?: string; baseUrl: string }>();

      for (const schema of schemas) {
        // Validation du contenu
        const content = schema.content as Record<string, unknown>;
        if (!content || typeof content !== 'object') {
          logger.warn(`[SimpleOrchestrator] ⚠️ Contenu invalide pour schéma ${schema.id}`);
          continue;
        }

        // Extraire l'URL de base
        const servers = content.servers as Array<{ url: string }> | undefined;
        const baseUrl = servers?.[0]?.url || '';

        if (!baseUrl) {
          logger.warn(`[SimpleOrchestrator] ⚠️ URL de base manquante pour schéma ${schema.id}`);
          continue;
        }

        // Validation de l'URL
        try {
          new URL(baseUrl);
        } catch (error) {
          logger.warn(`[SimpleOrchestrator] ⚠️ URL invalide pour schéma ${schema.id}: ${baseUrl}`);
          continue;
        }

        // Extraire la clé API et le header
        const apiKey = schema.api_key || undefined;
        const headerName = schema.header || this.detectHeaderNameFromUrl(baseUrl);

        // Extraire les endpoints de ce schéma
        const schemaEndpoints = this.extractEndpointsFromSchema(content, apiKey, headerName);

        // Ajouter l'URL de base à chaque endpoint et les combiner
        for (const [operationId, endpoint] of schemaEndpoints.entries()) {
          allEndpoints.set(operationId, {
            ...endpoint,
            baseUrl
          });
        }
      }

      if (allEndpoints.size === 0) {
        logger.warn(`[SimpleOrchestrator] ⚠️ Aucun endpoint extrait des schémas`);
        return;
      }

      // Créer l'exécuteur OpenAPI avec tous les endpoints combinés
      this.openApiToolExecutor = new OpenApiToolExecutor('', allEndpoints);
      logger.dev(`[SimpleOrchestrator] ✅ Exécuteur OpenAPI configuré avec ${allEndpoints.size} endpoints depuis ${schemas.length} schémas`);

    } catch (error) {
      logger.error(`[SimpleOrchestrator] ❌ Erreur configuration multi-schémas:`, error);
    }
  }

  /**
   * Configurer l'exécuteur OpenAPI avec l'URL de base appropriée (version legacy single schema)
   */
  private async configureOpenApiExecutor(schemaId?: string): Promise<void> {
    if (!schemaId) return;

    try {
      // Récupérer le schéma pour obtenir l'URL de base et les endpoints
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: schema, error } = await supabase
        .from('openapi_schemas')
        .select('content, api_key, header')
        .eq('id', schemaId)
        .eq('status', 'active')
        .single();

      if (error || !schema) {
        logger.warn(`[SimpleOrchestrator] ⚠️ Schéma OpenAPI non trouvé: ${schemaId}`);
        return;
      }

      // Validation du contenu du schéma
      const content = schema.content as Record<string, unknown>;
      if (!content || typeof content !== 'object') {
        logger.error(`[SimpleOrchestrator] ❌ Contenu du schéma invalide`);
        return;
      }

      // Extraire l'URL de base du schéma avec validation
      const servers = content.servers as Array<{ url: string }> | undefined;
      const baseUrl = servers?.[0]?.url || '';

      if (!baseUrl) {
        logger.error(`[SimpleOrchestrator] ❌ URL de base manquante dans le schéma`);
        return;
      }

      // Validation de l'URL de base
      try {
        new URL(baseUrl);
      } catch (error) {
        logger.error(`[SimpleOrchestrator] ❌ URL de base invalide: ${baseUrl}`);
        return;
      }

      // Extraire la clé API et le header depuis la base de données (priorité) ou depuis l'URL
      const apiKey = schema.api_key || undefined;
      const headerName = schema.header || this.detectHeaderNameFromUrl(baseUrl);
      
      // Extraire les endpoints du schéma
      const endpoints = this.extractEndpointsFromSchema(content, apiKey, headerName);

      if (endpoints.size === 0) {
        logger.warn(`[SimpleOrchestrator] ⚠️ Aucun endpoint extrait du schéma`);
      }

      // Créer un nouvel exécuteur avec l'URL de base et les endpoints
      this.openApiToolExecutor = new OpenApiToolExecutor(baseUrl, endpoints);
      logger.dev(`[SimpleOrchestrator] ✅ Exécuteur OpenAPI configuré avec URL: ${baseUrl}`);
      logger.dev(`[SimpleOrchestrator] ✅ ${endpoints.size} endpoints extraits du schéma`);
      logger.dev(`[SimpleOrchestrator] ✅ Header: ${headerName}, API Key: ${apiKey ? '✅ Configurée' : '❌ Manquante'}`);
    } catch (error) {
      logger.error(`[SimpleOrchestrator] ❌ Erreur configuration exécuteur OpenAPI:`, error);
    }
  }

  /**
   * Extraire les endpoints du schéma OpenAPI
   */
  private extractEndpointsFromSchema(
    content: Record<string, unknown>, 
    apiKey?: string, 
    headerName?: string
  ): Map<string, { method: string; path: string; apiKey?: string; headerName?: string }> {
    const endpoints = new Map<string, { method: string; path: string; apiKey?: string; headerName?: string }>();
    
    try {
      const paths = content.paths as Record<string, Record<string, unknown>> | undefined;

      if (!paths || typeof paths !== 'object') {
        logger.warn(`[SimpleOrchestrator] ⚠️ Aucun path trouvé dans le schéma OpenAPI`);
        return endpoints;
      }

      // Parser chaque path et méthode
      for (const [pathName, pathItem] of Object.entries(paths)) {
        // Validation du pathItem
        if (!pathItem || typeof pathItem !== 'object') {
          logger.warn(`[SimpleOrchestrator] ⚠️ PathItem invalide pour ${pathName}`);
          continue;
        }

        const pathMethods = pathItem as Record<string, unknown>;

        for (const [method, operation] of Object.entries(pathMethods)) {
          // Ignorer les clés spéciales
          if (['parameters', 'servers', '$ref'].includes(method)) {
            continue;
          }

          // Validation de l'opération
          if (!operation || typeof operation !== 'object') {
            continue;
          }

          const op = operation as Record<string, unknown>;
          const operationId = op.operationId as string | undefined;

          if (operationId && typeof operationId === 'string') {
            endpoints.set(operationId, {
              method: method.toUpperCase(),
              path: pathName,
              apiKey,
              headerName
            });
            logger.dev(`[SimpleOrchestrator] 🔧 Endpoint extrait: ${operationId} => ${method.toUpperCase()} ${pathName}`);
          } else {
            logger.warn(`[SimpleOrchestrator] ⚠️ OperationId manquant pour ${method.toUpperCase()} ${pathName}`);
          }
        }
      }
    } catch (error) {
      logger.error(`[SimpleOrchestrator] ❌ Erreur lors de l'extraction des endpoints:`, error);
    }

    return endpoints;
  }

  /**
   * Détecter le nom du header selon l'URL de base
   */
  private detectHeaderNameFromUrl(baseUrl: string): string {
    if (baseUrl.includes('pexels.com')) {
      return 'Authorization';
    }
    if (baseUrl.includes('exa.ai')) {
      return 'x-api-key';
    }
    // Par défaut, utiliser Authorization
    return 'Authorization';
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Sélectionner le provider en fonction de l'agent config
   */
  private selectProvider(agentConfig?: AgentTemplateConfig): GroqProvider | XAIProvider {
    const provider = agentConfig?.provider || 'groq';
    const model = agentConfig?.model;

    logger.dev(`[SimpleOrchestrator] Sélection du provider: ${provider} (model: ${model})`);

    switch (provider.toLowerCase()) {
      case 'xai':
        return new XAIProvider({
          model: model || 'grok-4-fast',
          temperature: typeof agentConfig?.temperature === 'number' ? agentConfig.temperature : 0.7,
          maxTokens: agentConfig?.max_tokens || 8000
        });
      
      case 'groq':
      default:
        return new GroqProvider({
          model: model || 'openai/gpt-oss-20b',
          temperature: typeof agentConfig?.temperature === 'number' ? agentConfig.temperature : 0.7,
          maxTokens: agentConfig?.max_tokens || 8000
        });
    }
  }

  /**
   * Traiter un message avec tool calls
   */
  async processMessage(
    message: string,
    context: ChatContext,
    history: ChatMessage[] = [],
    onProgress?: (content: string) => void
  ): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const maxToolCalls = context.maxToolCalls || DEFAULT_CONFIG.maxToolCalls;
    
    logger.info(`[SimpleOrchestrator] Start processing: ${message.substring(0, 100)}...`);

    try {
      // Build initial messages
      const agentConfig = context.agentConfig || agentTemplateService.getDefaultAgent();
      
      // ✅ NOUVEAU : Sélectionner le bon provider selon l'agent
      this.llmProvider = this.selectProvider(agentConfig);
      const selectedProvider = agentConfig?.provider || 'groq';
      
      const systemMessage = this.buildSystemMessage(agentConfig, context.uiContext);
      let messages = this.historyBuilder.buildInitialHistory(systemMessage, message, history);

      // ✅ NOUVEAU : Sélectionner les tools selon le provider
      let tools: Tool[] = [];
      
      // ✅ CORRECTION : Charger les tools OpenAPI pour tous les providers si configuré
      const agentSchemas = await this.loadAgentOpenApiSchemas(agentConfig?.id);
      
      if (agentSchemas.length > 0) {
        logger.dev(`[SimpleOrchestrator] 🔧 Chargement des tools depuis ${agentSchemas.length} schémas OpenAPI`);
        
        // Charger les tools de tous les schémas et les combiner
        const allOpenApiTools: Tool[] = [];
        for (const schema of agentSchemas) {
          const schemaTools = await openApiSchemaService.getToolsFromSchemaById(schema.openapi_schema_id);
          allOpenApiTools.push(...schemaTools);
        }
        
        const openApiTools = allOpenApiTools;
        logger.dev(`[SimpleOrchestrator] ✅ Tools OpenAPI chargés: ${openApiTools.length} tools depuis ${agentSchemas.length} schémas`);
        
        if (selectedProvider.toLowerCase() === 'xai') {
          // ✅ xAI : Utiliser uniquement les tools OpenAPI avec limite
          const XAI_MAX_TOOLS = 20; // Limite stricte de xAI
          
          if (openApiTools.length > XAI_MAX_TOOLS) {
            logger.warn(`[SimpleOrchestrator] ⚠️ Trop de tools pour xAI (${openApiTools.length}/${XAI_MAX_TOOLS}). Limitation appliquée.`);
            tools = openApiTools.slice(0, XAI_MAX_TOOLS);
            logger.warn(`[SimpleOrchestrator] 📋 Tools conservés: ${tools.map(t => t.function.name).join(', ')}`);
          } else {
            tools = openApiTools;
          }
          
          // Configurer l'exécuteur OpenAPI pour tous les schémas
          await this.configureOpenApiExecutorForMultipleSchemas(agentSchemas);
        } else {
          // ✅ Groq/OpenAI : Combiner les tools OpenAPI avec les MCP tools
          logger.dev(`[SimpleOrchestrator] 🔧 Chargement des tools MCP pour ${selectedProvider}...`);
          const mcpTools = await mcpConfigService.buildHybridTools(
            agentConfig?.id || 'default',
            context.userToken,
            openApiTools // Inclure les tools OpenAPI
          ) as Tool[];
          tools = mcpTools;
          
          const mcpCount = tools.filter((t) => isMcpTool(t)).length;
          const openApiCount = tools.filter((t) => !isMcpTool(t)).length;
          logger.dev(`[SimpleOrchestrator] ✅ Tools hybrides disponibles: ${tools.length} total (${mcpCount} MCP + ${openApiCount} OpenAPI)`);
          
          // Configurer l'exécuteur OpenAPI pour tous les schémas
          await this.configureOpenApiExecutorForMultipleSchemas(agentSchemas);
        }
      } else {
        // ✅ Fallback : Aucun schéma OpenAPI assigné
        if (selectedProvider.toLowerCase() === 'xai') {
          // xAI : Tools minimaux
          logger.dev(`[SimpleOrchestrator] 🔧 Aucun schéma assigné, chargement des tools minimaux...`);
          const { getMinimalXAITools } = await import('../minimalToolsForXAI');
          tools = getMinimalXAITools();
          logger.dev(`[SimpleOrchestrator] ✅ Tools minimaux disponibles: ${tools.length} tools`);
        } else {
          // Groq/OpenAI : MCP tools uniquement
          logger.dev(`[SimpleOrchestrator] 🔧 Chargement des tools MCP pour ${selectedProvider}...`);
          tools = await mcpConfigService.buildHybridTools(
            agentConfig?.id || 'default',
            context.userToken,
            [] // Pas de tools OpenAPI
          ) as Tool[];
          
          const mcpCount = tools.filter((t) => isMcpTool(t)).length;
          logger.dev(`[SimpleOrchestrator] ✅ Tools MCP disponibles: ${tools.length} total (${mcpCount} serveurs MCP)`);
        }
      }

      let iteration = 0;
      let totalToolCalls = 0;
      let finalContent = '';
      let allToolCalls: ToolCall[] = [];
      let allToolResults: ToolResult[] = [];

      // Main loop
      while (iteration < DEFAULT_CONFIG.maxIterations) {
        iteration++;
        
        if (Date.now() - startTime > DEFAULT_CONFIG.timeout) {
          logger.error('[SimpleOrchestrator] Timeout reached');
          break;
        }

        // Call LLM
        const response = await this.callLLM(messages, tools);
        
        // ✅ NOUVEAU: Gérer les erreurs de validation de tool calls
        if (response.validation_error) {
          const validationError = response.validation_error;
          logger.warn(`[SimpleOrchestrator] ⚠️ Erreur de validation tool call (retry ${iteration}):`, validationError.message);
          
          // Ajouter un message système avec l'erreur pour que le LLM corrige
          messages.push({
            role: 'system',
            content: `❌ Tool call validation error: ${validationError.message}\n\nPlease correct the tool call parameters or inform the user if you cannot complete the request.`
          });
          
          // Continuer la boucle pour que le LLM réessaie
          continue;
        }
        
        if (response.content) {
          finalContent = response.content;
          if (onProgress) {
            onProgress(response.content);
          }
        }

        // Check if we're done
        if (!response.tool_calls || response.tool_calls.length === 0) {
          logger.info(`[SimpleOrchestrator] Done after ${iteration} iterations`);
          return {
            content: finalContent,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            finishReason: response.finish_reason || 'stop',
            stopReason: response.x_groq?.usage?.stop_reason
          };
        }

        // ✅ NOUVEAU: Détecter si on a utilisé l'API Responses (MCP)
        // Dans ce cas, les tool calls ont DÉJÀ été exécutés par Groq
        const hasMcpTools = tools.some((t) => isMcpTool(t));
        
        if (hasMcpTools) {
          // ✅ Les MCP calls ont déjà été exécutés par Groq dans l'API Responses
          // On a juste besoin d'enregistrer les résultats
          logger.dev(`[SimpleOrchestrator] ✅ MCP calls déjà exécutés par Groq (Responses API)`);
          
          const toolCalls = response.tool_calls || [];
          allToolCalls.push(...toolCalls);
          
          // Les résultats sont dans response.x_groq.mcp_calls
          if (response.x_groq?.mcp_calls) {
            const mcpResults: ToolResult[] = response.x_groq.mcp_calls.map((call: McpCall, idx: number) => ({
              tool_call_id: toolCalls[idx]?.id || `mcp_${Date.now()}_${idx}`,
              name: call.name,
              content: typeof call.output === 'string' ? call.output : JSON.stringify(call.output),
              success: true
            }));
            allToolResults.push(...mcpResults);
          }
          
          // ✅ On est déjà à la fin avec l'API Responses (tout est fait en un appel)
          logger.info(`[SimpleOrchestrator] Done with MCP (Responses API) - ${allToolCalls.length} calls executed`);
          return {
            content: finalContent,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            finishReason: 'stop'
          };
        }

        // ✅ CHAT COMPLETIONS: Execute tool calls côté serveur
        const toolCalls = response.tool_calls;
        totalToolCalls += toolCalls.length;

        if (totalToolCalls > maxToolCalls) {
          logger.error(`[SimpleOrchestrator] Max tool calls reached: ${totalToolCalls}`);
          break;
        }

        logger.dev(`[SimpleOrchestrator] Executing ${toolCalls.length} tool calls (Chat Completions)`);
        
        // Détecter le type de tools et utiliser l'exécuteur approprié
        const isOpenApiTools = this.isOpenApiTools(toolCalls);
        const toolResults = isOpenApiTools 
          ? await this.openApiToolExecutor.executeToolCalls(toolCalls, context.userToken)
          : await this.toolExecutor.executeToolCalls(toolCalls, context.userToken);

        allToolCalls.push(...toolCalls);
        allToolResults.push(...toolResults);

        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: response.content || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: typeof tc.function.arguments === 'string' 
                ? tc.function.arguments 
                : JSON.stringify(tc.function.arguments)
            }
          }))
        });

        // Add tool results as messages
        for (const result of toolResults) {
          messages.push({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
          });
        }
      }

      logger.info(`[SimpleOrchestrator] Completed: ${totalToolCalls} tool calls, ${iteration} iterations`);

      return {
        content: finalContent,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        finishReason: 'stop',
      };

    } catch (error) {
      logger.error('[SimpleOrchestrator] Error:', error);
      throw error;
    }
  }

  /**
   * Build system message
   */
  private buildSystemMessage(agentConfig: AgentTemplateConfig, uiContext?: UIContext): string {
    let systemMessage = agentConfig.system_instructions;

    if (uiContext) {
      const contextParts: string[] = [];
      
      if (uiContext.classeurContext) {
        contextParts.push(`Classeur actuel : "${uiContext.classeurContext.name}"`);
      }
      
      if (uiContext.noteContext) {
        contextParts.push(`Note actuelle : "${uiContext.noteContext.title}"`);
        if (uiContext.noteContext.content) {
          const preview = uiContext.noteContext.content.substring(0, 500);
          contextParts.push(`Contenu (aperçu) : ${preview}...`);
        }
      }

      if (contextParts.length > 0) {
        systemMessage += '\n\n## Contexte utilisateur\n' + contextParts.join('\n');
      }
    }

    return systemMessage;
  }

  /**
   * Call LLM with circuit breaker
   */
  private async callLLM(messages: ChatMessage[], tools: Tool[]): Promise<LLMResponse> {
    return groqCircuitBreaker.execute(async () => {
      return this.llmProvider.callWithMessages(messages, tools);
    });
  }
}

/**
 * Instance singleton
 */
export const simpleOrchestrator = new SimpleOrchestrator();

