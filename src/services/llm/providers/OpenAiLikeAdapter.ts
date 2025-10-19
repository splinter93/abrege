import { simpleLogger as logger } from '@/utils/logger';
import { 
  validateToolArguments, 
  validateToolResult,
  ToolCall,
  ToolArguments,
  ToolResult 
} from '../schemas';
import type { Tool } from '../types/strictTypes';

// 🎯 Interface standardisée pour tous les providers
export interface ProviderResponse {
  content?: string | null;
  tool_calls?: ToolCall[];
  reasoning?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 🎯 Configuration d'un provider
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  timeout: number;
  retries: number;
  enableLogging: boolean;
}

// 🎯 Message pour l'API
interface ApiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

// 🎯 Options d'appel au modèle
export interface ModelCallOptions {
  messages: ApiMessage[];
  tools?: Tool[];
  tool_choice?: 'auto' | 'none';
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stream?: boolean;
  timeout?: number;
}

// 🎯 Résultat d'un appel au modèle
export interface ModelCallResult {
  success: boolean;
  response?: ProviderResponse;
  error?: string;
  duration: number;
  retryCount: number;
}

/**
 * 🎯 Adaptateur unifié pour tous les providers OpenAI-like
 * 
 * Garantit:
 * - Interface cohérente entre tous les providers
 * - Validation des arguments et résultats
 * - Gestion des erreurs et retries
 * - Logging et métriques
 */
export abstract class OpenAiLikeAdapter {
  protected config: ProviderConfig;
  protected roundId?: string;

  constructor(config: ProviderConfig) {
    this.config = config;
  }

  /**
   * 🎯 Définir le round ID pour la traçabilité
   */
  setRoundId(roundId: string): void {
    this.roundId = roundId;
  }

  /**
   * 🎯 Appel principal au modèle
   */
  async callModel(options: ModelCallOptions): Promise<ModelCallResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = this.config.retries;

    logger.dev(`[${this.config.name}] 📞 Appel au modèle ${this.config.model} (round: ${this.roundId || 'N/A'})`);

