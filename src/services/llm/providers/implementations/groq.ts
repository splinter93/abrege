import { BaseProvider, type ProviderInfo, type ProviderConfig, type ProviderCapabilities } from '../base/BaseProvider';
import type { AppContext, ChatMessage, LLMProvider } from '../../types';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Configuration spécifique à Groq
 */
interface GroqConfig extends ProviderConfig {
  // Spécifique à Groq
  serviceTier?: 'auto' | 'on_demand' | 'flex' | 'performance';
  parallelToolCalls?: boolean;
  reasoningEffort?: 'none' | 'default';
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
  model: 'openai/gpt-oss-120b',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 0.9,
  
  // Features
  supportsFunctionCalls: true,
  supportsStreaming: true,
  supportsReasoning: true,
  
  // Monitoring
  enableLogging: true,
  enableMetrics: true,
  
  // Groq spécifique
  serviceTier: 'auto',
  parallelToolCalls: true,
  reasoningEffort: 'default'
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

    logger.dev('[GroqProvider] ✅ Configuration validée');
    return true;
  }

  /**
   * Effectue un appel à l'API Groq
   */
  async call(message: string, context: AppContext, history: ChatMessage[]): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Groq provider non configuré');
    }

    try {
      logger.dev(`[GroqProvider] 🚀 Appel avec modèle: ${this.config.model}`);

      // Préparer les messages
      const messages = this.prepareMessages(message, context, history);
      
      // Préparer le payload
      const payload = this.preparePayload(messages);
      
      // Effectuer l'appel API
      const response = await this.makeApiCall(payload);
      
      // Extraire la réponse
      const result = this.extractResponse(response);
      
      logger.dev('[GroqProvider] ✅ Appel réussi');
      return result;

    } catch (error) {
      logger.error('[GroqProvider] ❌ Erreur lors de l\'appel:', error);
      throw error;
    }
  }

  /**
   * Prépare les messages pour l'API
   */
  private prepareMessages(message: string, context: AppContext, history: ChatMessage[]) {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Message système avec contexte
    const systemContent = this.formatSystemMessage(context);
    messages.push({
      role: 'system',
      content: systemContent
    });

    // Historique des messages
    for (const msg of history) {
      messages.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      });
    }

    // Message utilisateur actuel
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Prépare le payload pour l'API Groq
   */
  private preparePayload(messages: any[]) {
    const payload: any = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      top_p: this.config.topP,
      stream: false // Pour l'instant, pas de streaming
    };

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

    return await response.json();
  }

  /**
   * Extrait la réponse de l'API Groq
   */
  private extractResponse(response: any): string {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('Réponse invalide de Groq API');
    }

    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new Error('Contenu de réponse manquant');
    }

    return choice.message.content;
  }

  /**
   * Formate le message système avec le contexte
   */
  private formatSystemMessage(context: AppContext): string {
    let systemMessage = 'Tu es un assistant IA utile et bienveillant.';

    if (context.type) {
      systemMessage += `\n\n## Contexte utilisateur\n- Type: ${context.type}`;
    }

    if (context.name) {
      systemMessage += `\n- Nom: ${context.name}`;
    }

    if (context.id) {
      systemMessage += `\n- ID: ${context.id}`;
    }

    if (context.content) {
      systemMessage += `\n- Contenu: ${context.content}`;
    }

    return systemMessage;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): any[] {
    // Pour l'instant, retourner un tableau vide
    // Les tools seront injectés depuis l'extérieur
    return [];
  }
} 