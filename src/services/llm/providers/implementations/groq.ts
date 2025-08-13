import { BaseProvider, type ProviderCapabilities, type ProviderConfig, type ProviderInfo } from '../base/BaseProvider';
import type { LLMProvider, AppContext } from '../../types';
import type { ChatMessage } from '@/types/chat';
import { logger } from '@/utils/logger';
import { getSystemMessage } from '../../templates';

/**
 * Configuration spécifique à Groq
 */
interface GroqConfig extends ProviderConfig {
  // Spécifique à Groq
  serviceTier?: 'auto' | 'on_demand' | 'flex' | 'performance';
  parallelToolCalls?: boolean;
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
}

/**
 * Informations sur Groq
 */
const GROQ_INFO: ProviderInfo = {
  id: 'groq',
  name: 'Groq',
  version: '1.0.0',
  description: 'Ultra-fast inference platform with GPT-OSS 120B and other models',
  capabilities: {
    functionCalls: true,
    streaming: true,
    reasoning: true,
    codeExecution: true,
    webSearch: false,
    structuredOutput: true
  },
  supportedModels: [
    'openai/gpt-oss-20b', // ✅ Modèle plus stable
    'openai/gpt-oss-120b',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-version',
    'mixtral-8x7b-32768'
  ],
  pricing: {
    input: '$0.15/1M tokens',
    output: '$0.75/1M tokens'
  }
};

/**
 * Configuration par défaut de Groq
 */
const DEFAULT_GROQ_CONFIG: GroqConfig = {
  // Base
  apiKey: process.env.GROQ_API_KEY || '',
  baseUrl: 'https://api.groq.com/openai/v1',
  timeout: 30000,
  
  // LLM
  model: 'openai/gpt-oss-20b', // ✅ Modèle plus stable
  temperature: 0.7,
  maxTokens: 8000, // ✅ Augmenté pour plus de réponses
  topP: 0.9,
  
  // Features
  supportsFunctionCalls: true,
  supportsStreaming: false, // ✅ DÉSACTIVÉ : Plus de streaming
  supportsReasoning: true,
  
  // Monitoring
  enableLogging: true,
  enableMetrics: true,
  
  // Groq spécifique
  serviceTier: 'on_demand', // ✅ Gratuit au lieu de 'auto' (payant)
  parallelToolCalls: true,
  reasoningEffort: 'low' // ✅ Réduit le reasoning pour plus de réponses
};

/**
 * Provider Groq pour l'API Groq
 */
export class GroqProvider extends BaseProvider implements LLMProvider {
  readonly info = GROQ_INFO;
  readonly config: GroqConfig;

  // Implémentation de LLMProvider
  get name(): string {
    return this.info.name;
  }

  get id(): string {
    return this.info.id;
  }

  constructor(customConfig?: Partial<GroqConfig>) {
    super();
    this.config = { ...DEFAULT_GROQ_CONFIG, ...customConfig };
  }

  /**
   * Vérifie si Groq est disponible
   */
  isAvailable(): boolean {
    return this.validateConfig();
  }

  /**
   * Valide la configuration de Groq
   */
  validateConfig(): boolean {
    if (!this.validateBaseConfig()) {
      logger.error('[GroqProvider] ❌ Configuration de base invalide');
      return false;
    }

    if (!this.config.model) {
      logger.error('[GroqProvider] ❌ Modèle non spécifié');
      return false;
    }

    if (!this.info.supportedModels.includes(this.config.model)) {
      logger.warn(`[GroqProvider] ⚠️ Modèle ${this.config.model} non officiellement supporté`);
    }

    logger.debug('[GroqProvider] ✅ Configuration validée');
    return true;
  }

