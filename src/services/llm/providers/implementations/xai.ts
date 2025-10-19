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
  topP: 0.9,
  
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

