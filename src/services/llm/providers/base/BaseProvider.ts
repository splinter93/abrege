import type { AppContext, ChatMessage } from '../../types';

/**
 * Capacités supportées par un provider
 */
export interface ProviderCapabilities {
  functionCalls: boolean;
  streaming: boolean;
  reasoning: boolean;
  codeExecution: boolean;
  webSearch: boolean;
  structuredOutput: boolean;
  images?: boolean; // Support des inputs visuels
  audioTranscription?: boolean; // ✅ Support de la transcription audio
  audioTranslation?: boolean;   // ✅ Support de la traduction audio
}

/**
 * Configuration standard d'un provider
 */
export interface ProviderConfig {
  // Base
  apiKey: string;
  baseUrl: string;
  timeout: number;
  
  // LLM
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  
  // Features
  supportsFunctionCalls: boolean;
  supportsStreaming: boolean;
  supportsReasoning: boolean;
  
  // Monitoring
  enableLogging: boolean;
  enableMetrics: boolean;
}

/**
 * Informations sur un provider
 */
export interface ProviderInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: ProviderCapabilities;
  supportedModels: string[];
  pricing: {
    input: string;
    output: string;
    audio?: string; // ✅ Pricing audio
  };
}

/**
 * Interface de base pour tous les providers LLM
 */
export interface IBaseProvider {
  // Informations
  readonly info: ProviderInfo;
  
  // Configuration
  readonly config: ProviderConfig;
  
  // Méthodes obligatoires
  isAvailable(): boolean;
  validateConfig(): boolean;
  call(message: string, context: AppContext, history: ChatMessage[]): Promise<unknown>;
  
  // Méthodes optionnelles
  supportsFunctionCalls(): boolean;
  getFunctionCallTools(): unknown[];
  
  // Méthodes utilitaires
  getSupportedModels(): string[];
  getCapabilities(): ProviderCapabilities;
  getPricing(): { input: string; output: string };
}

/**
 * Classe de base pour tous les providers LLM
 */
export abstract class BaseProvider implements IBaseProvider {
  abstract readonly info: ProviderInfo;
  abstract readonly config: ProviderConfig;

  /**
   * Vérifie si le provider est disponible
   */
  abstract isAvailable(): boolean;

  /**
   * Valide la configuration du provider
   */
  abstract validateConfig(): boolean;

  /**
   * Effectue un appel au provider
   */
  abstract call(message: string, context: AppContext, history: ChatMessage[]): Promise<unknown>;

  /**
   * Vérifie si le provider supporte les function calls
   */
  supportsFunctionCalls(): boolean {
    return this.info.capabilities.functionCalls;
  }

  /**
   * Retourne les tools disponibles pour les function calls
   */
  getFunctionCallTools(): unknown[] {
    return [];
  }

  /**
   * Retourne les modèles supportés
   */
  getSupportedModels(): string[] {
    return this.info.supportedModels;
  }

  /**
   * Retourne les capacités du provider
   */
  getCapabilities(): ProviderCapabilities {
    return this.info.capabilities;
  }

  /**
   * Retourne les informations de pricing
   */
  getPricing(): { input: string; output: string } {
    return this.info.pricing;
  }

  /**
   * Méthode utilitaire pour valider l'API key
   */
  protected validateApiKey(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0;
  }

  /**
   * Méthode utilitaire pour valider l'URL de base
   */
  protected validateBaseUrl(): boolean {
    return !!this.config.baseUrl && this.config.baseUrl.startsWith('http');
  }

  /**
   * Méthode utilitaire pour valider la configuration de base
   */
  protected validateBaseConfig(): boolean {
    return this.validateApiKey() && this.validateBaseUrl();
  }
} 