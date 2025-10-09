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
      while (toolCallsCount < maxToolCalls) {
        const response = await this.callLLM(currentMessage, updatedHistory, context, 'auto', llmProvider);
        const newToolCalls = this.convertToolCalls(response.tool_calls || []);
        
        if (newToolCalls.length === 0) {
          return { 
            success: true, 
            content: response.content, 
            toolCalls: allToolCalls, 
            toolResults: allToolResults, 
            reasoning: response.reasoning,
            error: undefined 
          };
        }

        const toolResults = await this.toolExecutor.executeSimple(newToolCalls, context.userToken, context.sessionId);
        allToolCalls.push(...newToolCalls);
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
        
        const historyContext = {
          systemContent: '', // Pas de nouveau message système
          userMessage: isFirstPass ? message : '',
          cleanedHistory: updatedHistory,
          toolCalls: newToolCalls,
          toolResults: convertedToolResults
        };
        
        const historyResult = this.historyBuilder.buildSecondCallHistory(historyContext);
        updatedHistory = historyResult.messages;
        
        currentMessage = "Please continue with the answer based on the tool results.";
        toolCallsCount++;
        logger.dev(`[Orchestrator] 🔁 Loop ${toolCallsCount}/${maxToolCalls}, ${newToolCalls.length} new tools.`);

        isFirstPass = false;

        // Appel LLM forcé en mode texte uniquement (tool_choice:none)
        const secondResponse = await this.callLLM(currentMessage, updatedHistory, context, 'none', llmProvider);
        if (secondResponse.content && secondResponse.content.trim().length > 0) {
          return {
            success: true,
            content: secondResponse.content,
            toolCalls: allToolCalls,
            toolResults: allToolResults,
            reasoning: secondResponse.reasoning,
            error: undefined
          };
        }
      }

      logger.warn(`[Orchestrator] ⚠️ Tool call limit (${maxToolCalls}) reached.`);
      const finalResponse = await this.callLLM("Summarize tool actions and give a final answer.", updatedHistory, context, 'auto', llmProvider);
      return { 
        success: true, 
        content: finalResponse.content, 
        toolCalls: allToolCalls, 
        toolResults: allToolResults, 
        reasoning: finalResponse.reasoning,
        error: undefined 
      };

    } catch (error) {
      logger.error(`[Orchestrator] ❌ Error processing message:`, error);
      return {
        success: false, content: "An error occurred. Please try again.",
        toolCalls: [], toolResults: [],
        error: error instanceof Error ? error.message : 'Unknown error'
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

    const { getOpenAPIV2Tools } = await import('@/services/openApiToolsGenerator');
    const tools = await getOpenAPIV2Tools();

    // ✅ FIX: Utiliser le provider passé en paramètre (avec la config de l'agent)
    return llmProvider.callWithMessages(messages, tools);
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
