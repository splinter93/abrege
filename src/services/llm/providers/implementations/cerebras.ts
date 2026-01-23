/**
 * Provider Cerebras - API Inference
 * 
 * Implémentation complète avec support:
 * - Streaming SSE
 * - Tool calls (function calling)
 * - Reasoning (si supporté par le modèle)
 * 
 * Documentation: https://inference-docs.cerebras.ai
 */

import { BaseProvider, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import type { LLMResponse, ToolCall, Tool } from '../../types/strictTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';
import type {
  CerebrasMessage,
  CerebrasChatCompletionRequest,
  CerebrasChatCompletionResponse,
  CerebrasStreamChunk
} from '../../types/cerebrasTypes';
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
 * Configuration spécifique à Cerebras
 */
interface CerebrasConfig extends ProviderConfig {
  // Spécifique à Cerebras
  parallelToolCalls?: boolean; // ✅ Support des appels parallèles (défaut: false)
  strictToolCalls?: boolean; // ✅ Mode strict pour tool calls (défaut: false)
  clearThinking?: boolean; // ✅ zai-glm-4.7: Exclure le thinking précédent du contexte (défaut: true)
  reasoningEffort?: 'low' | 'medium' | 'high'; // ✅ gpt-oss-120b: Niveau de reasoning (défaut: medium)
  minTokens?: number; // ✅ gpt-oss-120b: Minimum de tokens à générer (peut causer des EOS tokens)
}

/**
 * Informations sur Cerebras
 */
const CEREBRAS_INFO: ProviderInfo = {
  id: 'cerebras',
  name: 'Cerebras',
  version: '1.0.0',
  description: 'Ultra-fast inference platform with Llama and other models',
  capabilities: {
    functionCalls: true,
    streaming: true,
    reasoning: true, // ✅ Supporté par zai-glm-4.7 et autres modèles récents
    codeExecution: false,
    webSearch: false,
    structuredOutput: true // ✅ Supporté par zai-glm-4.7 avec strict: true
  },
  supportedModels: [
    'zai-glm-4.7', // ✅ Nouveau modèle avec reasoning, tool calling, structured outputs
    'gpt-oss-120b', // ✅ OpenAI GPT OSS - Reasoning avancé, très rapide (~3000 tokens/sec)
    'llama-3.3-70b',
    'llama-3.1-8b',
    'llama-3.1-70b'
  ],
  pricing: {
    input: '$2.25 / M tokens', // ✅ Pricing zai-glm-4.7
    output: '$2.75 / M tokens' // ✅ Pricing zai-glm-4.7
  }
};

/**
 * Configuration par défaut de Cerebras
 */
const DEFAULT_CEREBRAS_CONFIG: CerebrasConfig = {
  // Base
  apiKey: process.env.CEREBRAS_API_KEY || '',
  baseUrl: 'https://api.cerebras.ai/v1',
  timeout: 120000, // 120s
  
  // LLM
  model: 'zai-glm-4.7', // ✅ Modèle par défaut avec reasoning et tool calling avancé
  temperature: 0.7,
  maxTokens: 40000, // ✅ Max output pour zai-glm-4.7 (40k tokens)
  topP: 0.9,
  
  // Features
  supportsFunctionCalls: true,
  supportsStreaming: false, // Streaming géré par la route API
  supportsReasoning: true, // ✅ zai-glm-4.7 supporte le reasoning (activé par défaut)
  
  // Monitoring
  enableLogging: true,
  enableMetrics: true,
  
  // Cerebras spécifique
  parallelToolCalls: false, // ✅ Désactivé par défaut (comme Groq)
  strictToolCalls: false, // ✅ Mode strict désactivé par défaut
  clearThinking: true, // ✅ zai-glm-4.7: Exclure le thinking précédent par défaut
  reasoningEffort: 'medium' // ✅ gpt-oss-120b: Niveau de reasoning par défaut (medium)
};

/**
 * Provider Cerebras pour l'API Cerebras
 */
export class CerebrasProvider extends BaseProvider implements LLMProvider {
  readonly info = CEREBRAS_INFO;
  readonly config: CerebrasConfig;

  // Implémentation de LLMProvider
  get name(): string {
    return this.info.name;
  }

  get id(): string {
    return this.info.id;
  }

  constructor(customConfig?: Partial<CerebrasConfig>) {
    super();
    this.config = { ...DEFAULT_CEREBRAS_CONFIG, ...customConfig };
  }

  /**
   * Vérifie si Cerebras est disponible
   */
  isAvailable(): boolean {
    return this.validateConfig();
  }

  /**
   * Valide la configuration de Cerebras
   */
  validateConfig(): boolean {
    if (!this.validateBaseConfig()) {
      logger.error('[CerebrasProvider] ❌ Configuration de base invalide');
      return false;
    }

    if (!this.config.model) {
      logger.error('[CerebrasProvider] ❌ Modèle non spécifié');
      return false;
    }

    if (!this.info.supportedModels.includes(this.config.model)) {
      logger.warn(`[CerebrasProvider] ⚠️ Modèle ${this.config.model} non officiellement supporté`);
    }

    logger.dev('[CerebrasProvider] ✅ Configuration validée');
    return true;
  }

  /**
   * Effectue un appel à l'API Cerebras avec support des function calls
   */
  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('Cerebras provider non configuré');
    }

    try {
      logger.dev(`[CerebrasProvider] 🚀 Appel avec modèle: ${this.config.model}`);

      // ✅ Vérifier si le streaming est activé
      if (this.config.supportsStreaming) {
        throw new Error('Streaming non supporté dans le provider Cerebras - utilisez la route API directement');
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
      
      logger.dev('[CerebrasProvider] ✅ Appel réussi');
      
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
      
      logger.error('[CerebrasProvider] ❌ Erreur lors de l\'appel:', {
        message: errorMessage,
        stack: stack,
        rawError: error
      });
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Erreur inattendue dans CerebrasProvider: ${errorMessage}`);
      }
    }
  }

  /**
   * Effectue un appel à l'API Cerebras avec une liste de messages déjà préparée
   */
  async callWithMessages(messages: ChatMessage[], tools: Tool[]): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('Cerebras provider non configuré');
    }

    try {
      logger.info(`[CerebrasProvider] 🚀 Appel Chat Completions avec ${messages.length} messages`);
      
      // Conversion des ChatMessage vers le format API
      const apiMessages = this.convertChatMessagesToApiFormat(messages);
      const payload = await this.preparePayload(apiMessages, tools);
      payload.stream = false;
      
      const messagesCount = Array.isArray(payload.messages) ? payload.messages.length : 0;
      const toolsCount = Array.isArray(payload.tools) ? payload.tools.length : 0;
      logger.info(`[CerebrasProvider] → Chat Completions: ${payload.model} | ${messagesCount} msgs | ${toolsCount} tools`);
      
      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);
      
      logger.dev('[CerebrasProvider] ✅ Appel Chat Completions réussi');
      
      return {
        content: result.content || '',
        tool_calls: result.tool_calls || [],
        model: result.model,
        usage: result.usage,
        reasoning: result.reasoning
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[CerebrasProvider] ❌ Erreur lors de l\'appel:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * ✅ Streaming avec Server-Sent Events (SSE)
   * Compatible avec Cerebras API (format OpenAI)
   */
  async *callWithMessagesStream(
    messages: ChatMessage[], 
    tools: Tool[]
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.isAvailable()) {
      throw new Error('Cerebras provider non configuré');
    }

    try {
      logger.dev(`[CerebrasProvider] 🌊 Streaming Chat Completions avec ${messages.length} messages`);
      
      // Conversion des ChatMessage vers le format API
      const apiMessages = this.convertChatMessagesToApiFormat(messages);
      const payload = await this.preparePayload(apiMessages, tools);
      payload.stream = true; // ✅ Activer streaming
      
      const messageCount = Array.isArray(payload.messages) ? payload.messages.length : 0;
      const toolsCount = Array.isArray(payload.tools) ? payload.tools.length : 0;
      logger.info(`[CerebrasProvider] 🚀 PAYLOAD → CEREBRAS: ${payload.model} | ${messageCount} messages | ${toolsCount} tools`);
      
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
        
        logger.error(`[CerebrasProvider] ❌ Erreur API Cerebras Streaming:`, {
          statusCode: response.status,
          statusText: response.statusText,
          errorMessage,
          errorCode,
          model: this.config.model,
          messagesCount: messages.length,
          toolsCount: tools.length
        });
        
        const error = new Error(`Cerebras API error: ${response.status} - ${errorMessage}`);
        (error as Error & { statusCode?: number; provider?: string; errorCode?: string }).statusCode = response.status;
        (error as Error & { statusCode?: number; provider?: string; errorCode?: string }).provider = 'cerebras';
        (error as Error & { statusCode?: number; provider?: string; errorCode?: string }).errorCode = errorCode;
        throw error;
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Lire le stream SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          logger.dev(`[CerebrasProvider] ✅ Stream terminé`);
          break;
        }

        // Décoder le chunk
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const jsonStr = trimmed.substring(6);
            const chunk = JSON.parse(jsonStr) as CerebrasStreamChunk;
            
            const delta = chunk.choices?.[0]?.delta;
            if (!delta) continue;

            // ✅ Construire le chunk (format identique à Groq/xAI)
            const streamChunk: StreamChunk = {
              type: 'delta'
            };
            
            if (delta.content) {
              streamChunk.content = delta.content;
            }
            
            if (delta.tool_calls && delta.tool_calls.length > 0) {
              streamChunk.tool_calls = delta.tool_calls
                .filter((tc): tc is NonNullable<typeof tc> => tc !== null && tc !== undefined)
                .map((tc) => ({
                  id: tc.id || '',
                  type: 'function' as const,
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || ''
                  }
                }));
            }
            
            // ✅ Reasoning (si supporté par le modèle)
            if (delta.reasoning) {
              streamChunk.reasoning = delta.reasoning;
            }
            
            if (chunk.choices?.[0]?.finish_reason) {
              streamChunk.finishReason = chunk.choices[0].finish_reason;
            }

            if (chunk.usage) {
              streamChunk.usage = chunk.usage;
            }

            // ✅ Yield tous les chunks
            yield streamChunk;
            
          } catch (parseError) {
            logger.error('[CerebrasProvider] ❌ Erreur parsing chunk SSE:', parseError);
          }
        }
      }

    } catch (error) {
      logger.error('[CerebrasProvider] ❌ Erreur streaming:', error);
      throw error;
    }
  }

  /**
   * Convertit les ChatMessage vers le format API Cerebras
   */
  private convertChatMessagesToApiFormat(messages: ChatMessage[]): CerebrasMessage[] {
    return messages.map((msg) => {
      const messageObj: CerebrasMessage = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: typeof msg.content === 'string' ? msg.content : null
      };

      // ✅ Gérer les tool calls pour les messages assistant
      // Conversion explicite vers le type ToolCall de strictTypes
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        if (!msg.tool_results || msg.tool_results.length === 0) {
          messageObj.tool_calls = msg.tool_calls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function?.name || '',
              arguments: tc.function?.arguments || ''
            }
          }));
        } else {
          logger.warn(`[CerebrasProvider] ⚠️ Skipping tool_calls (already resolved with ${msg.tool_results.length} results)`);
        }
      }

      // ✅ Gérer les tool results pour les messages tool (format Cerebras)
      // Documentation: role: "tool", tool_call_id: string, content: string
      if (msg.role === 'tool') {
        const toolCallId = msg.tool_call_id;
        
        if (!toolCallId) {
          logger.warn(`[CerebrasProvider] ⚠️ Message tool sans tool_call_id, SKIP`);
          return null;
        }
        
        messageObj.tool_call_id = toolCallId;
        
        // ✅ Convertir content en string (Cerebras attend une string)
        // Le content peut être JSON stringifié si c'est un objet
        if (typeof msg.content === 'object' && msg.content !== null) {
          messageObj.content = JSON.stringify(msg.content);
        } else if (typeof msg.content === 'string') {
          messageObj.content = msg.content;
        } else {
          messageObj.content = String(msg.content ?? '');
        }
        
        // ✅ Note: Cerebras n'utilise PAS le champ 'name' pour les messages tool
        // Seul tool_call_id est requis
      }

      return messageObj;
    }).filter((msg): msg is CerebrasMessage => msg !== null);
  }

  /**
   * Prépare les messages pour l'API
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]): CerebrasMessage[] {
    const messages: CerebrasMessage[] = [];

    // Message système avec contexte
    const systemContent = this.formatSystemMessage(context);
    messages.push({
      role: 'system',
      content: systemContent
    });

    // Historique des messages
    for (const msg of history) {
      const messageObj: CerebrasMessage = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: typeof msg.content === 'string' ? msg.content : null
      };

      // ✅ Gérer les tool calls pour les messages assistant
      // Conversion explicite vers le type ToolCall de strictTypes
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        messageObj.tool_calls = msg.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.function?.name || '',
            arguments: tc.function?.arguments || ''
          }
        }));
      }

      // ✅ Gérer les tool results pour les messages tool (format Cerebras conforme)
      if (msg.role === 'tool' && msg.tool_call_id) {
        messageObj.tool_call_id = msg.tool_call_id;
        // ✅ Convertir content en string si nécessaire
        if (typeof msg.content === 'object' && msg.content !== null) {
          messageObj.content = JSON.stringify(msg.content);
        }
        // ✅ Note: Cerebras n'utilise PAS le champ 'name' pour les messages tool
      }

      messages.push(messageObj);

      // ✅ Transformer `tool_results` en messages `tool` séparés (format Cerebras conforme)
      // Documentation: role: "tool", tool_call_id: string, content: string (pas de name)
      if (msg.role === 'assistant' && msg.tool_results && msg.tool_results.length > 0) {
        for (const result of msg.tool_results) {
          messages.push({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            // ✅ Content doit être une string (JSON stringifié si objet)
            content: typeof result.content === 'string' 
              ? result.content 
              : JSON.stringify(result.content ?? null)
            // ✅ Pas de champ 'name' selon la doc Cerebras
          });
        }
      }
    }

    // Message utilisateur actuel
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Prépare le payload pour l'API Cerebras avec support des tools
   */
  private async preparePayload(messages: CerebrasMessage[], tools: Tool[]): Promise<CerebrasChatCompletionRequest> {
    // ✅ Nettoyer les messages pour Cerebras (format conforme à la documentation)
    const cleanedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id })
      // ✅ Note: Cerebras n'utilise PAS le champ 'name' pour les messages tool
    }));

    const payload: CerebrasChatCompletionRequest = {
      model: this.config.model,
      messages: cleanedMessages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      stream: false
    };
    
    // ✅ zai-glm-4.7: Ajouter clear_thinking si configuré
    // Contrôle si le thinking précédent est inclus dans le contexte (défaut: true = exclure)
    // Documentation: https://inference-docs.cerebras.ai/models/zai-glm-47
    if (this.config.clearThinking !== undefined) {
      payload.clear_thinking = this.config.clearThinking;
    }
    
    // ✅ gpt-oss-120b: Ajouter reasoning_effort si configuré
    // ⚠️ IMPORTANT: reasoning_effort est UNIQUEMENT pour gpt-oss-120b, PAS pour zai-glm-4.7
    // zai-glm-4.7 a le reasoning activé par défaut (pas de paramètre reasoning_effort)
    // Documentation: https://inference-docs.cerebras.ai/models/openai-oss
    if (this.config.reasoningEffort && this.config.model === 'gpt-oss-120b') {
      payload.reasoning_effort = this.config.reasoningEffort;
    }
    
    // ✅ gpt-oss-120b: Ajouter min_tokens si configuré
    // ⚠️ ATTENTION: Peut causer des tokens EOS et des erreurs de parsing
    if (this.config.minTokens !== undefined) {
      payload.min_tokens = this.config.minTokens;
      logger.warn('[CerebrasProvider] ⚠️ min_tokens activé - peut causer des tokens EOS');
    }

    if (tools && tools.length > 0) {
      // ✅ Convertir les tools au format Cerebras avec support strict mode
      payload.tools = tools
        .filter((tool): tool is Extract<Tool, { type: 'function' }> => isFunctionTool(tool))
        .map(tool => {
          const toolDef: NonNullable<CerebrasChatCompletionRequest['tools']>[number] = {
            type: 'function' as const,
            function: {
              name: tool.function.name,
              description: tool.function.description,
              parameters: {
                ...tool.function.parameters,
                // ✅ En mode strict, additionalProperties doit être false
                ...(this.config.strictToolCalls && {
                  additionalProperties: false
                })
              }
            }
          };
          
          // ✅ Ajouter strict: true si activé dans la config
          if (this.config.strictToolCalls) {
            toolDef.function.strict = true;
          }
          
          return toolDef;
        });
      payload.tool_choice = 'auto';
      
      // ✅ Ajouter parallel_tool_calls selon la config
      payload.parallel_tool_calls = this.config.parallelToolCalls ?? false;
    }
    
    return payload;
  }

  /**
   * Effectue l'appel API à Cerebras
   */
  private async makeApiCall(payload: CerebrasChatCompletionRequest): Promise<CerebrasChatCompletionResponse> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cerebras API error: ${response.status} - ${errorText}`);
    }

    if (payload.stream) {
      throw new Error('Streaming non supporté dans makeApiCall - utilisez callWithMessagesStream');
    }

    const responseData = await response.json() as CerebrasChatCompletionResponse;
    logger.dev('[CerebrasProvider] 🔍 Réponse brute de l\'API Cerebras:', {
      hasChoices: 'choices' in responseData,
      choices: responseData?.choices,
      hasContent: responseData?.choices?.[0]?.message?.content
    });
    
    return responseData;
  }

  /**
   * Extrait la réponse de l'API Cerebras avec support des tool calls
   */
  private extractResponse(response: CerebrasChatCompletionResponse): LLMResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Réponse invalide de Cerebras API');
    }

    const choice = response.choices[0];
    const result: LLMResponse = {
      content: choice?.message?.content ?? '',
      model: response.model,
      usage: response.usage
    };

    // ✅ Ajouter les tool calls si présents
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      result.tool_calls = choice.message.tool_calls;
      logger.dev(`[CerebrasProvider] 🔧 ${result.tool_calls.length} tool calls détectés`);
    }

    // ✅ Ajouter le reasoning si présent
    if (choice?.message?.reasoning) {
      result.reasoning = choice.message.reasoning;
      logger.dev(`[CerebrasProvider] 🧠 Reasoning détecté`);
    }

    return result;
  }

  /**
   * Formate le message système avec le contexte
   */
  private formatSystemMessage(context: AppContext): string {
    if (context.content && context.content.trim().length > 0) {
      logger.dev(`[CerebrasProvider] 🎯 Utilisation des instructions système fournies`);
      return context.content;
    }

    const message = getSystemMessage('assistant-contextual', { context });
    if (!message) {
      return 'Tu es un assistant IA utile et bienveillant.';
    }
    
    logger.dev(`[CerebrasProvider] ⚙️ Utilisation du template par défaut`);
    return message;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): Tool[] {
    // Retourner un tableau vide temporairement
    return [];
  }
}
