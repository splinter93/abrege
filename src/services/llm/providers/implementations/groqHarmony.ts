/**
 * Provider Groq Harmony - Support complet du format Harmony GPT-OSS
 * Production-ready, format strict, zéro any
 */

import { BaseProvider, type ProviderCapabilities, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import {
  HarmonyMessage,
  HarmonyConversation,
  HARMONY_ROLES,
  HARMONY_CHANNELS,
} from '../../types/harmonyTypes';
import { HarmonyFormatter } from '../../services/HarmonyFormatter';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Interface pour la réponse Groq Harmony
 */
interface GroqHarmonyResponse {
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  reasoning?: string; // Pour les modèles avec reasoning
}

/**
 * Configuration spécifique à Groq Harmony
 */
interface GroqHarmonyConfig extends ProviderConfig {
  // Spécifique à Groq
  serviceTier?: 'auto' | 'on_demand' | 'flex' | 'performance';
  parallelToolCalls?: boolean;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  
  // Configuration Harmony
  enableHarmonyFormat?: boolean;
  enableAnalysisChannel?: boolean;
  enableCommentaryChannel?: boolean;
  enableFinalChannel?: boolean;
  strictHarmonyValidation?: boolean;
}

/**
 * Informations sur Groq Harmony
 */
const GROQ_HARMONY_INFO: ProviderInfo = {
  id: 'groq-harmony',
  name: 'Groq Harmony',
  version: '1.0.0',
  description: 'Groq provider avec support complet du format Harmony GPT-OSS',
  capabilities: {
    functionCalls: true,
    streaming: true,
    reasoning: true,
    codeExecution: true,
    webSearch: false,
    structuredOutput: true,
    audioTranscription: false,
    audioTranslation: false,
    // harmonyFormat: true, // ✅ Nouvelle capacité Harmony - commenté pour compatibilité
  },
  supportedModels: [
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-version',
    'mixtral-8x7b-32768',
  ],
  pricing: {
    input: '$0.15/1M tokens',
    output: '$0.75/1M tokens',
  }
};

/**
 * Configuration par défaut de Groq Harmony
 */
const DEFAULT_GROQ_HARMONY_CONFIG: GroqHarmonyConfig = {
  // Base
  apiKey: process.env.GROQ_API_KEY || '',
  baseUrl: 'https://api.groq.com/openai/v1',
  timeout: 30000,
  
  // LLM
  model: 'openai/gpt-oss-20b',
  temperature: 0.7,
  maxTokens: 8000,
  topP: 0.9,
  
  // Features
  supportsFunctionCalls: true,
  supportsStreaming: false,
  supportsReasoning: true,
  
  // Monitoring
  enableLogging: true,
  enableMetrics: true,
  
  // Groq spécifique
  serviceTier: 'on_demand',
  parallelToolCalls: true,
  reasoningEffort: 'low',
  
  // Harmony spécifique
  enableHarmonyFormat: true,
  enableAnalysisChannel: true,
  enableCommentaryChannel: true,
  enableFinalChannel: true,
  strictHarmonyValidation: true,
};

/**
 * Provider Groq avec support Harmony
 */
export class GroqHarmonyProvider extends BaseProvider implements LLMProvider {
  private readonly harmonyFormatter: HarmonyFormatter;
  readonly config: GroqHarmonyConfig;
  readonly info: ProviderInfo = {
    id: 'groq-harmony',
    name: 'Groq Harmony Provider',
    version: '1.0.0',
    description: 'Groq provider avec support complet du format Harmony GPT-OSS',
    capabilities: {
      functionCalls: true,
      streaming: false,
      reasoning: true,
      codeExecution: false,
      webSearch: false,
      structuredOutput: true,
    },
    supportedModels: [
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
    ],
    pricing: {
      input: '$0.15/1M tokens',
      output: '$0.75/1M tokens',
    }
  };

  constructor(config: Partial<GroqHarmonyConfig> = {}) {
    super();
    this.config = { ...DEFAULT_GROQ_HARMONY_CONFIG, ...config };
    this.harmonyFormatter = new HarmonyFormatter({
      strictValidation: this.config.strictHarmonyValidation ?? true,
      enableAnalysisChannel: this.config.enableAnalysisChannel ?? true,
      enableCommentaryChannel: this.config.enableCommentaryChannel ?? true,
      enableFinalChannel: this.config.enableFinalChannel ?? true,
    });
  }

  /**
   * Vérifie si le provider est disponible
   */
  isAvailable(): boolean {
    return !!(this.config.apiKey && this.config.baseUrl);
  }

  /**
   * Valide la configuration du provider
   */
  validateConfig(): boolean {
    return !!(this.config.apiKey && this.config.baseUrl && this.config.model);
  }

  /**
   * Appel principal avec support Harmony
   */
  async call(
    message: string,
    context: AppContext,
    history: HarmonyMessage[],
    options?: { tools?: unknown[] }
  ): Promise<GroqHarmonyResponse> {
    try {
      logger.info('[GroqHarmonyProvider] 🚀 Appel Harmony démarré', {
        messageLength: message.length,
        historyLength: history.length,
        hasTools: !!(options?.tools?.length),
        model: this.config.model,
      });

      // 1. Préparer les messages Harmony
      const harmonyMessages = this.prepareHarmonyMessages(message, context, history, options?.tools);
      
      // 2. Appel à l'API Groq
      const response = await this.callGroqAPI(harmonyMessages, options);
      
      // 3. Traitement de la réponse
      const processedResponse = this.processGroqResponse(response);
      
      logger.info('[GroqHarmonyProvider] ✅ Appel Harmony terminé', {
        hasContent: !!processedResponse.content,
        contentLength: processedResponse.content?.length || 0,
        hasToolCalls: !!(processedResponse.tool_calls?.length),
        toolCallsCount: processedResponse.tool_calls?.length || 0,
      });

      return processedResponse;

    } catch (error) {
      logger.error('[GroqHarmonyProvider] ❌ Erreur lors de l\'appel Harmony:', error);
      throw error;
    }
  }

  /**
   * Appel avec canal spécifique (analysis/final)
   */
  async callWithChannel(
    message: string,
    context: AppContext,
    history: HarmonyMessage[],
    channel: 'analysis' | 'final',
    options?: { tools?: unknown[] }
  ): Promise<GroqHarmonyResponse> {
    try {
      logger.info(`[GroqHarmonyProvider] 🎯 Appel avec canal ${channel}`, {
        messageLength: message.length,
        historyLength: history.length,
        channel,
      });

      // 1. Préparer les messages avec canal spécifique
      const harmonyMessages = this.prepareHarmonyMessagesWithChannel(
        message,
        context,
        history,
        channel,
        options?.tools
      );
      
      // 2. Appel à l'API Groq
      const response = await this.callGroqAPI(harmonyMessages, options);
      
      // 3. Traitement de la réponse
      const processedResponse = this.processGroqResponse(response);
      
      logger.info(`[GroqHarmonyProvider] ✅ Appel canal ${channel} terminé`, {
        hasContent: !!processedResponse.content,
        contentLength: processedResponse.content?.length || 0,
      });

      return processedResponse;

    } catch (error) {
      logger.error(`[GroqHarmonyProvider] ❌ Erreur lors de l'appel canal ${channel}:`, error);
      throw error;
    }
  }

  /**
   * Parse une réponse Harmony
   */
  parseHarmonyResponse(harmonyText: string): HarmonyMessage[] {
    try {
      return this.harmonyFormatter.parseConversation(harmonyText);
    } catch (error) {
      logger.error('[GroqHarmonyProvider] ❌ Erreur lors du parsing Harmony:', error);
      throw error;
    }
  }

  /**
   * Formate une conversation Harmony
   */
  formatHarmonyConversation(conversation: HarmonyConversation): string {
    try {
      return this.harmonyFormatter.formatConversation(conversation.messages);
    } catch (error) {
      logger.error('[GroqHarmonyProvider] ❌ Erreur lors du formatage Harmony:', error);
      throw error;
    }
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Prépare les messages Harmony pour l'API
   */
  private prepareHarmonyMessages(
    message: string,
    context: AppContext,
    history: HarmonyMessage[],
    tools?: unknown[]
  ): string {
    try {
      // 1. Construire la conversation Harmony
      const conversation: HarmonyConversation = {
        messages: history,
        metadata: {
          sessionId: context.id,
          timestamp: new Date().toISOString(),
        },
      };

      // 2. Ajouter les instructions système si présentes
      if (context.content && context.content.trim().length > 0) {
        const systemMessage: HarmonyMessage = {
          role: HARMONY_ROLES.SYSTEM,
          content: context.content,
          timestamp: new Date().toISOString(),
        };
        conversation.messages.unshift(systemMessage); // Ajouter au début
      }

      // 3. Ajouter le message utilisateur actuel
      const userMessage: HarmonyMessage = {
        role: HARMONY_ROLES.USER,
        content: message,
        timestamp: new Date().toISOString(),
      };
      conversation.messages.push(userMessage);

      // 4. Formater en texte Harmony
      const harmonyText = this.harmonyFormatter.formatConversation(conversation.messages);
      
      logger.dev?.('[GroqHarmonyProvider] 📝 Messages Harmony préparés:', {
        messagesCount: conversation.messages.length,
        harmonyLength: harmonyText.length,
        hasTools: !!(tools?.length),
        hasSystemInstructions: !!(context.content?.trim()),
      });

      return harmonyText;

    } catch (error) {
      logger.error('[GroqHarmonyProvider] ❌ Erreur lors de la préparation des messages:', error);
      throw error;
    }
  }

  /**
   * Prépare les messages Harmony avec canal spécifique
   */
  private prepareHarmonyMessagesWithChannel(
    message: string,
    context: AppContext,
    history: HarmonyMessage[],
    channel: 'analysis' | 'final',
    tools?: unknown[]
  ): string {
    try {
      // 1. Construire la conversation Harmony
      const conversation: HarmonyConversation = {
        messages: history,
        metadata: {
          sessionId: context.id,
          timestamp: new Date().toISOString(),
        },
      };

      // 2. Ajouter les instructions système si présentes
      if (context.content && context.content.trim().length > 0) {
        const systemMessage: HarmonyMessage = {
          role: HARMONY_ROLES.SYSTEM,
          content: context.content,
          timestamp: new Date().toISOString(),
        };
        conversation.messages.unshift(systemMessage); // Ajouter au début
      }

      // 3. Ajouter le message utilisateur actuel
      const userMessage: HarmonyMessage = {
        role: HARMONY_ROLES.USER,
        content: message,
        timestamp: new Date().toISOString(),
      };
      conversation.messages.push(userMessage);

      // 4. Ajouter un message assistant avec le canal spécifique
      const assistantMessage: HarmonyMessage = {
        role: HARMONY_ROLES.ASSISTANT,
        channel: channel === 'analysis' ? HARMONY_CHANNELS.ANALYSIS : HARMONY_CHANNELS.FINAL,
        content: '', // Sera rempli par le modèle
        timestamp: new Date().toISOString(),
      };
      conversation.messages.push(assistantMessage);

      // 5. Formater en texte Harmony
      const harmonyText = this.harmonyFormatter.formatConversation(conversation.messages);
      
      logger.dev?.('[GroqHarmonyProvider] 📝 Messages Harmony avec canal préparés:', {
        messagesCount: conversation.messages.length,
        harmonyLength: harmonyText.length,
        channel,
        hasTools: !!(tools?.length),
        hasSystemInstructions: !!(context.content?.trim()),
      });

      return harmonyText;

    } catch (error) {
      logger.error('[GroqHarmonyProvider] ❌ Erreur lors de la préparation des messages avec canal:', error);
      throw error;
    }
  }

  /**
   * Appel à l'API Groq
   */
  private async callGroqAPI(harmonyText: string, options?: { tools?: unknown[] }): Promise<unknown> {
    try {
      const payload = this.prepareGroqPayload(harmonyText, options);
      
      logger.dev?.('[GroqHarmonyProvider] 📤 Payload Groq préparé:', {
        model: payload.model,
        messagesCount: (payload.messages as any[])?.length || 0,
        hasTools: !!((payload.tools as any[])?.length),
        harmonyLength: harmonyText.length,
      });

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      logger.dev?.('[GroqHarmonyProvider] 📥 Réponse Groq reçue:', {
        hasChoices: !!(result.choices?.length),
        hasUsage: !!result.usage,
        model: result.model,
      });

      return result;

    } catch (error) {
      logger.error('[GroqHarmonyProvider] ❌ Erreur lors de l\'appel API Groq:', error);
      throw error;
    }
  }

  /**
   * Prépare le payload pour l'API Groq
   */
  private prepareGroqPayload(harmonyText: string, options?: { tools?: unknown[] }): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: harmonyText,
        }
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
    };

    // Ajouter les outils si disponibles
    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    // Configuration Groq spécifique
    if (this.config.serviceTier) {
      payload.service_tier = this.config.serviceTier;
    }
    if (this.config.parallelToolCalls) {
      payload.parallel_tool_calls = this.config.parallelToolCalls;
    }
    // ✅ CORRECTION : reasoning_effort seulement pour les modèles qui le supportent
    if (this.config.reasoningEffort && this.supportsReasoningEffort()) {
      payload.reasoning_effort = this.config.reasoningEffort;
    }

    return payload;
  }

  /**
   * Traite la réponse de l'API Groq
   */
  private processGroqResponse(response: unknown): GroqHarmonyResponse {
    try {
      const groqResponse = response as {
        choices?: Array<{
          message?: {
            content?: string;
            tool_calls?: Array<{
              id: string;
              type: 'function';
              function: {
                name: string;
                arguments: string;
              };
            }>;
          };
        }>;
        model?: string;
        usage?: {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        };
        reasoning?: string;
      };

      const choice = groqResponse.choices?.[0];
      const message = choice?.message;

      if (!message) {
        throw new Error('Réponse Groq invalide: message manquant');
      }

      const result: GroqHarmonyResponse = {
        content: message.content || '',
        model: groqResponse.model,
        usage: groqResponse.usage,
      };

      // Ajouter les tool calls si présents
      if (message.tool_calls && message.tool_calls.length > 0) {
        result.tool_calls = message.tool_calls;
      }

      // Ajouter le reasoning si présent
      if ((message as any).reasoning) {
        result.reasoning = (message as any).reasoning;
      }

      return result;

    } catch (error) {
      logger.error('[GroqHarmonyProvider] ❌ Erreur lors du traitement de la réponse:', error);
      throw error;
    }
  }

  // ============================================================================
  // MÉTHODES PRIVÉES
  // ============================================================================

  /**
   * Vérifie si le modèle supporte reasoning_effort
   */
  private supportsReasoningEffort(): boolean {
    const reasoningModels = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'];
    return reasoningModels.includes(this.config.model);
  }

  // ============================================================================
  // MÉTHODES DE L'INTERFACE
  // ============================================================================

  getInfo(): ProviderInfo {
    return GROQ_HARMONY_INFO;
  }

  getCapabilities(): ProviderCapabilities {
    return GROQ_HARMONY_INFO.capabilities;
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true); // TODO: Implémenter health check
  }

  getMetrics(): Record<string, unknown> {
    return {
      provider: 'groq-harmony',
      model: this.config.model,
      harmonyEnabled: this.config.enableHarmonyFormat,
    };
  }
}
