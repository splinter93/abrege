/**
 * SimpleChatOrchestrator - Orchestrateur de chat simple et intelligent
 * Style ChatGPT : LLM → tools → relance → réponse finale
 */

import { GroqProvider, LLMResponse } from '../providers/implementations/groq';
import { SimpleToolExecutor, ToolCall, ToolResult } from './SimpleToolExecutor';
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
  private llmProvider: GroqProvider;
  private toolExecutor: SimpleToolExecutor;

  constructor() {
    this.llmProvider = new GroqProvider();
    this.toolExecutor = new SimpleToolExecutor();
  }

  async processMessage(
    message: string,
    history: ChatMessage[],
    context: ChatContext
  ): Promise<ChatResponse> {
    const maxToolCalls = context.maxToolCalls ?? 5;
    let toolCallsCount = 0;
    
    logger.info(`[Orchestrator] 💬 Processing message for session s=${context.sessionId}`);

    let currentMessage = message;
    let updatedHistory = [...history];
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];

    try {
      while (toolCallsCount < maxToolCalls) {
        const response = await this.callLLM(currentMessage, updatedHistory, context);
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

        const toolResults = await this.toolExecutor.executeSimple(newToolCalls, context.userToken);
        allToolCalls.push(...newToolCalls);
        allToolResults.push(...toolResults);
        
        updatedHistory.push({
          id: `assistant-${Date.now()}`, role: 'assistant', content: null, 
          tool_calls: newToolCalls, timestamp: new Date().toISOString()
        });
        toolResults.forEach(result => {
          updatedHistory.push({
            id: `tool-${result.tool_call_id}`, role: 'tool', tool_call_id: result.tool_call_id,
            name: result.name, content: result.content, timestamp: new Date().toISOString()
          });
        });
        
        currentMessage = ""; 
        toolCallsCount++;
        logger.dev(`[Orchestrator] 🔁 Loop ${toolCallsCount}/${maxToolCalls}, ${newToolCalls.length} new tools.`);
      }

      logger.warn(`[Orchestrator] ⚠️ Tool call limit (${maxToolCalls}) reached.`);
      const finalResponse = await this.callLLM("Summarize tool actions and give a final answer.", updatedHistory, context);
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
    context: ChatContext
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
    
    const messages: ChatMessage[] = [
      { role: 'system', content: systemMessageContent, id: 'system', timestamp: new Date().toISOString() },
      ...history,
    ];
    if(message) {
      messages.push({ role: 'user', content: message, id: `user-${Date.now()}`, timestamp: new Date().toISOString() });
    }

    const { getOpenAPIV2Tools } = await import('@/services/openApiToolsGenerator');
    const tools = await getOpenAPIV2Tools();

    return this.llmProvider.callWithMessages(messages, tools);
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
