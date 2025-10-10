/**
 * SimpleChatOrchestrator - Orchestrateur de chat simple et intelligent
 * Style ChatGPT : LLM → tools → relance → réponse finale
 */

import { GroqProvider, LLMResponse } from '../providers/implementations/groq';
import { SimpleToolExecutor, ToolCall, ToolResult } from './SimpleToolExecutor';
import { GroqHistoryBuilder } from './GroqHistoryBuilder';
import { DEFAULT_GROQ_LIMITS } from '../types/groqTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { ChatMessage } from '@/types/chat';
import { agentTemplateService, AgentTemplateConfig, RenderedTemplate } from '../agentTemplateService';
import { UIContext } from '../ContextCollector';
import { mcpConfigService } from '../mcpConfigService';
import { getOpenAPIV2Tools } from '@/services/openApiToolsGenerator';

export interface ChatResponse {
  success: boolean;
  content: string;
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  reasoning?: string;
  error?: string;
}

export interface ChatContext {
  userToken: string;
  sessionId: string;
  agentConfig?: AgentTemplateConfig;
  uiContext?: UIContext;
  maxRetries?: number;
  maxToolCalls?: number;
}

export class SimpleChatOrchestrator {
  private toolExecutor: SimpleToolExecutor;
  private historyBuilder: GroqHistoryBuilder;

  constructor() {
    this.toolExecutor = new SimpleToolExecutor();
    this.historyBuilder = new GroqHistoryBuilder(DEFAULT_GROQ_LIMITS);
  }

  /**
   * Créer un provider Groq avec la config de l'agent
   */
  private createProviderFromAgent(agentConfig?: AgentTemplateConfig): GroqProvider {
    const customConfig = agentConfig ? {
      model: agentConfig.model || 'openai/gpt-oss-20b',
      temperature: agentConfig.temperature || 0.7,
      maxTokens: agentConfig.max_completion_tokens || agentConfig.max_tokens || 8000,
      topP: agentConfig.top_p || 0.9,
      reasoningEffort: agentConfig.reasoning_effort || 'high'
    } : {};

    logger.dev(`[Orchestrator] 🎯 Création du provider avec config:`, {
      model: customConfig.model || 'default',
      temperature: customConfig.temperature || 'default',
      maxTokens: customConfig.maxTokens || 'default'
    });

    return new GroqProvider(customConfig);
  }

