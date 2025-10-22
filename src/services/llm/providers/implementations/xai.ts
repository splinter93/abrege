import { BaseProvider, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import { simpleLogger as logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';
import type {
  LLMResponse,
  ToolCall,
  Tool,
  Usage
} from '../../types/strictTypes';

/**
 * Configuration spécifique à xAI (Grok)
 */
interface XAIConfig extends ProviderConfig {
  // Spécifique à xAI
  reasoningMode?: 'fast' | 'reasoning';
  parallelToolCalls?: boolean;
}

/**
 * ✅ Types pour streaming SSE
 */
export interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  content?: string;
  tool_calls?: ToolCall[];
  reasoning?: string;
  usage?: Usage;
  error?: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null; // ✅ IMPORTANT pour détecter fin
}

/**
 * Chunk SSE reçu de l'API xAI (format OpenAI)
 */
interface XAIStreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
      reasoning?: string;
    };
    finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage?: Usage;
}

/**
 * Informations sur xAI
 */
const XAI_INFO: ProviderInfo = {
  id: 'xai',
  name: 'xAI (Grok)',
  version: '1.0.0',
  description: 'xAI Grok models with fast inference and advanced reasoning capabilities',
  capabilities: {
    functionCalls: true,
    streaming: true,
    reasoning: true,
    codeExecution: false,
    webSearch: false,
    structuredOutput: true,
    images: true // ✅ Support natif des images (jpg/jpeg/png, max 20 Mo)
  },
  supportedModels: [
    'grok-4-fast',           // Production: Ultra-fast inference
    'grok-4-fast-reasoning', // Production: Advanced reasoning
    'grok-beta',             // Beta access
    'grok-vision-beta'       // Vision model (beta)
  ],
  pricing: {
    input: '$0.20/1M tokens',
    output: '$0.50/1M tokens'
  }
};

/**
 * Configuration par défaut de xAI
 */
const DEFAULT_XAI_CONFIG: XAIConfig = {
  // Base
  apiKey: process.env.XAI_API_KEY || '',
  baseUrl: 'https://api.x.ai/v1',
  timeout: 30000,
  
  // LLM
  model: 'grok-4-fast', // Modèle par défaut: ultra-rapide
  temperature: 0.7,
  maxTokens: 8000,
  topP: 0.85, // ✅ Réduit légèrement pour éviter hallucinations sporadiques
  
  // Features
  supportsFunctionCalls: true,
  supportsStreaming: true,
  supportsReasoning: true,
  
  // Monitoring
  enableLogging: true,
  enableMetrics: true,
  
  // xAI spécifique
  reasoningMode: 'fast',
  parallelToolCalls: true
};

/**
 * Content pour les messages avec images
 */
interface XAIMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

/**
 * Message pour l'API xAI (format OpenAI)
 */
interface XAIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null | XAIMessageContent[]; // Support multi-part pour images
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/**
 * Réponse de l'API xAI Chat Completions
 */
interface XAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: ToolCall[];
      reasoning?: string; // Pour le mode reasoning
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage: Usage;
}

/**
 * Provider xAI pour les modèles Grok
 * 
 * Compatible OpenAI API avec function calling natif
 * Support du mode reasoning avancé avec grok-4-fast-reasoning
 */
export class XAIProvider extends BaseProvider implements LLMProvider {
  readonly info = XAI_INFO;
  readonly config: XAIConfig;

  // Implémentation de LLMProvider
  get name(): string {
    return this.info.name;
  }

  get id(): string {
    return this.info.id;
  }

  constructor(customConfig?: Partial<XAIConfig>) {
    super();
    this.config = { ...DEFAULT_XAI_CONFIG, ...customConfig };
  }

  /**
   * Vérifie si xAI est disponible
   */
  isAvailable(): boolean {
    return this.validateConfig();
  }

  /**
   * Valide la configuration de xAI
   */
  validateConfig(): boolean {
    if (!this.validateBaseConfig()) {
      logger.error('[XAIProvider] ❌ Configuration de base invalide');
      return false;
    }

    if (!this.config.model) {
      logger.error('[XAIProvider] ❌ Modèle non spécifié');
      return false;
    }

    if (!this.info.supportedModels.includes(this.config.model)) {
      logger.warn(`[XAIProvider] ⚠️ Modèle ${this.config.model} non officiellement supporté`);
    }

    logger.dev('[XAIProvider] ✅ Configuration validée');
    return true;
  }