    while (retryCount <= maxRetries) {
      try {
        // 🔍 Validation des options
        const validationResult = this.validateCallOptions(options);
        if (!validationResult.isValid) {
          throw new Error(`Options d'appel invalides: ${validationResult.errors.join(', ')}`);
        }

        // 🔧 Préparation du payload
        const payload = this.preparePayload(options);
        
        // 📊 Logging du payload (si activé)
        if (this.config.enableLogging) {
          this.logPayload(payload, 'OUT');
        }

        // 🚀 Appel au provider
        const response = await this.executeCall(payload, options.timeout || this.config.timeout);
        
        // 📊 Logging de la réponse (si activé)
        if (this.config.enableLogging) {
          this.logResponse(response, 'IN');
        }

        // ✅ Validation et normalisation de la réponse
        const normalizedResponse = this.normalizeResponse(response);
        
        const duration = Date.now() - startTime;
        logger.info(`[${this.config.name}] ✅ Appel réussi en ${duration}ms (retries: ${retryCount})`);

        return {
          success: true,
          response: normalizedResponse,
          duration,
          retryCount
        };

      } catch (error) {
        retryCount++;
        const duration = Date.now() - startTime;
        
        logger.warn(`[${this.config.name}] ⚠️ Tentative ${retryCount}/${maxRetries + 1} échouée:`, error);

        if (retryCount > maxRetries) {
          logger.error(`[${this.config.name}] ❌ Toutes les tentatives ont échoué après ${duration}ms`);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            duration,
            retryCount
          };
        }

        // ⏳ Attendre avant de réessayer (backoff exponentiel)
        const backoffDelay = Math.pow(2, retryCount - 1) * 1000;
        await this.delay(backoffDelay);
      }
    }

    // Ce code ne devrait jamais être atteint
    return {
      success: false,
      error: 'Nombre maximum de tentatives atteint',
      duration: Date.now() - startTime,
      retryCount
    };
  }

  /**
   * 🔍 Validation des options d'appel
   */
  private validateCallOptions(options: ModelCallOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.messages || !Array.isArray(options.messages) || options.messages.length === 0) {
      errors.push('Messages requis et doivent être un tableau non vide');
    }

    if (options.tools && !Array.isArray(options.tools)) {
      errors.push('Tools doit être un tableau');
    }

    if (options.maxTokens && (options.maxTokens < 1 || options.maxTokens > this.config.maxTokens)) {
      errors.push(`Max tokens doit être entre 1 et ${this.config.maxTokens}`);
    }

    if (options.temperature && (options.temperature < 0 || options.temperature > 2)) {
      errors.push('Temperature doit être entre 0 et 2');
    }

    if (options.topP && (options.topP < 0 || options.topP > 1)) {
      errors.push('Top P doit être entre 0 et 1');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 🔧 Préparation du payload pour le provider
   */
  private preparePayload(options: ModelCallOptions): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: this.config.model,
      messages: options.messages,
      max_tokens: options.maxTokens || this.config.maxTokens,
      temperature: options.temperature ?? this.config.temperature,
      top_p: options.topP ?? this.config.topP,
      stream: options.stream ?? false
    };

    // 🎯 Ajouter les tools si présents
    if (options.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = options.tool_choice || 'auto';
    }

    return payload;
  }

  /**
   * 📊 Logging du payload (avec sanitisation PII)
   */
  private logPayload(payload: Record<string, unknown>, direction: 'IN' | 'OUT'): void {
    try {
      const sanitizedPayload = this.sanitizePayload(payload);
      logger.dev(`[${this.config.name}] 📤 PAYLOAD ${direction}:`, JSON.stringify(sanitizedPayload, null, 2));
    } catch (error) {
      logger.warn(`[${this.config.name}] ⚠️ Impossible de logger le payload:`, error);
    }
  }

  /**
   * 📊 Logging de la réponse
   */
  private logResponse(response: ProviderResponse, direction: 'IN' | 'OUT'): void {
    try {
      const sanitizedResponse = this.sanitizeResponse(response);
      logger.dev(`[${this.config.name}] 📥 RÉPONSE ${direction}:`, JSON.stringify(sanitizedResponse, null, 2));
    } catch (error) {
      logger.warn(`[${this.config.name}] ⚠️ Impossible de logger la réponse:`, error);
    }
  }

  /**
   * 🧹 Sanitisation du payload (suppression des données sensibles)
   */
  private sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...payload };
    
    // Supprimer les clés API sensibles
    if (sanitized.api_key) delete sanitized.api_key;
    if (sanitized.authorization) delete sanitized.authorization;
    
    // Limiter la taille des messages pour le logging
    if (Array.isArray(sanitized.messages)) {
      sanitized.messages = sanitized.messages.map((msg: unknown) => {
        if (typeof msg === 'object' && msg !== null) {
          const message = msg as Record<string, unknown>;
          const content = message.content;
          return {
            ...message,
            content: typeof content === 'string' 
              ? `${content.substring(0, 200)}${content.length > 200 ? '...' : ''}` 
              : content
          };
        }
        return msg;
      });
    }
    
    return sanitized;
  }

  /**
   * 🧹 Sanitisation de la réponse
   */
  private sanitizeResponse(response: ProviderResponse): ProviderResponse {
    const sanitized = { ...response };
    
    // Limiter la taille du contenu pour le logging
    if (typeof sanitized.content === 'string') {
      sanitized.content = `${sanitized.content.substring(0, 200)}${sanitized.content.length > 200 ? '...' : ''}`;
    }
    
    // Limiter la taille des tool calls
    if (Array.isArray(sanitized.tool_calls)) {
      sanitized.tool_calls = sanitized.tool_calls.map((tc) => ({
        ...tc,
        function: {
          ...tc.function,
          arguments: tc.function?.arguments ? 
            `${tc.function.arguments.substring(0, 100)}${tc.function.arguments.length > 100 ? '...' : ''}` : 
            tc.function?.arguments
        }
      }));
    }
    
    return sanitized;
  }

  /**
   * ✅ Normalisation de la réponse du provider
   */
  private normalizeResponse(response: Record<string, unknown>): ProviderResponse {
    const normalized: ProviderResponse = {};

    // 🎯 Contenu principal
    if (typeof response.choices === 'object' && Array.isArray(response.choices)) {
      const firstChoice = response.choices[0] as Record<string, unknown> | undefined;
      if (firstChoice && typeof firstChoice.message === 'object') {
        const message = firstChoice.message as Record<string, unknown>;
        
        normalized.content = message.content as string | null || null;
        
        // 🎯 Tool calls
        if (Array.isArray(message.tool_calls)) {
          normalized.tool_calls = message.tool_calls.map((tc: unknown) => this.normalizeToolCall(tc as Record<string, unknown>));
        }
        
        // 🎯 Reasoning (si supporté)
        if (typeof message.reasoning === 'string') {
          normalized.reasoning = message.reasoning;
        }
      }
    }

    // 🎯 Usage (si disponible)
    if (typeof response.usage === 'object' && response.usage !== null) {
      const usage = response.usage as Record<string, unknown>;
      normalized.usage = {
        prompt_tokens: (typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0),
        completion_tokens: (typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0),
        total_tokens: (typeof usage.total_tokens === 'number' ? usage.total_tokens : 0)
      };
    }

    return normalized;
  }

  /**
   * 🔧 Normalisation d'un tool call
   */
  private normalizeToolCall(toolCall: Record<string, unknown>): ToolCall {
    // 🔍 Validation des arguments JSON
    const funcObj = toolCall.function as Record<string, unknown> | undefined;
    if (funcObj && typeof funcObj.arguments === 'string') {
      const validation = validateToolArguments(funcObj.arguments);
      if (!validation.isValid) {
        logger.warn(`[${this.config.name}] ⚠️ Arguments JSON invalides pour le tool ${funcObj.name}:`, validation.error);
        // Corriger en créant des arguments vides
        funcObj.arguments = '{}';
      }
    }

    return {
      id: (typeof toolCall.id === 'string' ? toolCall.id : `call_${Date.now()}_${Math.random().toString(36).slice(2)}`),
      type: 'function',
      function: {
        name: (funcObj && typeof funcObj.name === 'string' ? funcObj.name : 'unknown'),
        arguments: (funcObj && typeof funcObj.arguments === 'string' ? funcObj.arguments : '{}')
      }
    };
  }

  /**
   * ⏳ Délai avec Promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🚀 Méthode abstraite à implémenter par chaque provider
   */
  protected abstract executeCall(payload: Record<string, unknown>, timeout: number): Promise<Record<string, unknown>>;

  /**
   * 🔧 Validation des résultats de tool
   */
  validateToolExecutionResult(result: unknown): { isValid: boolean; normalized: ToolResult; errors: string[] } {
    return validateToolResult(result);
  }

  /**
   * 📊 Obtenir les statistiques du provider
   */
  getStats(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * 🔧 Mettre à jour la configuration
   */
  updateConfig(updates: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info(`[${this.config.name}] ⚙️ Configuration mise à jour:`, updates);
  }
}