  async processMessage(
    message: string,
    history: ChatMessage[],
    context: ChatContext
  ): Promise<ChatResponse> {
    const maxToolCalls = context.maxToolCalls ?? 5;
    let toolCallsCount = 0;
    
    logger.info(`[Orchestrator] 💬 Processing message for session s=${context.sessionId}`, {
      agentModel: context.agentConfig?.model || 'default',
      agentName: context.agentConfig?.name || 'default'
    });

    // ✅ FIX: Créer le provider avec la config de l'agent
    const llmProvider = this.createProviderFromAgent(context.agentConfig);

    let currentMessage = message;
    let updatedHistory = [...history];
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    let isFirstPass = true;

    try {
      // ✅ Boucle agentic standard : Le LLM décide quand s'arrêter
      while (toolCallsCount < maxToolCalls) {
        // Appeler le LLM (TOUJOURS avec tool_choice:auto)
        let response: LLMResponse;
        try {
          response = await this.callLLM(currentMessage, updatedHistory, context, 'auto', llmProvider);
        } catch (llmError) {
          // ✅ Erreur Groq (424, 500, etc.) → Traiter comme un tool result avec erreur
          const errorMsg = llmError instanceof Error ? llmError.message : String(llmError);
          logger.error(`[Orchestrator] ❌ Erreur LLM (sera réinjecté pour retry):`, errorMsg);
          
          // Si première itération, on ne peut pas retry car pas d'historique
          if (toolCallsCount === 0) {
            throw llmError; // Remonter l'erreur
          }
          
          // Créer un message system avec l'erreur pour que le LLM réessaye
          updatedHistory.push({
            id: `msg-error-${Date.now()}`,
            role: 'system',
            content: `⚠️ Previous LLM call failed with error: ${errorMsg}\n\nPlease try again with a simpler approach or fewer tools at once.`,
            timestamp: new Date().toISOString()
          });
          
          toolCallsCount++;
          logger.warn(`[Orchestrator] 🔁 Retry après erreur LLM (${toolCallsCount}/${maxToolCalls})`);
          continue; // Retry la boucle
        }
        
        const newToolCalls = this.convertToolCalls(response.tool_calls || []);
        
        // ✅ Si le LLM ne retourne pas de tool_calls, il a fini
        if (newToolCalls.length === 0) {
          logger.info(`[Orchestrator] ✅ LLM a terminé (pas de nouveaux tools)`);
          return { 
            success: true, 
            content: response.content, 
            toolCalls: allToolCalls, 
            toolResults: allToolResults, 
            reasoning: response.reasoning,
            error: undefined 
          };
        }

        // ✅ Déduplication : Filtrer les tool calls identiques déjà appelés
        const dedupedToolCalls = this.deduplicateToolCalls(newToolCalls, allToolCalls);
        
        if (dedupedToolCalls.length === 0) {
          logger.warn(`[Orchestrator] ⚠️ Tous les tool calls sont des doublons, demande de réponse finale`);
          // Forcer le LLM à donner une réponse finale
          const finalResponse = await this.callLLM(
            "You've already called these tools. Please provide your final answer based on the previous results.",
            updatedHistory,
            context,
            'auto',
            llmProvider
          );
          return {
            success: true,
            content: finalResponse.content,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            reasoning: finalResponse.reasoning,
            error: undefined
          };
        }

        if (dedupedToolCalls.length < newToolCalls.length) {
          logger.warn(`[Orchestrator] ⚠️ ${newToolCalls.length - dedupedToolCalls.length} tool calls en double ignorés`);
        }

        // ✅ Exécuter les tools (dédupliqués)
        logger.dev(`[Orchestrator] 🔧 Exécution de ${dedupedToolCalls.length} tools...`);
        const toolResults = await this.toolExecutor.executeSimple(dedupedToolCalls, context.userToken, context.sessionId);
        allToolCalls.push(...dedupedToolCalls); // ✅ Pousser les dédupliqués, pas tous
        allToolResults.push(...toolResults);
        
        // Validation des tool results avant injection dans l'historique
        const validToolResults = toolResults.filter((result, idx) => {
          if (!result.tool_call_id) {
            logger.warn(`[Orchestrator] ⚠️ ToolResult ${idx} ignoré: tool_call_id manquant`);
            return false;
          }
          if (!result.name) {
            logger.warn(`[Orchestrator] ⚠️ ToolResult ${idx} ignoré: name manquant`);
            return false;
          }
          if (!result.content) {
            logger.warn(`[Orchestrator] ⚠️ ToolResult ${idx} ignoré: content manquant`);
            return false;
          }
          return true;
        });

        const convertedToolResults = validToolResults.map(result => ({
          ...result,
          timestamp: new Date().toISOString()
        }));
        
        // ✅ Log des erreurs pour debugging (mais on continue)
        const errorCount = toolResults.filter(r => !r.success).length;
        if (errorCount > 0) {
          logger.warn(`[Orchestrator] ⚠️ ${errorCount}/${toolResults.length} tools ont échoué (le LLM va analyser)`);
        }
        
        // ✅ Construire l'historique avec les résultats (succès ET erreurs)
        const historyContext = {
          systemContent: '', // Pas de nouveau message système
          userMessage: isFirstPass ? message : '',
          cleanedHistory: updatedHistory,
          toolCalls: dedupedToolCalls, // ✅ Utiliser les dédupliqués
          toolResults: convertedToolResults
        };
        
        const historyResult = this.historyBuilder.buildSecondCallHistory(historyContext);
        updatedHistory = historyResult.messages;
        
        toolCallsCount++;
        logger.dev(`[Orchestrator] 🔁 Iteration ${toolCallsCount}/${maxToolCalls}`);

        // ✅ Pas de message spécial, juste continuer la boucle
        // Le LLM verra les résultats et décidera de la suite
        currentMessage = ''; // Vide = utiliser juste l'historique
        isFirstPass = false;
      }

      // ✅ Max iterations atteint, forcer une réponse finale
      logger.warn(`[Orchestrator] ⚠️ Max iterations (${maxToolCalls}) atteint, demande de réponse finale`);
      const finalResponse = await this.callLLM(
        "Maximum iterations reached. Please provide your final answer based on what you've accomplished so far.",
        updatedHistory,
        context,
        'auto', // Même ici, laisser le LLM décider
        llmProvider
      );
      return { 
        success: true, 
        content: finalResponse.content, 
        toolCalls: allToolCalls, 
        toolResults: allToolResults, 
        reasoning: finalResponse.reasoning,
        error: undefined 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error(`[Orchestrator] ❌ Error processing message:`, {
        message: errorMessage,
        stack: errorStack,
        sessionId: context.sessionId,
        agentId: context.agentConfig?.id
      });
      
      // ✅ Retourner une erreur détaillée pour debugging
      return {
        success: false, 
        content: `Une erreur s'est produite lors du traitement de votre message.\n\nDétails : ${errorMessage}\n\nVeuillez réessayer ou reformuler votre demande.`,
        toolCalls: allToolCalls, // Retourner les tools déjà appelés
        toolResults: allToolResults, // Retourner les résultats déjà obtenus
        error: errorMessage
      };
    }
  }

  private async callLLM(
    message: string,
    history: ChatMessage[],
    context: ChatContext,
    toolChoice: 'auto' | 'none' = 'auto',
    llmProvider: GroqProvider
  ): Promise<LLMResponse> {
    const { agentConfig, uiContext } = context;
    let systemMessageContent: string = 'You are a helpful AI assistant.';
    
    if (agentConfig) {
      try {
        const renderedTemplate = uiContext 
          ? await agentTemplateService.renderAgentTemplateWithUIContext(agentConfig, uiContext)
          : agentTemplateService.renderAgentTemplate(agentConfig);
        systemMessageContent = renderedTemplate.content;
        logger.dev(`[Orchestrator] ${uiContext ? 'Injecting UI context' : 'No UI context'}.`);
      } catch (error) {
        logger.error(`[Orchestrator] ❌ Template rendering error:`, error);
        systemMessageContent = agentConfig.system_instructions || systemMessageContent;
      }
    }
    
    // ✅ CORRECTION: Si l'historique contient déjà des tool calls, utiliser buildSecondCallHistory
    let messages: ChatMessage[];
    
    const hasToolCalls = history.some(msg => msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0);
    
    if (hasToolCalls) {
      // L'historique contient déjà des tool calls, on utilise buildSecondCallHistory
      const historyContext = {
        systemContent: systemMessageContent,
        userMessage: message,
        cleanedHistory: history,
        toolCalls: [], // Pas de nouveaux tool calls
        toolResults: [] // Pas de nouveaux tool results
      };
      
      const historyResult = this.historyBuilder.buildSecondCallHistory(historyContext);
      messages = historyResult.messages;
    } else {
      // Premier appel, utiliser buildInitialHistory
      messages = this.historyBuilder.buildInitialHistory(
        systemMessageContent,
        message,
        history
      );
    }

    // ✅ Support MCP natif Groq : Toujours vérifier s'il y a des serveurs MCP liés
    const openApiTools = await getOpenAPIV2Tools();
    
    // Construire les tools (hybride si l'agent a des MCP, sinon OpenAPI pur)
    const tools = await mcpConfigService.buildHybridTools(
      agentConfig?.id || 'default',
      context.userToken, // userId
      openApiTools
    );
    
    const mcpCount = tools.filter(t => t.type === 'mcp').length;
    const openapiCount = tools.filter(t => t.type === 'function').length;
    
    if (mcpCount > 0) {
      logger.dev(`[Orchestrator] 🔀 Mode hybride: ${mcpCount} MCP + ${openapiCount} OpenAPI`);
    } else {
      logger.dev(`[Orchestrator] 📦 Mode OpenAPI: ${openapiCount} tools`);
    }

    // ✅ FIX: Utiliser le provider passé en paramètre (avec la config de l'agent)
    return llmProvider.callWithMessages(messages, tools);
  }

  /**
   * Déduplique les tool calls pour éviter les appels identiques
   * Compare : function.name + arguments (normalisés)
   */
  private deduplicateToolCalls(newToolCalls: ToolCall[], allPreviousToolCalls: ToolCall[]): ToolCall[] {
    const seen = new Set<string>();
    
    // Ajouter tous les appels précédents au Set
    for (const prevCall of allPreviousToolCalls) {
      const key = this.getToolCallKey(prevCall);
      seen.add(key);
    }
    
    // Filtrer les nouveaux appels
    const deduped = newToolCalls.filter(call => {
      const key = this.getToolCallKey(call);
      if (seen.has(key)) {
        logger.warn(`[Orchestrator] 🔁 Tool call en double ignoré: ${call.function.name}`);
        return false; // Doublon, ignorer
      }
      seen.add(key);
      return true;
    });
    
    return deduped;
  }

  /**
   * Génère une clé unique pour un tool call (name + args normalisés)
   */
  private getToolCallKey(toolCall: ToolCall): string {
    try {
      // Parser et re-stringifier pour normaliser les args
      const args = JSON.parse(toolCall.function.arguments);
      const normalizedArgs = JSON.stringify(args, Object.keys(args).sort());
      return `${toolCall.function.name}:${normalizedArgs}`;
    } catch {
      // Si parsing échoue, utiliser les args bruts
      return `${toolCall.function.name}:${toolCall.function.arguments}`;
    }
  }

  /**
   * Convertit les tool_calls du LLM en format ToolCall[]
   */
  private convertToolCalls(rawToolCalls: any[]): ToolCall[] {
    if (!Array.isArray(rawToolCalls) || rawToolCalls.length === 0) return [];

    return rawToolCalls
      .map((tc: any, idx: number) => {
        if (!tc.function?.name) {
          logger.warn(`[Orchestrator] ⚠️ Tool call ${idx} ignoré: name manquant`);
          return null;
        }

        const toolCall: ToolCall = {
          id: tc.id ?? `call-${Date.now()}-${idx}`,
          type: 'function' as const,
          function: {
            name: tc.function.name,
            arguments: typeof tc.function.arguments === 'string' 
              ? tc.function.arguments 
              : JSON.stringify(tc.function.arguments ?? {})
          }
        };

        return toolCall;
      })
      .filter((tc): tc is ToolCall => tc !== null && tc.function.name.length > 0);
  }
}

export const simpleChatOrchestrator = new SimpleChatOrchestrator();
