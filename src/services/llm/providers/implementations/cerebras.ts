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
 * Rotation des clés API Cerebras (round-robin)
 */
class CerebrasApiKeyRotator {
  private static instance: CerebrasApiKeyRotator;
  private apiKeys: string[] = [];
  private currentIndex = 0;

  private constructor() {
    // Récupérer toutes les clés disponibles depuis les variables d'environnement
    const keys: string[] = [];
    if (process.env.CEREBRAS_API_KEY) {
      keys.push(process.env.CEREBRAS_API_KEY);
    }
    if (process.env.CEREBRAS_API_KEY_2) {
      keys.push(process.env.CEREBRAS_API_KEY_2);
    }
    // Support pour plus de clés si nécessaire
    let keyIndex = 3;
    while (process.env[`CEREBRAS_API_KEY_${keyIndex}`]) {
      keys.push(process.env[`CEREBRAS_API_KEY_${keyIndex}`] as string);
      keyIndex++;
    }

    this.apiKeys = keys.filter(key => key && key.trim().length > 0);

    if (this.apiKeys.length === 0) {
      logger.warn('[CerebrasApiKeyRotator] ⚠️ Aucune clé API Cerebras trouvée');
    } else {
      logger.info(`[CerebrasApiKeyRotator] ✅ ${this.apiKeys.length} clé(s) API configurée(s) pour rotation`);
    }
  }

  static getInstance(): CerebrasApiKeyRotator {
    if (!CerebrasApiKeyRotator.instance) {
      CerebrasApiKeyRotator.instance = new CerebrasApiKeyRotator();
    }
    return CerebrasApiKeyRotator.instance;
  }

  /**
   * Obtient la prochaine clé API (round-robin)
   */
  getNextApiKey(): string {
    if (this.apiKeys.length === 0) {
      return '';
    }

    const key = this.apiKeys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    
    return key;
  }

  /**
   * Obtient toutes les clés disponibles
   */
  getAllKeys(): string[] {
    return [...this.apiKeys];
  }

