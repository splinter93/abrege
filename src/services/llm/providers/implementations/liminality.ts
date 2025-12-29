/**
 * Provider Liminality - Synesia LLM Exec API
 * 
 * Intégration de l'API Synesia LLM Exec avec support complet des tools avancés
 * (callable, knowledge, openapi, mcp) et orchestration automatique multi-tours.
 * 
 * Architecture:
 * - Hérite de BaseProvider pour la structure commune
 * - Implémente LLMProvider avec call(), callWithMessages(), callWithMessagesStream()
 * - Utilise LiminalityToolsAdapter pour convertir les tools Groq/xAI
 * - Support streaming SSE avec events riches (chunk, tool_call, tool_result)
 * - Orchestration automatique via config.max_loops
 */

import { BaseProvider, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import type { LLMResponse, ToolCall, Tool } from '../../types/strictTypes';
import { simpleLogger as logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';
import { LiminalityToolsAdapter } from '../adapters/LiminalityToolsAdapter';
import type { 
  LiminalityTool, 
  LiminalityLLMConfig, 
  LiminalityOrchestrationConfig,
  LiminalityMessage,
  LiminalityResponse,
  LiminalityStreamEvent,
  LiminalityRequestPayload,
  LiminalityToolCallInMessage
} from '../../types/liminalityTypes';

/**
 * Configuration spécifique à Liminality
 */
interface LiminalityProviderConfig extends ProviderConfig {
  maxLoops?: number;
}

/**
 * Usage tokens d'un appel LLM
 */
interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Type pour les chunks de streaming SSE
 */
interface StreamChunk {
  type?: 'delta';
  content?: string;
  tool_calls?: ToolCall[];
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  reasoning?: string;
  usage?: TokenUsage; // ✅ TYPÉ au lieu de unknown
}

/**
 * Informations sur le provider Liminality
 */
const LIMINALITY_INFO: ProviderInfo = {
  id: 'liminality',
  name: 'Liminality',
  version: '1.0.0',
  description: 'Synesia LLM Exec API with advanced tools orchestration',
  capabilities: {
    functionCalls: true,
    streaming: true,
    reasoning: true,
    codeExecution: true,
    webSearch: true,
    structuredOutput: true
  },
  supportedModels: [
    'gpt-4o-mini',
    'gpt-4o',
    'claude-3-haiku',
    'claude-3-sonnet',
    'claude-3-5-sonnet',
    'groq-llama-3-70b',
    'deepseek-chat',
    'fireworks/z-ai-glm-4-7',
    'openrouter/mimo-v2-flash:free',
    'openrouter/kimi-k2-thinking',
    'openrouter/glm-4.7',
    'openrouter/gemini-3-flash-preview',
    'openrouter/minimax-m2.1',
    'openrouter/qwen3-vl-30b-a3b-instruct'
  ],
  pricing: {
    input: 'Variable (depends on underlying model)',
    output: 'Variable (depends on underlying model)'
  }
};

/**
 * Configuration par défaut de Liminality
 */
const DEFAULT_CONFIG: LiminalityProviderConfig = {
  apiKey: process.env.LIMINALITY_API_KEY || '',
  baseUrl: 'https://origins-server.up.railway.app',
  timeout: 120000, // 120s (2 minutes) - permet tool calls longs et orchestration
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 8000,
  topP: 0.9,
  supportsFunctionCalls: true,
  supportsStreaming: true,
  supportsReasoning: true,
  enableLogging: true,
  enableMetrics: true,
  maxLoops: 10 // Orchestration automatique par défaut
};

/**
 * Provider Liminality pour l'API Synesia LLM Exec
 */
export class LiminalityProvider extends BaseProvider implements LLMProvider {
  readonly info = LIMINALITY_INFO;
  readonly config: LiminalityProviderConfig;

  // Implémentation de LLMProvider
  get name(): string {
    return this.info.name;
  }

  get id(): string {
    return this.info.id;
  }

  constructor(customConfig?: Partial<LiminalityProviderConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...customConfig };
    
    // 🔍 DEBUG: Vérifier la clé API
    if (!this.config.apiKey) {
      logger.error('[LiminalityProvider] ❌ API Key manquante! Vérifiez LIMINALITY_API_KEY dans .env.local');
    } else {
      logger.dev(`[LiminalityProvider] ✅ API Key chargée: ${this.config.apiKey.substring(0, 15)}...`);
    }
  }

  /**
   * Vérifie si Liminality est disponible
   */
  isAvailable(): boolean {
    return this.validateConfig();
  }

  /**
   * Valide la configuration de Liminality
   */
  validateConfig(): boolean {
    if (!this.validateBaseConfig()) {
      logger.error('[LiminalityProvider] ❌ Configuration de base invalide');
      return false;
    }

    if (!this.config.model) {
      logger.error('[LiminalityProvider] ❌ Modèle non spécifié');
      return false;
    }

    if (!this.info.supportedModels.includes(this.config.model)) {
      logger.warn(`[LiminalityProvider] ⚠️ Modèle ${this.config.model} non officiellement supporté`);
    }

    logger.dev('[LiminalityProvider] ✅ Configuration validée');
    return true;
  }

  /**
   * Effectue un appel à l'API Liminality (délègue à callWithMessages)
   */
  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('Liminality provider non configuré');
    }

    try {
      logger.dev(`[LiminalityProvider] 🚀 Appel avec modèle: ${this.config.model}`);

      // Préparer les messages
      const messages = this.prepareMessages(message, context, history);
      
      // Appeler avec les messages préparés
      return await this.callWithMessages(messages, []);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : 'No stack trace';
      
      logger.error('[LiminalityProvider] ❌ Erreur lors de l\'appel:', {
        message: errorMessage,
        stack: stack,
        rawError: error
      });
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Erreur inattendue dans LiminalityProvider: ${errorMessage}`);
      }
    }
  }

  /**
   * Effectue un appel à l'API Liminality avec une liste de messages déjà préparée
   */
  async callWithMessages(messages: ChatMessage[], tools: Tool[], synesiaCallables?: string[]): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('Liminality provider non configuré');
    }

    try {
      logger.dev(`[LiminalityProvider] 🚀 Appel avec ${messages.length} messages`);
      
      // Conversion des ChatMessage vers le format API Liminality
      const apiMessages = this.convertChatMessagesToApiFormat(messages);
      
      // Conversion des tools via l'adapter
      let liminalityTools = LiminalityToolsAdapter.convert(tools);
      
      // Ajouter les callables Synesia si fournis
      if (synesiaCallables && synesiaCallables.length > 0) {
        liminalityTools = LiminalityToolsAdapter.addSynesiaTools(liminalityTools, {
          callables: synesiaCallables,
        });
        logger.info(`[LiminalityProvider] 🔗 ${synesiaCallables.length} callables ajoutés aux tools`);
      }
      
      // Préparer le payload
      const payload = this.preparePayload(apiMessages, liminalityTools);
      
      logger.info(`[LiminalityProvider] 🚀 PAYLOAD → LIMINALITY: ${payload.model} | ${apiMessages.length} messages | ${liminalityTools.length} tools`);
      
      // Appel API
      const response = await this.makeApiCall(payload);
      
      // Extraire la réponse
      const result = this.extractResponse(response);
      
      logger.dev('[LiminalityProvider] ✅ Appel réussi');
      
      return {
        content: result.content || '',
        tool_calls: result.tool_calls || [],
        model: this.config.model,
        usage: result.usage,
        reasoning: result.reasoning
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[LiminalityProvider] ❌ Erreur lors de l\'appel:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * Streaming avec Server-Sent Events (SSE)
   */
  async *callWithMessagesStream(
    messages: ChatMessage[], 
    tools: Tool[],
    synesiaCallables?: string[]
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.isAvailable()) {
      throw new Error('Liminality provider non configuré');
    }

    try {
      logger.dev(`[LiminalityProvider] 🌊 Streaming avec ${messages.length} messages`);
      
      // Conversion des ChatMessage vers le format API
      const apiMessages = this.convertChatMessagesToApiFormat(messages);
      
      // Conversion des tools via l'adapter
      let liminalityTools = LiminalityToolsAdapter.convert(tools);
      
      // Ajouter les callables Synesia si fournis
      if (synesiaCallables && synesiaCallables.length > 0) {
        liminalityTools = LiminalityToolsAdapter.addSynesiaTools(liminalityTools, {
          callables: synesiaCallables,
        });
        logger.info(`[LiminalityProvider] 🔗 ${synesiaCallables.length} callables ajoutés aux tools`);
      }
      
      // Préparer le payload
      const payload = this.preparePayload(apiMessages, liminalityTools);
      
      logger.info(`[LiminalityProvider] 🚀 Stream call: ${payload.model} | ${apiMessages.length} messages | ${liminalityTools.length} tools`);
      
      // Appel API avec streaming
      const response = await fetch(`${this.config.baseUrl}/llm-exec/round/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Parser le body JSON si possible
        let errorDetails: { error?: string; statusCode?: number } = {};
        try {
          errorDetails = JSON.parse(errorText);
        } catch {
          // Si le parsing échoue, on garde errorText brut
        }
        
        const errorMessage = errorDetails.error || errorText;
        
        logger.error(`[LiminalityProvider] ❌ Erreur API Liminality Streaming:`, {
          statusCode: response.status,
          statusText: response.statusText,
          errorText: errorText,
          errorDetails: errorDetails,
          errorMessage,
          model: this.config.model,
          messagesCount: messages.length,
          toolsCount: tools.length,
          url: `${this.config.baseUrl}/llm-exec/round/stream`
        });
        
        const error = new Error(`Liminality API error: ${response.status} - ${errorMessage}`);
        (error as Error & { statusCode?: number; provider?: string }).statusCode = response.status;
        (error as Error & { statusCode?: number; provider?: string }).provider = 'liminality';
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
        
        if (done) break;

        // Décoder le chunk
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Garder la dernière ligne incomplète

        for (const line of lines) {
          const trimmed = line.trim();
          
          // Ignorer les lignes vides et les commentaires
          if (!trimmed || trimmed.startsWith(':')) {
            continue;
          }

          // Parser les lignes SSE (format "data: {...}")
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6); // Enlever "data: "
            
            if (data === '[DONE]') break;

            try {
              // ✅ VALIDATION : Vérifier taille avant parsing (sécurité)
              const MAX_EVENT_SIZE = 10 * 1024 * 1024; // 10MB max
              if (data.length > MAX_EVENT_SIZE) {
                logger.error('[LiminalityProvider] ❌ Event trop volumineux', {
                  size: data.length,
                  maxSize: MAX_EVENT_SIZE
                });
                continue;
              }
              
              const event = JSON.parse(data) as LiminalityStreamEvent;
              const chunk = this.convertStreamEvent(event);
              
              if (chunk) {
                yield chunk;
              }

            } catch (parseError) {
              // ✅ ERROR HANDLING : Logger avec contexte complet
              logger.error('[LiminalityProvider] ❌ Erreur parsing SSE event', {
                error: parseError instanceof Error ? parseError.message : String(parseError),
                dataPreview: data.substring(0, 200), // Premiers 200 caractères
                dataLength: data.length
              });
              continue; // Ignorer l'event invalide et continuer le stream
            }
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[LiminalityProvider] ❌ Erreur streaming:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * Prépare les messages avec le system message
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]): ChatMessage[] {
    const systemMessage = getSystemMessage('assistant-contextual', { context });
    
    const messages: ChatMessage[] = [
      {
        id: 'system',
        role: 'system',
        content: systemMessage
      } as ChatMessage,
      ...history.slice(-10), // Garder les 10 derniers messages
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message
      } as ChatMessage
    ];
    
    return messages;
  }

  /**
   * Convertit les ChatMessage vers le format API Liminality
   */
  private convertChatMessagesToApiFormat(messages: ChatMessage[]): LiminalityMessage[] {
    return messages.map((msg) => {
      const limMsg: LiminalityMessage = {
        role: this.mapRole(msg.role),
        content: msg.content || ''
      };

      // Ajouter tool_calls si présents (assistant messages uniquement)
      if (msg.role === 'assistant') {
        const assistantMsg = msg as import('@/types/chat').AssistantMessage;
        if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
          // ✅ ERROR HANDLING : Parser avec try/catch pour chaque tool call
          limMsg.tool_calls = assistantMsg.tool_calls.map(tc => {
            let parsedArguments: Record<string, unknown> = {};
            
            if (typeof tc.function?.arguments === 'string') {
              try {
                parsedArguments = JSON.parse(tc.function.arguments);
              } catch (parseError) {
                logger.warn('[LiminalityProvider] ⚠️ Erreur parsing tool call arguments', {
                  toolCallId: tc.id,
                  toolName: tc.function?.name,
                  error: parseError instanceof Error ? parseError.message : String(parseError),
                  argumentsPreview: tc.function.arguments.substring(0, 100)
                });
                parsedArguments = {}; // Fallback : arguments vides
              }
            } else if (tc.function?.arguments && typeof tc.function.arguments === 'object') {
              parsedArguments = tc.function.arguments as Record<string, unknown>;
            }
            
            return {
              id: tc.id,
              name: tc.function?.name || '',
              arguments: parsedArguments
            };
          });
        }

        // Ajouter reasoning si présent
        if (assistantMsg.reasoning) {
          limMsg.reasoning = assistantMsg.reasoning;
        }
      }

      // Formatter correctement les tool_response messages selon le format Synesia
      if (msg.role === 'tool') {
        const toolMsg = msg as import('@/types/chat').ToolMessage;
        
        if (toolMsg.tool_call_id) {
          // Format Synesia : tool_calls en array
          limMsg.tool_calls = [{
            tool_call_id: toolMsg.tool_call_id,
            content: limMsg.content,
            tool_name: toolMsg.name
          }];
          delete limMsg.content;
        } else {
          logger.error(`[LiminalityProvider] ❌ Tool message sans tool_call_id`);
        }
      }

      return limMsg;
    });
  }

  /**
   * Mappe les rôles ChatMessage vers les rôles Liminality
   */
  private mapRole(role: string): LiminalityMessage['role'] {
    switch (role) {
      case 'user':
        return 'user';
      case 'assistant':
        return 'assistant';
      case 'system':
        return 'system';
      case 'tool':
        return 'tool_response';
      default:
        return 'user';
    }
  }

  /**
   * Prépare le payload pour l'API Liminality
   */
  private preparePayload(
    messages: LiminalityMessage[],
    tools: LiminalityTool[]
  ): LiminalityRequestPayload {
    const llmConfig: LiminalityLLMConfig = {
      temperature: this.config.temperature,
      max_completion_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      tool_choice: 'auto',
      parallel_tool_calls: false // Désactivé pour éviter les problèmes
    };

    const orchestrationConfig: LiminalityOrchestrationConfig = {
      max_loops: this.config.maxLoops || 10
    };

    const payload: LiminalityRequestPayload = {
      model: this.config.model,
      messages,
      llmConfig,
      config: orchestrationConfig
    };

    // Ajouter les tools si présents
    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    return payload;
  }

  /**
   * Effectue l'appel API vers Liminality
   */
  private async makeApiCall(payload: LiminalityRequestPayload): Promise<LiminalityResponse> {
    const url = `${this.config.baseUrl}/llm-exec/round`;
    
    // 🔍 DEBUG: Log de la requête
    logger.dev('[LiminalityProvider] 📤 Requête API:', {
      url,
      model: payload.model,
      hasApiKey: !!this.config.apiKey,
      apiKeyPrefix: this.config.apiKey ? this.config.apiKey.substring(0, 15) + '...' : 'MISSING'
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      let errorDetails: { error?: string } = {};
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        // Ignore
      }
      
      const errorMessage = errorDetails.error || errorText;
      throw new Error(`Liminality API error: ${response.status} - ${errorMessage}`);
    }

    return response.json();
  }

  /**
   * Extrait la réponse de l'API Liminality
   */
  private extractResponse(response: LiminalityResponse): {
    content: string;
    tool_calls: ToolCall[];
    usage: LLMResponse['usage'];
    reasoning?: string;
  } {
    const message = response.message;

    // Convertir tool_calls Liminality vers format ToolCall
    const toolCalls: ToolCall[] = [];
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const tc of message.tool_calls) {
        // Ne traiter que les tool_request (avec id, name, arguments)
        // Les tool_response (avec tool_call_id, content) sont ignorés ici
        if (tc.id && tc.name) {
          toolCalls.push({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          });
        }
      }
    }

    return {
      content: message.content || '',
      tool_calls: toolCalls,
      usage: response.usage,
      reasoning: message.reasoning
    };
  }

  /**
   * Type guard pour valider un LiminalityStreamEvent
   */
  private isValidLiminalityStreamEvent(event: unknown): event is LiminalityStreamEvent {
    if (!event || typeof event !== 'object') {
      return false;
    }
    const e = event as Record<string, unknown>;
    const validTypes = ['start', 'text.delta', 'chunk', 'text.done', 'tool_block.start', 'tool_block.done', 'done', 'tool_call', 'tool_result', 'end', 'error'];
    return typeof e.type === 'string' && validTypes.includes(e.type);
  }

  /**
   * Type guard pour valider un LiminalityToolCallInMessage
   */
  private isValidLiminalityToolCall(tc: unknown): tc is LiminalityToolCallInMessage {
    if (!tc || typeof tc !== 'object') {
      return false;
    }
    const toolCall = tc as Record<string, unknown>;
    const hasValidId = typeof toolCall.id === 'string';
    const hasValidName = typeof toolCall.name === 'string';
    const hasValidArguments = typeof toolCall.arguments === 'string' || 
                              (toolCall.arguments !== null && 
                               toolCall.arguments !== undefined && 
                               typeof toolCall.arguments === 'object');
    return hasValidId && hasValidName && hasValidArguments;
  }

  /**
   * Convertit un event de stream Liminality vers le format StreamChunk
   * 
   * @param event - Event Liminality validé
   * @returns StreamChunk ou null si event ignoré
   * @throws {Error} Si event invalide
   */
  private convertStreamEvent(event: unknown): StreamChunk | null {
    // ✅ VALIDATION STRICTE : Type guard
    if (!this.isValidLiminalityStreamEvent(event)) {
      logger.error('[LiminalityProvider] ❌ Event invalide reçu', { 
        event: typeof event === 'object' ? JSON.stringify(event) : String(event)
      });
      throw new Error('Invalid Liminality stream event: missing or invalid type');
    }
    switch (event.type) {
      case 'start':
        // Event de démarrage, on ne yield rien
        return null;

      case 'text.delta':
        // ✅ Format réel de Liminality : text.delta avec "delta"
        return {
          type: 'delta',
          content: event.delta || ''
        };

      case 'chunk':
        // Chunk de contenu (ancien format)
        return {
          type: 'delta',
          content: event.content || ''
        };

      case 'text.done':
        // Fin du texte (on peut ignorer, on a déjà tout via les deltas)
        return null;

      case 'tool_block.start':
        // ✅ Début d'un tool call
        logger.dev(`[LiminalityProvider] 🔧 Tool call start: ${event.block_id}`);
        return null;

      case 'tool_block.done':
        // ✅ Fin d'un tool call (on verra les tool_calls dans le 'done')
        logger.dev(`[LiminalityProvider] ✅ Tool call done: ${event.block_id}`);
        return null;

      case 'done':
        // ✅ Fin du stream avec usage et éventuels tool calls
        // Extraire les tool calls du dernier message si présent
        const lastMessage = event.messages?.[event.messages.length - 1];
        
        if (lastMessage?.role === 'tool_request' && Array.isArray(lastMessage?.tool_calls) && lastMessage.tool_calls.length > 0) {
          logger.info(`[LiminalityProvider] 🔧 Tool calls détectés: ${lastMessage.tool_calls.length}`);
          
          // ✅ VALIDATION STRICTE : Filtrer et valider chaque tool call
          const validToolCalls = lastMessage.tool_calls
            .filter((tc): tc is LiminalityToolCallInMessage => this.isValidLiminalityToolCall(tc));
          
          if (validToolCalls.length !== lastMessage.tool_calls.length) {
            const invalidCount = lastMessage.tool_calls.length - validToolCalls.length;
            logger.warn(`[LiminalityProvider] ⚠️ ${invalidCount} tool call(s) invalide(s) filtré(s)`, {
              total: lastMessage.tool_calls.length,
              valid: validToolCalls.length
            });
          }
          
          // ✅ CONVERSION SÉCURISÉE : Type safety garantie
          const toolCalls: ToolCall[] = validToolCalls.map((tc) => {
            let argumentsString: string;
            try {
              argumentsString = typeof tc.arguments === 'string' 
                ? tc.arguments 
                : JSON.stringify(tc.arguments);
            } catch (stringifyError) {
              logger.error('[LiminalityProvider] ❌ Erreur sérialisation arguments tool call', {
                toolCallId: tc.id,
                toolName: tc.name,
                error: stringifyError instanceof Error ? stringifyError.message : String(stringifyError)
              });
              // Fallback : arguments vides plutôt que crash
              argumentsString = '{}';
            }
            
            return {
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: argumentsString
              }
            };
          });
          
          // ✅ VALIDATION STRICTE : event.complete peut être undefined
          const isComplete = event.complete === true;
          
          return {
            type: 'delta',
            tool_calls: toolCalls,
            finishReason: isComplete ? 'stop' : 'tool_calls',
            usage: event.usage
          };
        }
        
        return {
          type: 'delta',
          finishReason: 'stop',
          usage: event.usage
        };

      case 'tool_call':
        // Tool call en cours (ancien format)
        logger.dev(`[LiminalityProvider] 🔧 Tool call: ${event.tool_name}`);
        return {
          type: 'delta',
          content: `[Exécution: ${event.tool_name}]\n`
        };

      case 'tool_result':
        // Résultat de tool (ancien format)
        logger.dev(`[LiminalityProvider] ✅ Tool result: ${event.tool_name}`);
        return {
          type: 'delta',
          content: '' // Ne pas afficher le résultat brut
        };

      case 'end':
        // Fin du stream avec usage (ancien format)
        return {
          type: 'delta',
          finishReason: 'stop',
          usage: event.usage
        };

      case 'error':
        // Erreur pendant le stream
        logger.error(`[LiminalityProvider] ❌ Stream error:`, event.error);
        throw new Error(event.error?.message || 'Stream error');

      default:
        return null;
    }
  }

  /**
   * Récupère les capacités du provider
   */
  getCapabilities() {
    return this.info.capabilities;
  }

  /**
   * Récupère les modèles supportés
   */
  getSupportedModels() {
    return this.info.supportedModels;
  }

  /**
   * Récupère le pricing
   */
  getPricing() {
    return this.info.pricing;
  }
}

