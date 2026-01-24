/**
 * Provider DeepSeek - API DeepSeek
 * 
 * Implémentation complète avec support:
 * - Streaming SSE
 * - Tool calls (function calling)
 * - Thinking mode (reasoning_content)
 * 
 * Documentation: https://api-docs.deepseek.com/
 * Format compatible OpenAI avec spécificités DeepSeek
 * 
 * ⚠️ CRITIQUE: DeepSeek REQUIS `reasoning_content` dans les messages assistant avec tool_calls
 */

import { BaseProvider, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import type { LLMResponse, ToolCall, Tool } from '../../types/strictTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';
import type {
  DeepSeekMessage,
  DeepSeekChatCompletionRequest,
  DeepSeekChatCompletionResponse,
  DeepSeekStreamChunk
} from '../../types/deepseekTypes';
import { isFunctionTool } from '../../types/strictTypes';

/**
 * Type pour les chunks de streaming SSE
 */
interface StreamChunk {
  type?: 'delta';
  content?: string;
  tool_calls?: ToolCall[];
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  reasoning?: string;
  usage?: Usage;
}

interface Usage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Configuration spécifique à DeepSeek
 */
interface DeepSeekConfig extends ProviderConfig {
  // Spécifique à DeepSeek
  thinkingMode?: 'auto' | 'enabled' | 'disabled'; // ✅ Pour deepseek-reasoner uniquement
  parallelToolCalls?: boolean; // ✅ Support des appels parallèles
  /**
   * ✅ DeepSeek strict mode (beta)
   * Active le mode strict pour les tool calls
   * Requis: base_url="https://api.deepseek.com/beta"
   * En mode strict, le modèle respecte strictement le JSON Schema
   */
  strictToolCalls?: boolean; // ✅ Mode strict pour tool calls (beta)
}

/**
 * Informations sur DeepSeek
 */
const DEEPSEEK_INFO: ProviderInfo = {
  id: 'deepseek',
  name: 'DeepSeek',
  version: '1.0.0',
  description: 'DeepSeek V3.2 with thinking mode and tool calling',
  capabilities: {
    functionCalls: true,
    streaming: true,
    reasoning: true, // ✅ Supporté par deepseek-reasoner
    codeExecution: false,
    webSearch: false,
    structuredOutput: false
  },
  supportedModels: [
    'deepseek-chat', // ✅ V3.2 non-thinking mode
    'deepseek-reasoner' // ✅ V3.2 thinking mode
  ],
  pricing: {
    input: '$0.14 / M tokens', // ✅ Pricing DeepSeek V3.2
    output: '$0.28 / M tokens' // ✅ Pricing DeepSeek V3.2
  }
};

/**
 * Configuration par défaut de DeepSeek
 */
const DEFAULT_DEEPSEEK_CONFIG: DeepSeekConfig = {
  // Base
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseUrl: process.env.DEEPSEEK_STRICT_MODE === 'true' 
    ? 'https://api.deepseek.com/beta' // ✅ Mode strict (beta)
    : 'https://api.deepseek.com', // ✅ Mode standard
  timeout: 120000, // 120s
  
  // LLM
  model: 'deepseek-chat', // ✅ Modèle par défaut (non-thinking)
  temperature: 0.7,
  maxTokens: 16000, // ✅ Max output pour DeepSeek V3.2
  topP: 0.9,
  
  // Features
  supportsFunctionCalls: true,
  supportsStreaming: false, // Streaming géré par la route API
  supportsReasoning: true, // ✅ deepseek-reasoner supporte le reasoning
  
  // Monitoring
  enableLogging: true,
  enableMetrics: true,
  
  // DeepSeek spécifique
  thinkingMode: 'auto', // ✅ Auto pour deepseek-reasoner
  parallelToolCalls: false, // ✅ Désactivé par défaut
  strictToolCalls: process.env.DEEPSEEK_STRICT_MODE === 'true' // ✅ Mode strict activé via env var
};

/**
 * Provider DeepSeek pour l'API DeepSeek
 */
export class DeepSeekProvider extends BaseProvider implements LLMProvider {
  readonly info = DEEPSEEK_INFO;
  readonly config: DeepSeekConfig;

  // Implémentation de LLMProvider
  get name(): string {
    return this.info.name;
  }

  get id(): string {
    return this.info.id;
  }

  constructor(customConfig?: Partial<DeepSeekConfig>) {
    super();
    this.config = { ...DEFAULT_DEEPSEEK_CONFIG, ...customConfig };
  }

  /**
   * Vérifie si DeepSeek est disponible
   */
  isAvailable(): boolean {
    return this.validateConfig();
  }

  /**
   * Valide la configuration de DeepSeek
   */
  validateConfig(): boolean {
    if (!this.validateBaseConfig()) {
      logger.error('[DeepSeekProvider] ❌ Configuration de base invalide');
      return false;
    }

    if (!this.config.model) {
      logger.error('[DeepSeekProvider] ❌ Modèle non spécifié');
      return false;
    }

    if (!this.info.supportedModels.includes(this.config.model)) {
      logger.warn(`[DeepSeekProvider] ⚠️ Modèle ${this.config.model} non officiellement supporté`);
    }

    logger.dev('[DeepSeekProvider] ✅ Configuration validée');
    return true;
  }

  /**
   * Effectue un appel à l'API DeepSeek avec support des function calls
   */
  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('DeepSeek provider non configuré');
    }

    try {
      logger.dev(`[DeepSeekProvider] 🚀 Appel avec modèle: ${this.config.model}`);

      // ✅ Vérifier si le streaming est activé
      if (this.config.supportsStreaming) {
        throw new Error('Streaming non supporté dans le provider DeepSeek - utilisez la route API directement');
      }

      // Préparer les messages
      const messages = this.prepareMessages(message, context, history);
      
      // Préparer le payload (sans streaming)
      const payload = await this.preparePayload(messages, []);
      payload.stream = false; // Forcer le mode non-streaming
      
      // Effectuer l'appel API
      const response = await this.makeApiCall(payload);
      
      // Extraire la réponse
      const result = this.extractResponse(response);
      
      logger.dev('[DeepSeekProvider] ✅ Appel réussi');
      
      return {
        content: result.content || '',
        tool_calls: result.tool_calls || [],
        model: result.model,
        usage: result.usage,
        reasoning: result.reasoning
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : 'No stack trace';
      
      logger.error('[DeepSeekProvider] ❌ Erreur lors de l\'appel:', {
        message: errorMessage,
        stack: stack,
        rawError: error
      });
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Erreur inattendue dans DeepSeekProvider: ${errorMessage}`);
      }
    }
  }

  /**
   * Effectue un appel à l'API DeepSeek avec une liste de messages déjà préparée
   */
  async callWithMessages(messages: ChatMessage[], tools: Tool[]): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('DeepSeek provider non configuré');
    }

    try {
      logger.info(`[DeepSeekProvider] 🚀 Appel Chat Completions avec ${messages.length} messages`);
      
      // Conversion des ChatMessage vers le format API
      const apiMessages = this.convertChatMessagesToApiFormat(messages);
      const payload = await this.preparePayload(apiMessages, tools);
      payload.stream = false;
      
      const messagesCount = Array.isArray(payload.messages) ? payload.messages.length : 0;
      const toolsCount = Array.isArray(payload.tools) ? payload.tools.length : 0;
      logger.info(`[DeepSeekProvider] → Chat Completions: ${payload.model} | ${messagesCount} msgs | ${toolsCount} tools`);
      
      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);
      
      logger.dev('[DeepSeekProvider] ✅ Appel Chat Completions réussi');
      
      return {
        content: result.content || '',
        tool_calls: result.tool_calls || [],
        model: result.model,
        usage: result.usage,
        reasoning: result.reasoning
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[DeepSeekProvider] ❌ Erreur lors de l\'appel:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * ✅ Streaming avec Server-Sent Events (SSE)
   * Compatible avec DeepSeek API (format OpenAI)
   */
  async *callWithMessagesStream(
    messages: ChatMessage[], 
    tools: Tool[]
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.isAvailable()) {
      throw new Error('DeepSeek provider non configuré');
    }

    try {
      logger.dev(`[DeepSeekProvider] 🌊 Streaming Chat Completions avec ${messages.length} messages`);
      
      // Conversion des ChatMessage vers le format API
      const apiMessages = this.convertChatMessagesToApiFormat(messages);
      const payload = await this.preparePayload(apiMessages, tools);
      payload.stream = true; // ✅ Activer streaming
      
      const messageCount = Array.isArray(payload.messages) ? payload.messages.length : 0;
      const toolsCount = Array.isArray(payload.tools) ? payload.tools.length : 0;
      logger.info(`[DeepSeekProvider] 🚀 PAYLOAD → DEEPSEEK: ${payload.model} | ${messageCount} messages | ${toolsCount} tools`);
      
      // Appel API avec streaming
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // ✅ Parser le body JSON si possible
        let errorDetails: { error?: { message?: string; type?: string; code?: string } } = {};
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          // Si le parsing échoue, on garde errorText brut
        }
        
        const errorMessage = errorDetails.error?.message || errorText;
        const errorCode = errorDetails.error?.code || errorDetails.error?.type || 'unknown';
        
        logger.error(`[DeepSeekProvider] ❌ Erreur API DeepSeek Streaming:`, {
          statusCode: response.status,
          statusText: response.statusText,
          errorMessage,
          errorCode,
          model: this.config.model,
          messagesCount: messages.length,
          toolsCount: tools.length
        });
        
        throw new Error(`DeepSeek API error (${response.status}): ${errorMessage}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // ✅ Parser le stream SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Garder la ligne incomplète

          for (const line of lines) {
            if (line.trim() === '' || !line.startsWith('data: ')) {
              continue;
            }

            const data = line.slice(6); // Enlever 'data: '
            
            if (data === '[DONE]') {
              return;
            }

            try {
              const chunk: DeepSeekStreamChunk = JSON.parse(data);
              
              // ✅ Extraire le delta du chunk
              const choice = chunk.choices?.[0];
              if (!choice) {
                continue;
              }

              const delta = choice.delta;
              if (!delta) {
                continue;
              }

              const streamChunk: StreamChunk = {
                type: 'delta'
              };

              // ✅ Content delta
              if (delta.content !== undefined) {
                streamChunk.content = delta.content || '';
              }

              // ✅ Tool calls delta
              if (delta.tool_calls && delta.tool_calls.length > 0) {
                streamChunk.tool_calls = delta.tool_calls
                  .filter((tc): tc is NonNullable<typeof tc> => tc !== undefined)
                  .map(tc => ({
                    id: tc.id || '',
                    type: 'function' as const,
                    function: {
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || ''
                    }
                  }));
              }

              // ✅ Reasoning content delta (thinking mode)
              if (delta.reasoning_content) {
                streamChunk.reasoning = delta.reasoning_content;
              }

              // ✅ Finish reason
              if (choice.finish_reason) {
                streamChunk.finishReason = choice.finish_reason;
              }

              yield streamChunk;

            } catch (parseError) {
              logger.warn('[DeepSeekProvider] ⚠️ Erreur parsing chunk SSE:', {
                error: parseError instanceof Error ? parseError.message : String(parseError),
                data: data.substring(0, 200)
              });
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[DeepSeekProvider] ❌ Erreur lors du streaming:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * ✅ CRITIQUE: Convertit les ChatMessage vers le format API DeepSeek
   * 
   * ⚠️ DeepSeek REQUIS `reasoning_content` dans les messages assistant avec tool_calls
   * ⚠️ DeepSeek REQUIS que chaque message assistant avec tool_calls soit suivi de messages tool
   * ⚠️ DeepSeek REQUIS que chaque message tool soit précédé d'un message assistant avec tool_calls
   * 
   * Règle stricte DeepSeek :
   * - Un message assistant avec tool_calls DOIT être suivi de messages tool pour chaque tool_call_id
   * - Un message tool DOIT être précédé d'un message assistant avec tool_calls
   * 
   * Structure historique possible :
   * 1. Assistant avec tool_calls + tool_results (dans le champ) → Envoyer assistant SANS tool_calls + tool_results
   * 2. Assistant avec tool_calls (sans tool_results) + messages tool séparés → Envoyer assistant AVEC tool_calls + messages tool
   * 3. Assistant avec tool_calls (sans tool_results) + pas de messages tool → SKIP (appel en cours)
   */
  private convertChatMessagesToApiFormat(messages: ChatMessage[]): DeepSeekMessage[] {
    const result: DeepSeekMessage[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // ✅ Gérer les messages assistant
      if (msg.role === 'assistant') {
        const assistantMsg = msg as import('@/types/chat').AssistantMessage;
        
        // ✅ CRITIQUE: Si tool_calls existe, vérifier s'ils sont résolus
        // ⚠️ DeepSeek REQUIS: Chaque tool_call_id DOIT avoir un message tool correspondant
        if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
          // ✅ Validation préalable: filtrer les tool_calls invalides (sans id)
          const validToolCalls = assistantMsg.tool_calls.filter(tc => tc.id && tc.id.trim().length > 0);
          
          // ✅ Si aucun tool_call valide, skip le message
          if (validToolCalls.length === 0) {
            logger.warn(`[DeepSeekProvider] ⚠️ SKIP message assistant: aucun tool_call valide (tous sans id)`, {
              totalToolCalls: assistantMsg.tool_calls.length
            });
            continue;
          }
          
          // ✅ Si certains tool_calls sont invalides, utiliser seulement les valides
          if (validToolCalls.length !== assistantMsg.tool_calls.length) {
            logger.warn(`[DeepSeekProvider] ⚠️ Filtré ${assistantMsg.tool_calls.length - validToolCalls.length} tool_calls invalides, utilisation de ${validToolCalls.length} valides`, {
              totalToolCalls: assistantMsg.tool_calls.length,
              validToolCalls: validToolCalls.length
            });
            // ✅ Remplacer tool_calls par les valides seulement
            assistantMsg.tool_calls = validToolCalls;
          }
          // ✅ Cas 1: tool_results présents dans le champ → tool_calls résolus
          if (assistantMsg.tool_results && assistantMsg.tool_results.length > 0) {
            // ✅ CRITIQUE: Valider que chaque tool_call_id a un tool_result correspondant
            const toolCallIds = new Set(assistantMsg.tool_calls.map(tc => tc.id));
            const toolResultIds = new Set(assistantMsg.tool_results.map(tr => tr.tool_call_id));
            
            const missingToolCallIds = Array.from(toolCallIds).filter(id => !toolResultIds.has(id));
            if (missingToolCallIds.length > 0) {
              logger.warn(`[DeepSeekProvider] ⚠️ SKIP message assistant: ${missingToolCallIds.length} tool_call_id sans tool_result correspondant`, {
                missingIds: missingToolCallIds,
                toolCallsCount: assistantMsg.tool_calls.length,
                toolResultsCount: assistantMsg.tool_results.length
              });
              // ✅ SKIP car DeepSeek exige que chaque tool_call ait un message tool
              continue;
            }
            
            // ✅ Envoyer assistant SANS tool_calls (les tool_results suivent)
            const assistantMessage: DeepSeekMessage = {
              role: 'assistant',
              content: typeof msg.content === 'string' ? msg.content : null,
              reasoning_content: assistantMsg.reasoning || ''
            };
            result.push(assistantMessage);
            
            // ✅ Transformer tool_results en messages tool (dans l'ordre des tool_calls)
            // ✅ Créer un map pour retrouver rapidement les tool_results par tool_call_id
            const toolResultMap = new Map<string, typeof assistantMsg.tool_results[0]>();
            for (const toolResult of assistantMsg.tool_results) {
              toolResultMap.set(toolResult.tool_call_id, toolResult);
            }
            
            // ✅ Envoyer les messages tool dans l'ordre des tool_calls (pour cohérence)
            for (const toolCall of assistantMsg.tool_calls) {
              const toolResult = toolResultMap.get(toolCall.id);
              if (!toolResult) {
                logger.warn(`[DeepSeekProvider] ⚠️ Tool result manquant pour tool_call_id: ${toolCall.id}`);
                continue;
              }
              
              result.push({
                role: 'tool',
                tool_call_id: toolResult.tool_call_id,
                name: toolResult.name,
                content: typeof toolResult.content === 'string' 
                  ? toolResult.content 
                  : JSON.stringify(toolResult.content ?? null)
              });
            }
            
            logger.dev(`[DeepSeekProvider] ✅ Message assistant avec ${assistantMsg.tool_results.length} tool_results (dans champ, validés)`);
            continue;
          }
          
          // ✅ Cas 2: Pas de tool_results dans le champ → vérifier s'il y a des messages tool qui suivent
          // Chercher les messages tool suivants dans l'historique
          const followingToolMessages: ChatMessage[] = [];
          let j = i + 1;
          while (j < messages.length && messages[j].role === 'tool') {
            followingToolMessages.push(messages[j]);
            j++;
          }
          
          // ✅ Si des messages tool suivent → tool_calls résolus (messages tool séparés)
          if (followingToolMessages.length > 0) {
            // ✅ CRITIQUE: Valider que chaque tool_call_id a un message tool correspondant
            const toolCallIds = new Set(assistantMsg.tool_calls.map(tc => tc.id));
            const toolMessageIds = new Set<string>();
            
            // ✅ Collecter les tool_call_id des messages tool
            for (const toolMsg of followingToolMessages) {
              if (toolMsg.role !== 'tool') {
                continue;
              }
              const toolMessage = toolMsg as import('@/types/chat').ToolMessage;
              if (toolMessage.tool_call_id) {
                toolMessageIds.add(toolMessage.tool_call_id);
              }
            }
            
            // ✅ Vérifier que tous les tool_call_id ont un message tool correspondant
            const missingToolCallIds = Array.from(toolCallIds).filter(id => !toolMessageIds.has(id));
            if (missingToolCallIds.length > 0) {
              logger.warn(`[DeepSeekProvider] ⚠️ SKIP message assistant: ${missingToolCallIds.length} tool_call_id sans message tool correspondant`, {
                missingIds: missingToolCallIds,
                toolCallsCount: assistantMsg.tool_calls.length,
                toolMessagesCount: followingToolMessages.length
              });
              // ✅ SKIP car DeepSeek exige que chaque tool_call ait un message tool
              continue;
            }
            
            // ✅ Envoyer assistant AVEC tool_calls + reasoning_content
            const assistantMessage: DeepSeekMessage = {
              role: 'assistant',
              content: typeof msg.content === 'string' ? msg.content : null,
              reasoning_content: assistantMsg.reasoning || '', // ✅ REQUIS par DeepSeek
              tool_calls: assistantMsg.tool_calls.map(tc => ({
                id: tc.id,
                type: 'function' as const,
                function: {
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || ''
                }
              }))
            };
            result.push(assistantMessage);
            
            // ✅ Envoyer les messages tool qui suivent (dans l'ordre des tool_calls si possible)
            // ✅ Créer un map pour retrouver rapidement les messages tool par tool_call_id
            const toolMessageMap = new Map<string, import('@/types/chat').ToolMessage>();
            for (const toolMsg of followingToolMessages) {
              if (toolMsg.role !== 'tool') {
                continue;
              }
              const toolMessage = toolMsg as import('@/types/chat').ToolMessage;
              if (toolMessage.tool_call_id) {
                toolMessageMap.set(toolMessage.tool_call_id, toolMessage);
              }
            }
            
            // ✅ Envoyer les messages tool dans l'ordre des tool_calls (pour cohérence)
            for (const toolCall of assistantMsg.tool_calls) {
              const toolMessage = toolMessageMap.get(toolCall.id);
              if (!toolMessage) {
                logger.warn(`[DeepSeekProvider] ⚠️ Message tool manquant pour tool_call_id: ${toolCall.id}`);
                continue;
              }
              
              result.push({
                role: 'tool',
                tool_call_id: toolMessage.tool_call_id,
                content: typeof toolMessage.content === 'string' 
                  ? toolMessage.content 
                  : (typeof toolMessage.content === 'object' && toolMessage.content !== null 
                    ? JSON.stringify(toolMessage.content) 
                    : String(toolMessage.content ?? '')),
                ...(toolMessage.name && { name: toolMessage.name })
              });
            }
            
            // ✅ Avancer l'index pour skip les messages tool qu'on vient de traiter
            i = j - 1; // -1 car le for va incrémenter
            
            logger.dev(`[DeepSeekProvider] ✅ Message assistant avec ${assistantMsg.tool_calls.length} tool_calls + ${followingToolMessages.length} messages tool séparés (validés)`);
            continue;
          }
          
          // ✅ Cas 3: Pas de tool_results ET pas de messages tool suivants → SKIP (appel en cours)
          logger.warn(`[DeepSeekProvider] ⚠️ SKIP message assistant avec ${assistantMsg.tool_calls.length} tool_calls non résolus (pas de tool_results ni messages tool suivants)`);
          continue;
        }
        
        // ✅ Message assistant sans tool_calls : envoyer normalement
        const assistantMessage: DeepSeekMessage = {
          role: 'assistant',
          content: typeof msg.content === 'string' ? msg.content : null,
          ...(assistantMsg.reasoning && { reasoning_content: assistantMsg.reasoning })
        };
        result.push(assistantMessage);
        continue;
      }
      
      // ✅ Gérer les messages tool : uniquement s'ils ne sont pas déjà traités (après un assistant)
      // Les messages tool sont normalement traités avec leur assistant précédent
      // Mais on peut avoir des messages tool orphelins (sans assistant précédent) → on les skip
      if (msg.role === 'tool') {
        // ✅ Vérifier si le message précédent dans result est un assistant avec tool_calls
        const lastResult = result[result.length - 1];
        const isAfterAssistantWithToolCalls = lastResult?.role === 'assistant' && lastResult.tool_calls && lastResult.tool_calls.length > 0;
        
        if (!isAfterAssistantWithToolCalls) {
          logger.warn(`[DeepSeekProvider] ⚠️ SKIP message tool orphelin (pas d'assistant avec tool_calls précédent)`);
          continue;
        }
        
        // ✅ Ce cas ne devrait normalement pas arriver car les messages tool sont traités avec leur assistant
        // Mais on le garde pour sécurité
        const toolCallId = msg.tool_call_id;
        if (!toolCallId) {
          logger.warn(`[DeepSeekProvider] ⚠️ Message tool sans tool_call_id, SKIP`);
          continue;
        }
        
        result.push({
          role: 'tool',
          tool_call_id: toolCallId,
          content: typeof msg.content === 'string' 
            ? msg.content 
            : (typeof msg.content === 'object' && msg.content !== null 
              ? JSON.stringify(msg.content) 
              : String(msg.content ?? '')),
          ...(msg.name && { name: msg.name })
        });
        continue;
      }
      
      // ✅ Messages user et system : envoyer normalement
      const messageObj: DeepSeekMessage = {
        role: msg.role as 'user' | 'system',
        content: typeof msg.content === 'string' ? msg.content : null
      };
      result.push(messageObj);
    }
    
    return result;
  }

  /**
   * Prépare les messages pour l'API
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]): DeepSeekMessage[] {
    const messages: DeepSeekMessage[] = [];

    // Message système avec contexte
    const systemContent = this.formatSystemMessage(context);
    messages.push({
      role: 'system',
      content: systemContent
    });

    // Historique des messages
    // ✅ Utiliser convertChatMessagesToApiFormat pour la cohérence
    const historyMessages = this.convertChatMessagesToApiFormat(history);
    messages.push(...historyMessages);

    // Message utilisateur actuel
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Prépare le payload pour l'API DeepSeek
   */
  private async preparePayload(messages: DeepSeekMessage[], tools: Tool[]): Promise<DeepSeekChatCompletionRequest> {
    const payload: DeepSeekChatCompletionRequest = {
      model: this.config.model,
      messages: messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      stream: false
    };

    // ✅ Thinking mode pour deepseek-reasoner
    if (this.config.model === 'deepseek-reasoner' && this.config.thinkingMode) {
      payload.thinking_mode = this.config.thinkingMode;
    }

    if (tools && tools.length > 0) {
      // ✅ Convertir les tools au format DeepSeek avec support strict mode
      payload.tools = tools
        .filter((tool): tool is Extract<Tool, { type: 'function' }> => isFunctionTool(tool))
        .map(tool => {
          const toolDef: NonNullable<DeepSeekChatCompletionRequest['tools']>[number] = {
            type: 'function' as const,
            function: {
              name: tool.function.name,
              description: tool.function.description,
              parameters: {
                ...tool.function.parameters,
                // ✅ En mode strict, additionalProperties doit être false pour tous les objects
                ...(this.config.strictToolCalls && {
                  additionalProperties: false
                })
              }
            }
          };
          
          // ✅ Ajouter strict: true si activé dans la config (mode beta)
          if (this.config.strictToolCalls) {
            toolDef.function.strict = true;
          }
          
          return toolDef;
        });
      payload.tool_choice = 'auto';
    }

    return payload;
  }

  /**
   * Effectue l'appel API à DeepSeek
   */
  private async makeApiCall(payload: DeepSeekChatCompletionRequest): Promise<DeepSeekChatCompletionResponse> {
    if (payload.stream) {
      throw new Error('Streaming non supporté dans makeApiCall - utilisez callWithMessagesStream');
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // ✅ Parser le body JSON si possible
      let errorDetails: { error?: { message?: string; type?: string; code?: string } } = {};
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        // Si le parsing échoue, on garde errorText brut
      }
      
      const errorMessage = errorDetails.error?.message || errorText;
      const errorCode = errorDetails.error?.code || errorDetails.error?.type || 'unknown';
      
      logger.error(`[DeepSeekProvider] ❌ Erreur API DeepSeek:`, {
        statusCode: response.status,
        statusText: response.statusText,
        errorMessage,
        errorCode,
        model: payload.model,
        messagesCount: payload.messages.length,
        toolsCount: payload.tools?.length || 0
      });
      
      throw new Error(`DeepSeek API error (${response.status}): ${errorMessage}`);
    }

    const responseData: DeepSeekChatCompletionResponse = await response.json();
    return responseData;
  }

  /**
   * Extrait la réponse de l'API DeepSeek avec support des tool calls
   */
  private extractResponse(response: DeepSeekChatCompletionResponse): LLMResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Réponse invalide de DeepSeek API');
    }

    const choice = response.choices[0];
    const result: LLMResponse = {
      content: choice?.message?.content ?? '',
      model: response.model,
      usage: response.usage
    };

    // ✅ Ajouter les tool calls si présents
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      result.tool_calls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments
        }
      }));
      logger.dev(`[DeepSeekProvider] 🔧 ${result.tool_calls.length} tool calls détectés`);
    }

    // ✅ Ajouter le reasoning content si présent (thinking mode)
    if (choice?.message?.reasoning_content) {
      result.reasoning = choice.message.reasoning_content;
      logger.dev(`[DeepSeekProvider] 🧠 Reasoning content détecté (${result.reasoning.length} chars)`);
    }

    return result;
  }

  /**
   * Formate le message système avec le contexte
   */
  private formatSystemMessage(context: AppContext): string {
    // Si le contexte contient déjà des instructions système (depuis l'orchestrateur)
    if (context.content && context.content.trim().length > 0) {
      logger.dev(`[DeepSeekProvider] 🎯 Utilisation des instructions système fournies (${context.content.length} chars)`);
      return context.content;
    }

    // Fallback vers le système de templates existant
    const message = getSystemMessage('assistant-contextual', { context });
    if (!message) {
      return 'Tu es un assistant IA utile et bienveillant.';
    }
    
    logger.dev(`[DeepSeekProvider] ⚙️ Utilisation du template par défaut`);
    return message;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): Tool[] {
    // TODO: Implémenter si nécessaire
    return [];
  }

  /**
   * Test de connexion à l'API DeepSeek
   */
  async testConnection(): Promise<boolean> {
    try {
      const testPayload: DeepSeekChatCompletionRequest = {
        model: this.config.model,
        messages: [
          { role: 'user', content: 'Hello' }
        ],
        max_tokens: 10,
        stream: false
      };

      await this.makeApiCall(testPayload);
      logger.info('[DeepSeekProvider] ✅ Test de connexion réussi');
      return true;
    } catch (error) {
      logger.error('[DeepSeekProvider] ❌ Test de connexion échoué:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
