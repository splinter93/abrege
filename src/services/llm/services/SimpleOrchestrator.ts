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
import { GroqHistoryBuilder } from './GroqHistoryBuilder';
import { DEFAULT_GROQ_LIMITS } from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { ChatMessage } from '@/types/chat';
import { agentTemplateService, AgentTemplateConfig } from '../agentTemplateService';
import { UIContext } from '../ContextCollector';
import { mcpConfigService } from '../mcpConfigService';
import { openApiSchemaService } from '../openApiSchemaService';
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
  private historyBuilder: GroqHistoryBuilder;

  constructor() {
    this.llmProvider = new GroqProvider(); // Default provider
    this.toolExecutor = new SimpleToolExecutor();
    this.historyBuilder = new GroqHistoryBuilder(DEFAULT_GROQ_LIMITS);
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
      
      if (selectedProvider.toLowerCase() === 'xai') {
        // ✅ xAI : Utiliser les tools OpenAPI depuis la BDD
        logger.dev(`[SimpleOrchestrator] 🔧 Chargement des tools OpenAPI pour xAI...`);
        tools = await openApiSchemaService.getToolsFromSchema('scrivia-api-v2');
        logger.dev(`[SimpleOrchestrator] ✅ Tools OpenAPI disponibles: ${tools.length} tools`);
      } else {
        // ✅ Groq : Utiliser les MCP tools (comme avant)
        logger.dev(`[SimpleOrchestrator] 🔧 Chargement des tools MCP pour Groq...`);
        tools = await mcpConfigService.buildHybridTools(
          agentConfig?.id || 'default',
          context.userToken,
          [] // No OpenAPI tools, MCP only
        ) as Tool[];
        
        const mcpCount = tools.filter((t) => isMcpTool(t)).length;
        logger.dev(`[SimpleOrchestrator] ✅ Tools available: ${tools.length} total (${mcpCount} serveurs MCP)`);
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
        const toolResults = await this.toolExecutor.executeToolCalls(toolCalls, context.userToken);

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