  /**
   * Vérifie si au moins une clé est disponible
   */
  hasKeys(): boolean {
    return this.apiKeys.length > 0;
  }
}

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
  async callWithMessages(
    messages: ChatMessage[],
    tools: Tool[],
    _synesiaCallables?: string[],
    _synesiaAgentDatasources?: import('../../types').LlmAgentDatasourceRef[]
  ): Promise<LLMResponse> {
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
    tools: Tool[],
    _synesiaCallables?: string[],
    _synesiaAgentDatasources?: import('../../types').LlmAgentDatasourceRef[]
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
      
      // ✅ Rotation automatique des clés API
      const rotator = CerebrasApiKeyRotator.getInstance();
      const apiKey = rotator.hasKeys() ? rotator.getNextApiKey() : this.config.apiKey;

      // Appel API avec streaming
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
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
   * ⚠️ CRITIQUE: Cerebras REQUIS qu'un message 'tool' soit précédé d'un message 'assistant' avec 'tool_calls'
   */
  private convertChatMessagesToApiFormat(messages: ChatMessage[]): CerebrasMessage[] {
    const result: CerebrasMessage[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      // ✅ Gérer les messages assistant
      if (msg.role === 'assistant') {
        const assistantMsg = msg as import('@/types/chat').AssistantMessage;
        
        // ✅ CRITIQUE: Si tool_calls existe, vérifier s'ils sont résolus
        if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
          // ✅ Cas 1: tool_results présents dans le champ → tool_calls résolus
          if (assistantMsg.tool_results && assistantMsg.tool_results.length > 0) {
            // ✅ Envoyer assistant SANS tool_calls (les tool_results suivent)
            const assistantMessage: CerebrasMessage = {
              role: 'assistant',
              content: typeof msg.content === 'string' ? msg.content : null
            };
            result.push(assistantMessage);
            
            // ✅ Transformer tool_results en messages tool
            for (const toolResult of assistantMsg.tool_results) {
              result.push({
                role: 'tool',
                tool_call_id: toolResult.tool_call_id,
                content: typeof toolResult.content === 'string' 
                  ? toolResult.content 
                  : JSON.stringify(toolResult.content ?? null)
              });
            }
            
            logger.dev(`[CerebrasProvider] ✅ Message assistant avec ${assistantMsg.tool_results.length} tool_results (dans champ)`);
            continue;
          }
          
          // ✅ Cas 2: Pas de tool_results dans le champ → vérifier s'il y a des messages tool qui suivent
          const followingToolMessages: ChatMessage[] = [];
          let j = i + 1;
          while (j < messages.length && messages[j].role === 'tool') {
            followingToolMessages.push(messages[j]);
            j++;
          }
          
          // ✅ Si des messages tool suivent → tool_calls résolus (messages tool séparés)
          if (followingToolMessages.length > 0) {
            // ✅ Envoyer assistant AVEC tool_calls
            const assistantMessage: CerebrasMessage = {
              role: 'assistant',
              content: typeof msg.content === 'string' ? msg.content : null,
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
            
            // ✅ Envoyer les messages tool qui suivent
            for (const toolMsg of followingToolMessages) {
              if (toolMsg.role !== 'tool') {
                continue;
              }
              
              const toolMessage = toolMsg as import('@/types/chat').ToolMessage;
              const toolCallId = toolMessage.tool_call_id;
              if (!toolCallId) {
                logger.warn(`[CerebrasProvider] ⚠️ Message tool sans tool_call_id, SKIP`);
                continue;
              }
              
              result.push({
                role: 'tool',
                tool_call_id: toolCallId,
                content: typeof toolMessage.content === 'string' 
                  ? toolMessage.content 
                  : (typeof toolMessage.content === 'object' && toolMessage.content !== null 
                    ? JSON.stringify(toolMessage.content) 
                    : String(toolMessage.content ?? ''))
              });
            }
            
            // ✅ Avancer l'index pour skip les messages tool qu'on vient de traiter
            i = j - 1; // -1 car le for va incrémenter
            
            logger.dev(`[CerebrasProvider] ✅ Message assistant avec ${assistantMsg.tool_calls.length} tool_calls + ${followingToolMessages.length} messages tool séparés`);
            continue;
          }
          
          // ✅ Cas 3: Pas de tool_results ET pas de messages tool suivants → SKIP (appel en cours)
          logger.warn(`[CerebrasProvider] ⚠️ SKIP message assistant avec ${assistantMsg.tool_calls.length} tool_calls non résolus (pas de tool_results ni messages tool suivants)`);
          continue;
        }
        
        // ✅ Message assistant sans tool_calls : envoyer normalement
        const assistantMessage: CerebrasMessage = {
          role: 'assistant',
          content: typeof msg.content === 'string' ? msg.content : null
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
          logger.warn(`[CerebrasProvider] ⚠️ SKIP message tool orphelin (pas d'assistant avec tool_calls précédent)`);
          continue;
        }
        // Sinon, le message tool a déjà été traité avec son assistant précédent
        continue;
      }
      
      // ✅ Messages user et system : envoyer normalement
      const messageObj: CerebrasMessage = {
        role: msg.role as 'user' | 'system',
        content: typeof msg.content === 'string' ? msg.content : null
      };
      result.push(messageObj);
    }
    
    return result;
  }

  /**
   * Prépare les messages pour l'API
   * ⚠️ Utilise convertChatMessagesToApiFormat pour gérer correctement tool_calls et tool messages
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]): CerebrasMessage[] {
    const messages: CerebrasMessage[] = [];

    // Message système avec contexte
    const systemContent = this.formatSystemMessage(context);
    messages.push({
      role: 'system',
      content: systemContent
    });

    // ✅ Utiliser convertChatMessagesToApiFormat pour gérer correctement tool_calls et tool messages
    // Cette méthode gère déjà les tool_results et les messages tool séparés
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
    // ✅ Rotation automatique des clés API
    const rotator = CerebrasApiKeyRotator.getInstance();
    const apiKey = rotator.hasKeys() ? rotator.getNextApiKey() : this.config.apiKey;

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