/**
 * 🎯 Factory pour créer des adaptateurs selon le type de provider
 */
export class ProviderAdapterFactory {
  static createProvider(type: string, config: ProviderConfig): OpenAiLikeAdapter {
    switch (type.toLowerCase()) {
      case 'groq':
        return new GroqAdapter(config);
      case 'openai':
        return new OpenAiAdapter(config);
      case 'anthropic':
        return new AnthropicAdapter(config);
      default:
        throw new Error(`Provider non supporté: ${type}`);
    }
  }
}

// 🎯 Implémentations spécifiques pour chaque provider

/**
 * 🔧 Adaptateur pour Groq
 */
class GroqAdapter extends OpenAiLikeAdapter {
  protected async executeCall(payload: Record<string, unknown>, timeout: number): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} - ${response.statusText}`);
      }

      return await response.json() as Record<string, unknown>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * 🔧 Adaptateur pour OpenAI
 */
class OpenAiAdapter extends OpenAiLikeAdapter {
  protected async executeCall(payload: Record<string, unknown>, timeout: number): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}`);
      }

      return await response.json() as Record<string, unknown>;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

/**
 * 🔧 Adaptateur pour Anthropic (Claude)
 */
class AnthropicAdapter extends OpenAiLikeAdapter {
  protected async executeCall(payload: Record<string, unknown>, timeout: number): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Conversion du format OpenAI vers Anthropic
      const anthropicPayload = this.convertToAnthropicFormat(payload);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(anthropicPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} - ${response.statusText}`);
      }

      const anthropicResponse = await response.json() as Record<string, unknown>;
      return this.convertFromAnthropicFormat(anthropicResponse);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 🔄 Conversion du format OpenAI vers Anthropic
   */
  private convertToAnthropicFormat(openAiPayload: Record<string, unknown>): Record<string, unknown> {
    // TODO: Implémenter la conversion complète
    return {
      model: openAiPayload.model,
      messages: openAiPayload.messages,
      max_tokens: openAiPayload.max_tokens
    };
  }

  /**
   * 🔄 Conversion du format Anthropic vers OpenAI
   */
  private convertFromAnthropicFormat(anthropicResponse: Record<string, unknown>): Record<string, unknown> {
    // TODO: Implémenter la conversion complète
    const content = anthropicResponse.content;
    const firstContentText = Array.isArray(content) && content[0] 
      ? (content[0] as Record<string, unknown>).text 
      : null;
      
    return {
      choices: [{
        message: {
          content: firstContentText,
          role: 'assistant'
        }
      }],
      usage: anthropicResponse.usage
    };
  }
} 