/**
 * AgentOrchestrator - Orchestrateur minimaliste pour tool calls MCP
 * 
 * Fait juste ce qui est nécessaire :
 * - Appelle le LLM avec les tools MCP
 * - Exécute les tool calls
 * - Retourne la réponse
 */

import { GroqProvider } from '../providers/implementations/groq';
import { XAIProvider } from '../providers/implementations/xai';
import { XAINativeProvider } from '../providers/implementations/xai-native';
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
import type { Tool, McpCall, LLMResponse } from '../types/strictTypes';
import { isMcpTool, isFunctionTool } from '../types/strictTypes';
import { systemMessageBuilder } from '../SystemMessageBuilder';
import type { McpServerConfig } from '@/types/mcp';

/**
 * Contexte d'exécution
 */
export interface ChatContext {
  userToken: string;
  sessionId: string;
  agentConfig?: AgentTemplateConfig;
  uiContext?: UIContext & {
    attachedNotes?: Array<{
      id: string;
      slug: string;
      title: string;
      markdown_content: string;
    }>;
  };
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
  maxToolCalls: 20,
  maxIterations: 10,
  timeout: 120000, // 2 minutes max
};

/**
 * Orchestrateur simple pour gérer les conversations avec tool calls MCP
 */
export class AgentOrchestrator {
  private llmProvider: GroqProvider | XAIProvider | XAINativeProvider | import('../providers/implementations/liminality').LiminalityProvider;
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
   * ✅ NAMESPACE: Support des noms préfixés (ex: pexels__search)
   */
  private isOpenApiTools(toolCalls: ToolCall[]): boolean {
    // Si l'exécuteur OpenAPI n'a pas d'endpoints configurés, ce ne sont pas des tools OpenAPI
    if (!this.openApiToolExecutor || !this.openApiToolExecutor.endpoints || this.openApiToolExecutor.endpoints.size === 0) {
      return false;
    }

    // Vérifier si au moins un tool call existe dans les endpoints OpenAPI
    return toolCalls.some(toolCall => {
      const functionName = toolCall.function.name;
      
      // Chercher d'abord avec le nom complet
      if (this.openApiToolExecutor.endpoints.has(functionName)) {
        return true;
      }
      
      // Si pas trouvé ET contient '__', essayer sans le préfixe namespace
      if (functionName.includes('__')) {
        const parts = functionName.split('__');
        if (parts.length >= 2) {
          const originalName = parts.slice(1).join('__');
          return this.openApiToolExecutor.endpoints.has(originalName);
        }
      }
      
      return false;
    });
  }