  /**
   * Effectue un appel à l'API Groq avec support des function calls
   */
  async call(message: string, context: AppContext, history: ChatMessage[], tools?: any[]): Promise<any> {
    if (!this.isAvailable()) {
      throw new Error('Groq provider non configuré');
    }

    try {
      logger.debug(`[GroqProvider] 🚀 Appel avec modèle: ${this.config.model}`);

      // ✅ Vérifier si le streaming est activé
      if (this.config.supportsStreaming) {
        throw new Error('Streaming non supporté dans le provider Groq - utilisez la route API directement');
      }

      // Préparer les messages
      const messages = this.prepareMessages(message, context, history);
      
      // Préparer le payload (sans streaming)
      const payload = this.preparePayload(messages, tools);
      payload.stream = false; // Forcer le mode non-streaming
      
      // Effectuer l'appel API
      const response = await this.makeApiCall(payload);
      
      // Extraire la réponse
      const result = this.extractResponse(response);
      
      logger.debug('[GroqProvider] ✅ Appel réussi');
      
      // 🎯 Retourner un objet avec content et tool_calls
      return {
        content: result.content || '',
        reasoning: result.reasoning || '',
        tool_calls: result.tool_calls || []
      };

    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur lors de l\'appel:', error);
      throw error;
    }
  }

  /**
   * Prépare les messages pour l'API
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]) {
    const messages: Array<any> = [];

    // Message système avec contexte
    const systemContent = this.formatSystemMessage(context);
    messages.push({
      role: 'system',
      content: systemContent
    });

    // Historique des messages
    for (const msg of history) {
      const messageObj: any = {
        role: msg.role as 'user' | 'assistant' | 'system' | 'tool',
        content: msg.content
      };

      // ✅ Gérer les tool calls pour les messages assistant
      if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
        messageObj.tool_calls = msg.tool_calls;
      }

      // ✅ Gérer les tool results pour les messages tool
      if (msg.role === 'tool' && msg.tool_call_id) {
        messageObj.tool_call_id = msg.tool_call_id;
        if (msg.name) {
          messageObj.name = msg.name;
        }
      }

      // ✅ Gérer les tool results si présents
      if (msg.tool_results && msg.tool_results.length > 0) {
        messageObj.tool_results = msg.tool_results;
      }

      messages.push(messageObj);
    }

    // Message utilisateur actuel
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Prépare le payload pour l'API Groq avec support des tools
   */
  private preparePayload(messages: any[], tools?: any[]) {
    const payload: any = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_completion_tokens: this.config.maxTokens, // ✅ Correction: Groq utilise max_completion_tokens
      top_p: this.config.topP,
      stream: false // ✅ Streaming désactivé dans le provider (géré par la route API)
    };

    // Ajouter les tools si disponibles
    if (tools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto'; // ✅ Permettre à Groq de choisir les tools automatiquement
      logger.debug(`[GroqProvider] 🔧 ${tools.length} tools disponibles pour les function calls`);
    }

    // Ajouter les paramètres spécifiques à Groq
    if (this.config.serviceTier) {
      payload.service_tier = this.config.serviceTier;
    }

    if (this.config.parallelToolCalls) {
      payload.parallel_tool_calls = this.config.parallelToolCalls;
    }

    if (this.config.reasoningEffort) {
      payload.reasoning_effort = this.config.reasoningEffort;
    }

    return payload;
  }

  /**
   * Effectue l'appel API à Groq
   */
  private async makeApiCall(payload: any) {
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
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    // ✅ Gestion spéciale pour le streaming
    if (payload.stream) {
      // Pour le streaming, on ne peut pas parser la réponse comme du JSON
      // Le streaming est géré directement dans la route API
      throw new Error('Streaming non supporté dans le provider Groq - utilisez la route API directement');
    }

    return await response.json();
  }

  /**
   * Extrait la réponse de l'API Groq avec support des tool calls
   */
  private extractResponse(response: any): any {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Réponse invalide de Groq API');
    }

    const choice = response.choices[0];
    const result: any = {
      content: choice?.message?.content ?? '',
      model: response.model,
      usage: response.usage
    };

    // ✅ Ajouter les tool calls si présents
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      result.tool_calls = choice.message.tool_calls;
      logger.debug(`[GroqProvider] 🔧 ${result.tool_calls.length} tool calls détectés`);
      
      result.tool_calls.forEach((toolCall: any, index: number) => {
        logger.debug(`[GroqProvider] Tool call ${index + 1}: ${toolCall.function.name}`);
      });
    }

    return result;
  }

  /**
   * Formate le message système avec le contexte
   */
  private formatSystemMessage(context: AppContext): string {
    // Utiliser le système de templates
    const message = getSystemMessage('assistant-contextual', { context });
    if (!message) {
      return 'Tu es un assistant IA utile et bienveillant.';
    }
    return message;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): any[] {
    // Pour l'instant, retourner un tableau vide
    // Les tools seront injectés depuis l'extérieur via AgentApiV2Tools
    return [];
  }

  /**
   * Test de connexion avec Groq
   */
  async testConnection(): Promise<boolean> {
    try {
      logger.debug('[GroqProvider] 🧪 Test de connexion avec Groq...');
      
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const models = await response.json();
      logger.debug(`[GroqProvider] ✅ Connexion réussie - ${models.data.length} modèles disponibles`);
      
      // Vérifier si GPT OSS est disponible
      const gptOssModels = models.data.filter((model: any) => 
        model.id.includes('gpt-oss')
      );
      
      logger.debug(`[GroqProvider] 🎯 ${gptOssModels.length} modèles GPT OSS disponibles`);
      
      return true;
    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur de connexion:', error);
      return false;
    }
  }

  /**
   * Test d'appel avec function calls
   */
  async testFunctionCalls(tools: any[]): Promise<boolean> {
    try {
      logger.debug('[GroqProvider] 🧪 Test d\'appel avec function calls...');
      
      const messages = [
        {
          role: 'system',
          content: getSystemMessage('assistant-tools')
        },
        {
          role: 'user',
          content: 'Crée une note intitulée "Test Groq OpenAPI" dans le classeur "main-notebook"'
        }
      ];

      const payload = {
        model: this.config.model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: this.config.temperature,
        max_completion_tokens: this.config.maxTokens,
        top_p: this.config.topP
      };

      const response = await this.makeApiCall(payload);
      const result = this.extractResponse(response);
      
      if (result.tool_calls && result.tool_calls.length > 0) {
        logger.debug(`[GroqProvider] ✅ Function calls testés avec succès - ${result.tool_calls.length} tool calls`);
        return true;
      } else {
        logger.debug('[GroqProvider] ⚠️ Aucun tool call détecté dans la réponse');
        return false;
      }
    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur lors du test des function calls:', error);
      return false;
    }
  }
} 