  /**
   * Effectue un appel à l'API xAI avec support des function calls
   */
  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('xAI provider non configuré');
    }

    try {
      logger.dev(`[XAIProvider] 🚀 Appel avec modèle: ${this.config.model}`);

      // Vérifier si le streaming est activé
      if (this.config.supportsStreaming) {
        throw new Error('Streaming non supporté dans le provider xAI - utilisez la route API directement');
      }

      // Préparer les messages
      const messages = this.prepareMessages(message, context, history);
      
      // Préparer le payload
      const payload = await this.preparePayload(messages, []);
      payload.stream = false;
      
      // Effectuer l'appel API
      const response = await this.makeApiCall(payload);
      
      // Extraire la réponse
      const result = this.extractResponse(response);
      
      logger.dev('[XAIProvider] ✅ Appel réussi');
      
      return result.content || '';

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : 'No stack trace';
      
      logger.error('[XAIProvider] ❌ Erreur lors de l\'appel:', {
        message: errorMessage,
        stack: stack
      });
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Erreur inattendue dans XAIProvider: ${errorMessage}`);
      }
    }
  }

  /**
   * Effectue un appel à l'API xAI avec une liste de messages déjà préparée
   * Optimisé pour l'orchestrateur avec tool calls
   */
  async callWithMessages(messages: ChatMessage[], tools: Tool[]): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('xAI provider non configuré');
    }

    try {
      logger.dev(`[XAIProvider] 🚀 Appel Chat Completions avec ${messages.length} messages`);
      
      // Conversion des ChatMessage vers le format API
      const apiMessages = this.convertChatMessagesToApiFormat(messages);
      const payload = await this.preparePayload(apiMessages, tools);
      payload.stream = false;
      
      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);
      
      logger.dev('[XAIProvider] ✅ Appel Chat Completions réussi');
      
      return {
        content: result.content || '',
        tool_calls: result.tool_calls || [],
        model: result.model,
        usage: result.usage,
        reasoning: result.reasoning
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[XAIProvider] ❌ Erreur lors de l\'appel:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * ✅ NOUVEAU : Streaming avec Server-Sent Events (SSE)
   * Compatible avec xAI API (format OpenAI)
   */
  async *callWithMessagesStream(
    messages: ChatMessage[], 
    tools: Tool[]
  ): AsyncGenerator<StreamChunk, void, unknown> {
    if (!this.isAvailable()) {
      throw new Error('xAI provider non configuré');
    }

    try {
      logger.dev(`[XAIProvider] 🌊 Streaming Chat Completions avec ${messages.length} messages`);
      
      // ✅ AUDIT DÉTAILLÉ : Logger les messages d'entrée
      logger.dev(`[XAIProvider] 📋 MESSAGES D'ENTRÉE:`, {
        count: messages.length,
        roles: messages.map(m => m.role),
        hasToolCalls: messages.some(m => m.tool_calls && m.tool_calls.length > 0),
        hasToolResults: messages.some(m => m.tool_results && m.tool_results.length > 0)
      });
      
      // Conversion des ChatMessage vers le format API
      const apiMessages = this.convertChatMessagesToApiFormat(messages);
      const payload = await this.preparePayload(apiMessages, tools);
      payload.stream = true; // ✅ Activer streaming
      
      // ✅ AUDIT DÉTAILLÉ : Logger le payload complet envoyé à Grok
      logger.info(`[XAIProvider] 🚀 PAYLOAD → GROK: ${payload.model} | ${payload.messages?.length} messages | ${payload.tools?.length || 0} tools`);
      
      // ✅ AUDIT DÉTAILLÉ : Logger les messages du payload
      if (payload.messages && Array.isArray(payload.messages)) {
        payload.messages.forEach((msg, index) => {
          logger.dev(`[XAIProvider] 📝 Message ${index + 1}:`, {
            role: msg.role,
            contentLength: typeof msg.content === 'string' ? msg.content.length : 'multi-part',
            hasToolCalls: !!msg.tool_calls,
            toolCallsCount: msg.tool_calls?.length || 0,
            hasToolCallId: !!msg.tool_call_id
          });
        });
      }
      
      // ✅ AUDIT DÉTAILLÉ : Logger les tools
      if (payload.tools && Array.isArray(payload.tools)) {
        logger.dev(`[XAIProvider] 🔧 TOOLS ENVOYÉS:`, {
          count: payload.tools.length,
          names: payload.tools.map(t => t.function?.name || 'unknown')
        });
      }
      
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
        throw new Error(`xAI API Error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // ✅ AUDIT DÉTAILLÉ : Logger la réponse HTTP
      logger.dev(`[XAIProvider] 📡 RÉPONSE HTTP REÇUE:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Lire le stream SSE
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          logger.dev(`[XAIProvider] ✅ Stream terminé après ${chunkCount} chunks`);
          break;
        }

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
            
            // Fin du stream
            if (data === '[DONE]') {
              logger.dev('[XAIProvider] 🏁 Stream [DONE] reçu');
              break;
            }

            try {
              const parsed = JSON.parse(data) as XAIStreamChunk;
              chunkCount++;
              
              // ✅ AUDIT DÉTAILLÉ : Logger chaque chunk reçu de Grok
              logger.dev(`[XAIProvider] 📦 CHUNK ${chunkCount} REÇU DE GROK:`, {
                id: parsed.id,
                model: parsed.model,
                hasChoices: !!parsed.choices,
                choicesCount: parsed.choices?.length || 0,
                hasUsage: !!parsed.usage
              });
              
              // Extraire les informations du chunk
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              const finishReason = choice.finish_reason;
              
              // ✅ AUDIT DÉTAILLÉ : Logger le contenu du chunk
              logger.dev(`[XAIProvider] 📝 CHUNK CONTENU:`, {
                hasContent: !!delta.content,
                contentLength: delta.content?.length || 0,
                hasToolCalls: !!delta.tool_calls,
                toolCallsCount: delta.tool_calls?.length || 0,
                hasReasoning: !!delta.reasoning,
                reasoningLength: delta.reasoning?.length || 0,
                finishReason: finishReason
              });
              
              // ✅ AUDIT DÉTAILLÉ : Logger les tool calls si présents
              if (delta.tool_calls && delta.tool_calls.length > 0) {
                delta.tool_calls.forEach((tc, index) => {
                  logger.dev(`[XAIProvider] 🔧 TOOL CALL ${index + 1} DANS CHUNK:`, {
                    id: tc.id,
                    type: tc.type,
                    functionName: tc.function?.name,
                    argumentsLength: tc.function?.arguments?.length || 0
                  });
                });
              }
              
              const chunk: StreamChunk = {
                type: 'delta'
              };

              // Content
              if (delta.content) {
                chunk.content = delta.content;
              }

              // Tool calls (peuvent venir en plusieurs chunks)
              if (delta.tool_calls && delta.tool_calls.length > 0) {
                chunk.tool_calls = delta.tool_calls.map(tc => ({
                  id: tc.id || '',
                  type: 'function' as const,
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || ''
                  }
                }));
              }

              // Reasoning (si supporté)
              if (delta.reasoning) {
                chunk.reasoning = delta.reasoning;
              }

              // Usage (dans le dernier chunk)
              if (parsed.usage) {
                chunk.usage = parsed.usage;
              }

              // ✅ IMPORTANT : finish_reason indique la fin du stream
              // 'tool_calls' = Le LLM veut appeler des tools
              // 'stop' = Réponse complète normale
              if (finishReason) {
                chunk.finishReason = finishReason;
                logger.dev(`[XAIProvider] 🏁 FINISH REASON: ${finishReason}`);
              }

              yield chunk;

            } catch (parseError) {
              logger.warn('[XAIProvider] ⚠️ Erreur parsing chunk SSE:', parseError);
              continue;
            }
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[XAIProvider] ❌ Erreur streaming:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * Convertit les ChatMessage vers le format API xAI
   */
  private convertChatMessagesToApiFormat(messages: ChatMessage[]): XAIMessage[] {
    return messages.map(msg => {
      const messageObj: XAIMessage = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: msg.content
      };

      // Gérer les tool calls pour les messages assistant
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        messageObj.tool_calls = msg.tool_calls as ToolCall[];
      }

      // Gérer les tool results pour les messages tool
      if (msg.role === 'tool' && msg.tool_call_id) {
        messageObj.tool_call_id = msg.tool_call_id;
        if (msg.name) {
          messageObj.name = msg.name;
        }
      }

      return messageObj;
    });
  }

  /**
   * Prépare les messages pour l'API
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]): XAIMessage[] {
    const messages: XAIMessage[] = [];

    // Message système avec contexte
    const systemContent = this.formatSystemMessage(context);
    messages.push({
      role: 'system',
      content: systemContent
    });

    // Historique des messages
    for (const msg of history) {
      const messageObj: XAIMessage = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: msg.content
      };

      // Gérer les tool calls pour les messages assistant
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        messageObj.tool_calls = msg.tool_calls as ToolCall[];
      }

      // Gérer les tool results pour les messages tool
      if (msg.role === 'tool' && msg.tool_call_id) {
        messageObj.tool_call_id = msg.tool_call_id;
        if (msg.name) {
          messageObj.name = msg.name;
        }
      }

      messages.push(messageObj);

      // Transformer `tool_results` (si présents) en messages `tool` séparés
      if (msg.role === 'assistant' && msg.tool_results && msg.tool_results.length > 0) {
        for (const result of msg.tool_results) {
          messages.push({
            role: 'tool',
            tool_call_id: result.tool_call_id,
            name: result.name,
            content: typeof result.content === 'string' ? result.content : JSON.stringify(result.content ?? null),
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
   * Prépare le payload pour l'API xAI avec support des tools
   */
  private async preparePayload(messages: XAIMessage[], tools: Tool[]): Promise<Record<string, unknown>> {
    // Nettoyer les messages (supprimer id et timestamp)
    const cleanedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      ...(msg.name && { name: msg.name })
    }));

    const payload: Record<string, unknown> = {
      model: this.config.model,
      messages: cleanedMessages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      stream: false
    };

    // Ajouter les tools si présents
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
      
      // ✅ DEBUG: Logger les tools pour identifier le problème
      logger.dev(`[XAIProvider] 🔧 Envoi de ${tools.length} tools à xAI`);
      logger.dev(`[XAIProvider] 📋 Premier tool:`, JSON.stringify(tools[0], null, 2));
    }

    // Ajouter parallel_tool_calls si configuré
    if (this.config.parallelToolCalls !== undefined) {
      payload.parallel_tool_calls = this.config.parallelToolCalls;
    }
    
    return payload;
  }

  /**
   * Effectue l'appel API à xAI
   */
  private async makeApiCall(payload: Record<string, unknown>): Promise<XAIChatCompletionResponse> {
    // ✅ DEBUG TEMPORAIRE : Logger le payload complet
    if (payload.tools && Array.isArray(payload.tools)) {
      logger.dev(`[XAIProvider] 🔍 PAYLOAD DEBUG - ${payload.tools.length} tools à envoyer`);
      logger.dev(`[XAIProvider] 📋 Payload tools (sample 2):`, JSON.stringify(payload.tools.slice(0, 2), null, 2));
    }

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
      
      // Parser l'erreur pour plus de détails
      interface XAIError {
        error?: {
          message?: string;
          type?: string;
          code?: string;
        };
      }
      
      let errorDetails: XAIError = {};
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { error: { message: errorText } };
      }
      
      logger.error('[XAIProvider] ❌ Erreur API xAI:', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails
      });
      
      throw new Error(`xAI API error: ${response.status} - ${errorDetails.error?.message || errorText}`);
    }

    const responseData = await response.json() as XAIChatCompletionResponse;
    
    logger.dev('[XAIProvider] 🔍 Réponse brute de l\'API xAI:', {
      hasChoices: 'choices' in responseData,
      choicesCount: responseData?.choices?.length || 0,
      hasContent: !!responseData?.choices?.[0]?.message?.content,
      hasToolCalls: !!responseData?.choices?.[0]?.message?.tool_calls,
      hasReasoning: !!responseData?.choices?.[0]?.message?.reasoning
    });
    
    return responseData;
  }

  /**
   * Extrait la réponse de l'API xAI avec support des tool calls
   */
  private extractResponse(response: XAIChatCompletionResponse): LLMResponse {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Réponse invalide de xAI API');
    }

    const choice = response.choices[0];
    const result: LLMResponse = {
      content: choice?.message?.content ?? '',
      model: response.model,
      usage: response.usage
    };

    // Ajouter les tool calls si présents
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      result.tool_calls = choice.message.tool_calls;
      logger.dev(`[XAIProvider] 🔧 ${result.tool_calls.length} tool calls détectés`);
      
      result.tool_calls.forEach((toolCall, index) => {
        logger.dev(`[XAIProvider] Tool call ${index + 1}: ${toolCall.function.name}`);
      });
    }

    // Ajouter le reasoning si présent (mode grok-4-fast-reasoning)
    if (choice?.message?.reasoning) {
      result.reasoning = choice.message.reasoning;
      logger.dev(`[XAIProvider] 🧠 Reasoning détecté (${result.reasoning.length} chars)`);
    }

    return result;
  }

  /**
   * Formate le message système avec le contexte
   */
  private formatSystemMessage(context: AppContext): string {
    // Si le contexte contient déjà des instructions système
    if (context.content && context.content.trim().length > 0) {
      logger.dev(`[XAIProvider] 🎯 Utilisation des instructions système fournies (${context.content.length} chars)`);
      return context.content;
    }

    // Fallback vers le système de templates existant
    const message = getSystemMessage('assistant-contextual', { context });
    if (!message) {
      return 'Tu es un assistant IA utile et bienveillant.';
    }
    
    logger.dev(`[XAIProvider] ⚙️ Utilisation du template par défaut`);
    return message;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): Tool[] {
    // Les tools sont gérés par l'orchestrateur
    return [];
  }

  /**
   * Test de connexion avec xAI
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.dev('[XAIProvider] 🧪 Test de connexion avec xAI...');
      
      // Test simple avec un message minimal
      const testPayload = {
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        max_tokens: 10,
        temperature: 0
      };

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      logger.dev('[XAIProvider] ✅ Connexion réussie');
      return true;
      
    } catch (error) {
      logger.error('[XAIProvider] ❌ Erreur de connexion:', error);
      return false;
    }
  }

  /**
   * Test d'appel avec function calls
   */
  async testFunctionCalls(tools: Tool[]): Promise<boolean> {
    try {
      logger.dev('[XAIProvider] 🧪 Test d\'appel avec function calls...');
      
      const messages: XAIMessage[] = [
        {
          role: 'system',
          content: getSystemMessage('assistant-tools')
        },
        {
          role: 'user',
          content: 'Crée une note intitulée "Test xAI Grok" dans le classeur "main-notebook"'
        }
      ];

      const payload = {
        model: this.config.model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        top_p: this.config.topP
      };

      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);
      
      if (result.tool_calls && result.tool_calls.length > 0) {
        logger.dev(`[XAIProvider] ✅ Function calls testés avec succès - ${result.tool_calls.length} tool calls`);
        return true;
      } else {
        logger.dev('[XAIProvider] ⚠️ Aucun tool call détecté dans la réponse');
        return false;
      }
    } catch (error) {
      logger.error('[XAIProvider] ❌ Erreur lors du test des function calls:', error);
      return false;
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Appel avec support d'images
   * 
   * @param text - Texte du message
   * @param images - URLs ou base64 des images
   * @param options - Options (detail, temperature, etc.)
   * @param history - Historique des messages
   * @param tools - Tools disponibles
   */
  async callWithImages(
    text: string,
    images: Array<{
      url: string;
      detail?: 'auto' | 'low' | 'high';
    }>,
    options: {
      systemMessage?: string;
      temperature?: number;
      maxTokens?: number;
      detail?: 'auto' | 'low' | 'high';
    } = {},
    history: ChatMessage[] = [],
    tools: Tool[] = []
  ): Promise<LLMResponse> {
    if (!this.isAvailable()) {
      throw new Error('xAI provider non configuré');
    }

    try {
      logger.dev(`[XAIProvider] 🖼️ Appel avec ${images.length} image(s)`);

      // Construire le content multi-part
      const contentParts: XAIMessageContent[] = [
        {
          type: 'text',
          text: text
        }
      ];

      // Ajouter les images
      for (const image of images) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: image.url,
            detail: image.detail || options.detail || 'auto'
          }
        });
      }

      // Construire les messages
      const messages: XAIMessage[] = [];

      // Message système si fourni
      if (options.systemMessage) {
        messages.push({
          role: 'system',
          content: options.systemMessage
        });
      }

      // Ajouter l'historique
      for (const msg of history) {
        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
          content: msg.content
        });
      }

      // Message utilisateur avec images
      messages.push({
        role: 'user',
        content: contentParts
      });

      // Préparer le payload
      const payload: Record<string, unknown> = {
        model: this.config.model,
        messages: messages,
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens ?? this.config.maxTokens,
        top_p: this.config.topP,
        stream: false
      };

      // Ajouter les tools si présents
      if (tools && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      // Appel API
      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);

      logger.dev('[XAIProvider] ✅ Appel avec images réussi');

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[XAIProvider] ❌ Erreur lors de l\'appel avec images:', { message: errorMessage });
      throw error;
    }
  }

  /**
   * ✅ HELPER : Créer un message avec images
   * 
   * Utilitaire pour faciliter la création de messages multi-part avec images
   */
  static createMessageWithImages(
    text: string,
    imageUrls: string[],
    detail: 'auto' | 'low' | 'high' = 'auto'
  ): XAIMessage {
    const contentParts: XAIMessageContent[] = [
      {
        type: 'text',
        text: text
      }
    ];

    for (const url of imageUrls) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: url,
          detail: detail
        }
      });
    }

    return {
      role: 'user',
      content: contentParts
    };
  }

  /**
   * ✅ HELPER : Encoder une image en base64 depuis un buffer
   */
  static encodeImageToBase64(buffer: Buffer, mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'): string {
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  }
}