  /**
   * Charger les schémas OpenAPI liés à un agent
   * ✅ Support des UUIDs et slugs
   */
  private async loadAgentOpenApiSchemas(agentId?: string): Promise<Array<{ openapi_schema_id: string }>> {
    if (!agentId) {
      logger.warn(`[AgentOrchestrator] ⚠️ loadAgentOpenApiSchemas appelé sans agentId`);
      return [];
    }

    try {
      logger.info(`[AgentOrchestrator] 🔍 Chargement schémas OpenAPI pour agent: ${agentId}`);
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // ✅ Détecter si c'est un UUID ou un slug
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentId);
      
      let resolvedAgentId = agentId;
      
      // ✅ Si c'est un slug, résoudre l'UUID depuis la table agents
      if (!isUUID) {
        logger.info(`[AgentOrchestrator] 🔍 Résolution du slug "${agentId}" en UUID...`);
        
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('id')
          .eq('slug', agentId)
          .eq('is_active', true)
          .single();
        
        if (agentError || !agent) {
          logger.warn(`[AgentOrchestrator] ⚠️ Agent avec slug "${agentId}" non trouvé`);
          return [];
        }
        
        resolvedAgentId = agent.id;
        logger.info(`[AgentOrchestrator] ✅ Slug résolu: ${agentId} → ${resolvedAgentId}`);
      }

      // Charger les schémas OpenAPI liés
      const { data: links, error } = await supabase
        .from('agent_openapi_schemas')
        .select('openapi_schema_id')
        .eq('agent_id', resolvedAgentId);

      if (error) {
        logger.error(`[AgentOrchestrator] ❌ Erreur chargement schémas agent ${resolvedAgentId}:`, error);
        return [];
      }

      logger.info(`[AgentOrchestrator] ✅ ${(links || []).length} schémas OpenAPI trouvés pour agent ${agentId} (${resolvedAgentId})`, {
        schemaIds: (links || []).map(l => l.openapi_schema_id)
      });

      return links || [];
    } catch (error) {
      logger.error(`[AgentOrchestrator] ❌ Erreur chargement schémas agent ${agentId}:`, error);
      return [];
    }
  }

  // ✅ SUPPRIMÉ : configureOpenApiExecutorForMultipleSchemas()
  // Logique déplacée dans OpenApiSchemaService.getToolsAndEndpointsFromSchemas()
  // L'exécuteur est maintenant configuré directement dans processMessage()

  // ✅ SUPPRIMÉ : configureOpenApiExecutor(), extractEndpointsFromSchema(), detectHeaderNameFromUrl()
  // Toute la logique de parsing OpenAPI est maintenant centralisée dans OpenApiSchemaService
  // Cela évite la duplication et permet le cache partagé

  /**
   * ✅ NOUVEAU : Construit un index de diagnostic des tools par namespace
   * Recommandation ChatGPT : aide au debug et monitoring
   * 
   * @param tools - Array de tools à analyser
   * @returns Objet avec le nombre de tools par namespace (ex: {pexels: 3, scrivia: 70})
   */
  private buildToolsIndex(tools: Tool[]): Record<string, number> {
    const index: Record<string, number> = {};
    
    for (const tool of tools) {
      // Utiliser type guard pour accéder à function.name de manière type-safe
      if (!isFunctionTool(tool)) continue;
      
      const toolName = tool.function.name;
      if (!toolName) continue;
      
      // Extraire le namespace (partie avant le premier '__')
      const namespaceMatch = toolName.match(/^([^_]+)__/);
      const namespace = namespaceMatch ? namespaceMatch[1] : 'other';
      
      index[namespace] = (index[namespace] || 0) + 1;
    }
    
    return index;
  }

  /**
   * ✅ Déduire le provider depuis le modèle (source unique de vérité)
   * ✅ NOUVEAU DESIGN : Le modèle détermine le provider, pas l'inverse
   */
  private getProviderFromModel(model: string): 'groq' | 'xai' | 'liminality' {
    // Utiliser groqModels pour déterminer le provider correct
    const { getModelInfo } = require('@/constants/groqModels');
    const modelInfo = getModelInfo(model);
    
    if (modelInfo?.provider) {
      return modelInfo.provider as 'groq' | 'xai' | 'liminality';
    }
    
    // Fallback: détection par pattern (ordre important!)
    // Liminality models (vérifier EN PREMIER avant les patterns génériques)
    if (model.includes('deepseek/') || model.includes('fireworks/') || 
        model.includes('openrouter/') || model.includes('xai/') || 
        model.startsWith('openai/gpt-5') || model === 'openai/gpt-4o-mini') {
      return 'liminality';
    }
    
    // xAI models (direct)
    if (model.includes('grok-') && !model.includes('/')) return 'xai';
    
    // Groq models (patterns spécifiques pour éviter faux positifs)
    if (model.startsWith('openai/gpt-oss-') || model.includes('llama') || 
        model.includes('mixtral') || model.includes('moonshotai/')) {
      return 'groq';
    }
    
    // Default fallback
    return 'groq';
  }

  /**
   * ✅ Sélectionner le provider en fonction du MODÈLE (pas du champ provider)
   * ✅ PRODUCTION READY : Le modèle est la source de vérité
   */
  private selectProvider(agentConfig?: AgentTemplateConfig): GroqProvider | XAIProvider | XAINativeProvider | import('../providers/implementations/liminality').LiminalityProvider {
    const configuredModel = agentConfig?.model || 'openai/gpt-oss-20b';
    const configuredProvider = agentConfig?.provider;
    
    // ✅ DÉDUCTION : Provider depuis le modèle (source de vérité)
    const deducedProvider = this.getProviderFromModel(configuredModel);
    
    // ⚠️ VALIDATION : Détecter incohérences
    if (configuredProvider && configuredProvider !== deducedProvider) {
      logger.warn(`[AgentOrchestrator] ⚠️ INCOHÉRENCE DÉTECTÉE:`, {
        agentName: agentConfig?.name,
        configuredProvider,
        configuredModel,
        deducedProvider,
        action: 'Provider déduit du modèle sera utilisé'
      });
    }

    // ✅ Validation et normalisation des paramètres LLM
    const temperature = typeof agentConfig?.temperature === 'number'
      ? Math.max(0, Math.min(2, agentConfig.temperature))
      : 0.7;
    
    const topP = typeof agentConfig?.top_p === 'number'
      ? Math.max(0, Math.min(1, agentConfig.top_p))
      : 0.9;
    
    const maxTokens = typeof agentConfig?.max_tokens === 'number'
      ? Math.max(1, Math.min(128000, agentConfig.max_tokens))
      : 8000;

    // 🔍 DEBUG: Log détaillé de la sélection du provider
    logger.info(`[AgentOrchestrator] 🔄 Sélection du provider:`, {
      agentName: agentConfig?.name || 'default',
      model: configuredModel,
      deducedProvider,
      temperature,
      topP,
      maxTokens
    });

    // ✅ Créer le provider basé sur le modèle (source de vérité)
    if (deducedProvider === 'xai') {
      logger.info(`[AgentOrchestrator] ✅ Provider XAI NATIVE sélectionné (modèle: ${configuredModel}) - Support MCP`);
      return new XAINativeProvider({
        model: configuredModel,
        temperature,
        topP,
        maxTokens
      });
    } else if (deducedProvider === 'liminality') {
      logger.info(`[AgentOrchestrator] ✅ Provider LIMINALITY sélectionné (modèle: ${configuredModel})`);
      const { LiminalityProvider } = require('../providers/implementations/liminality');
      return new LiminalityProvider({
        model: configuredModel,
        temperature,
        topP,
        maxTokens
      });
    } else {
      logger.info(`[AgentOrchestrator] ✅ Provider GROQ sélectionné (modèle: ${configuredModel})`);
      return new GroqProvider({
        model: configuredModel,
        temperature,
        topP,
        maxTokens
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

    try {
      // Build initial messages
      const agentConfig = context.agentConfig || agentTemplateService.getDefaultAgent();
      
      // 🔍 DEBUG: Log de l'agent config reçu
      logger.info(`[AgentOrchestrator] 🎯 Agent Config reçu:`, {
        hasAgentConfig: !!context.agentConfig,
        agentId: agentConfig?.id,
        agentSlug: agentConfig?.slug,
        agentName: agentConfig?.name,
        provider: agentConfig?.provider,
        model: agentConfig?.model,
        temperature: agentConfig?.temperature,
        isDefault: !context.agentConfig,
        hasOpenApiSchemas: !!agentConfig?.id
      });
      
      // ✅ NOUVEAU : Sélectionner le bon provider selon l'agent
      this.llmProvider = this.selectProvider(agentConfig);
      const selectedProvider = agentConfig?.provider || 'groq';
      
      logger.info(`[AgentOrchestrator] 🚀 Provider final sélectionné: ${selectedProvider.toUpperCase()}`);
      
      const systemMessage = this.buildSystemMessage(agentConfig, context.uiContext);
      const messages = this.historyBuilder.buildInitialHistory(systemMessage, message, history);

      // ✅ NOUVEAU : Sélectionner les tools selon le provider
      let tools: Tool[] = [];
      
      // 🔍 DEBUG MCP : Logger les détails de l'agent avant de charger les tools
      logger.info(`[AgentOrchestrator] 🔍 DEBUG MCP - Agent details:`, {
        agentId: agentConfig?.id,
        agentSlug: agentConfig?.slug,
        agentName: agentConfig?.name,
        hasId: !!agentConfig?.id,
        idType: typeof agentConfig?.id,
        idValue: agentConfig?.id
      });
      
      // ✅ OPTIMISÉ : Charger tools ET endpoints depuis OpenApiSchemaService (parsing 1x)
      // ❌ ZÉRO TOOLS HARDCODÉS : Seuls les schémas OpenAPI liés à l'agent sont utilisés
      const agentSchemas = await this.loadAgentOpenApiSchemas(agentConfig?.id);
      
      logger.info(`[AgentOrchestrator] 🔍 Tools loading: ${agentSchemas.length} schémas trouvés pour agent "${agentConfig?.name || 'default'}" (ID: ${agentConfig?.id || 'none'})`);
      
      if (agentSchemas.length > 0) {
        // Récupérer tools + endpoints en 1 seul parsing (centralisé)
        const schemaIds = agentSchemas.map(s => s.openapi_schema_id);
        const { tools: openApiTools, endpoints } = await openApiSchemaService.getToolsAndEndpointsFromSchemas(schemaIds);
        
        // Configurer l'exécuteur avec les endpoints pré-parsés
        if (endpoints.size > 0) {
          // Cleanup de l'ancien exécuteur pour éviter memory leak
          if (this.openApiToolExecutor) {
            this.openApiToolExecutor.cleanup();
          }
          this.openApiToolExecutor = new OpenApiToolExecutor('', endpoints);
        }
        
        if (selectedProvider.toLowerCase() === 'xai') {
          // ✅ x.ai : Mode hybride (OpenAPI + MCP Remote Tools)
          // Utilise XAINativeProvider avec endpoint /v1/responses (support MCP complet)
          
          logger.info(`[AgentOrchestrator] 🔍 DEBUG MCP - Appel buildHybridTools pour xAI avec:`, {
            agentId: agentConfig?.id || 'default',
            userToken: context.userToken ? `${context.userToken.substring(0, 20)}...` : 'none',
            openApiToolsCount: openApiTools.length
          });
          
          const mcpTools = await mcpConfigService.buildHybridTools(
            agentConfig?.id || 'default',
            context.userToken,
            openApiTools
          ) as Array<Tool | McpServerConfig>;
          
          tools = mcpTools as Tool[];
          
          const mcpCount = tools.filter((t) => isMcpTool(t)).length;
          const openApiCount = tools.filter((t) => !isMcpTool(t)).length;
          
          // ✅ Générer l'index de diagnostic pour les tools OpenAPI
          const filteredOpenApiTools = tools.filter((t) => !isMcpTool(t)) as Tool[];
          const toolsIndex = this.buildToolsIndex(filteredOpenApiTools);
          
          // 🎯 LOG FOCUS TOOLS : xAI Native hybride
          logger.info(`[TOOLS] Agent: ${agentConfig?.name || 'default'} (xAI Native Hybrid)`, {
            provider: 'xai-native',
            total: tools.length,
            mcp: mcpCount,
            openapi: openApiCount,
            index: toolsIndex,
            sample: filteredOpenApiTools.filter(isFunctionTool).map(t => t.function.name).slice(0, 10),
            mcpServers: tools.filter(isMcpTool).map(t => t.server_label || t.name || 'unknown')
          });
        } else {
          // Groq/OpenAI : Combiner les tools OpenAPI avec les MCP tools
          logger.info(`[AgentOrchestrator] 🔍 DEBUG MCP - Appel buildHybridTools avec:`, {
            agentId: agentConfig?.id || 'default',
            userToken: context.userToken ? `${context.userToken.substring(0, 20)}...` : 'none',
            openApiToolsCount: openApiTools.length
          });
          
          const mcpTools = await mcpConfigService.buildHybridTools(
            agentConfig?.id || 'default',
            context.userToken,
            openApiTools
          ) as Tool[];
          tools = mcpTools;
          
          const mcpCount = tools.filter((t) => isMcpTool(t)).length;
          const openApiCount = tools.filter((t) => !isMcpTool(t)).length;
          
          // ✅ Générer l'index de diagnostic pour les tools OpenAPI
          const filteredOpenApiTools = tools.filter((t) => !isMcpTool(t));
          const toolsIndex = this.buildToolsIndex(filteredOpenApiTools);
          
          // 🎯 LOG FOCUS TOOLS : Affichage détaillé des tools disponibles
          logger.info(`[TOOLS] Agent: ${agentConfig?.name || 'default'}`, {
            provider: selectedProvider,
            total: tools.length,
            mcp: mcpCount,
            openapi: openApiCount,
            index: toolsIndex,
            sample: filteredOpenApiTools.filter(isFunctionTool).map(t => t.function.name).slice(0, 10)
          });
        }
      } else {
        // ❌ AUCUN SCHÉMA = AUCUN TOOL (comportement explicite, pas de magic)
        tools = [];
        logger.warn(`[AgentOrchestrator] ⚠️ Agent "${agentConfig?.name || 'default'}" (${selectedProvider}) sans schémas OpenAPI → 0 tools disponibles (comportement attendu, pas de tools hardcodés)`);
        
        if (selectedProvider.toLowerCase() === 'xai') {
          // xAI sans schémas = MCP tools uniquement (si configurés)
          tools = await mcpConfigService.buildHybridTools(
            agentConfig?.id || 'default',
            context.userToken,
            []
          ) as Tool[];
          
          const mcpCount = tools.filter((t) => isMcpTool(t)).length;
          
          // 🎯 LOG FOCUS TOOLS
          logger.info(`[TOOLS] Agent: ${agentConfig?.name || 'default'} (xAI Native MCP only)`, {
            provider: 'xai-native',
            total: tools.length,
            mcp: mcpCount,
            mcpServers: tools.filter(isMcpTool).map(t => t.server_label || t.name || 'unknown')
          });
        } else {
          // Groq/OpenAI : MCP tools uniquement
          tools = await mcpConfigService.buildHybridTools(
            agentConfig?.id || 'default',
            context.userToken,
            []
          ) as Tool[];
          
          const mcpCount = tools.filter((t) => isMcpTool(t)).length;
          
          // 🎯 LOG FOCUS TOOLS
          logger.info(`[TOOLS] Agent: ${agentConfig?.name || 'default'} (MCP only)`, {
            provider: selectedProvider,
            total: tools.length,
            mcp: mcpCount,
            tools: tools.filter(isMcpTool).map(t => `MCP:${t.server_label}`).slice(0, 20)
          });
        }
      }

      let iteration = 0;
      let totalToolCalls = 0;
      let finalContent = '';
      const allToolCalls: ToolCall[] = [];
      const allToolResults: ToolResult[] = [];

      // Main loop
      while (iteration < DEFAULT_CONFIG.maxIterations) {
        iteration++;
        
        if (Date.now() - startTime > DEFAULT_CONFIG.timeout) {
          logger.error('[AgentOrchestrator] Timeout reached');
          break;
        }

        // Call LLM
        const response = await this.callLLM(messages, tools);
        
        // ✅ NOUVEAU: Gérer les erreurs de validation de tool calls
        if (response.validation_error) {
          const validationError = response.validation_error;
          logger.warn(`[AgentOrchestrator] ⚠️ Erreur de validation tool call (retry ${iteration}):`, validationError.message);
          
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
          return {
            content: finalContent,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            finishReason: response.finish_reason || 'stop',
            stopReason: (response as { x_groq?: { usage?: { stop_reason?: string } } })?.x_groq?.usage?.stop_reason
          };
        }

        // ✅ NOUVEAU: Détecter si on a utilisé l'API Responses (MCP)
        // Dans ce cas, les tool calls ont DÉJÀ été exécutés par Groq
        const hasMcpTools = tools.some((t) => isMcpTool(t));
        
        if (hasMcpTools) {
          // ✅ Les MCP calls ont déjà été exécutés par Groq dans l'API Responses
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
          
          // On est déjà à la fin avec l'API Responses (tout est fait en un appel)
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
          logger.error(`[AgentOrchestrator] Max tool calls reached: ${totalToolCalls}`);
          break;
        }
        
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
          content: response.content || '',
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
              name: result.name || 'tool',
            tool_call_id: result.tool_call_id,
            content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
          });
        }
      }

      return {
        content: finalContent,
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        finishReason: 'stop',
      };

    } catch (error) {
      logger.error('[AgentOrchestrator] Error:', error);
      throw error;
    }
  }

  /**
   * Build system message using SystemMessageBuilder
   * ✅ Utilise le builder centralisé qui gère attachedNotes
   */
  private buildSystemMessage(agentConfig: AgentTemplateConfig, uiContext?: UIContext): string {
    // Utiliser le SystemMessageBuilder centralisé qui gère les notes attachées
    // SystemMessageBuilder accepte SystemMessageContext avec type, name, id requis
    // UIContext est compatible via [key: string]: unknown dans SystemMessageContext
    const systemContext = uiContext ? {
      type: 'chat',
      name: 'Session',
      id: 'current',
      ...uiContext
    } : undefined;
    
    const result = systemMessageBuilder.buildSystemMessage(
      agentConfig,
      systemContext,
      agentConfig.system_instructions || 'Tu es un assistant IA utile et bienveillant.'
    );
    
    return result.content;
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
export const agentOrchestrator = new AgentOrchestrator();

