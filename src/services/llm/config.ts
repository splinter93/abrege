import { SERVER_ENV } from '@/config/env.server';

/**
 * Configuration centralisée pour les LLM
 * Gère les variables d'environnement et les paramètres par défaut
 */
export interface LLMConfig {
  // Configuration générale
  defaultProvider: string;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  
  // Configuration des messages système
  systemMessage: {
    defaultTemplate: string;
    customInstructions?: string;
    language: 'fr' | 'en';
  };
  
  // Configuration des providers
  providers: {
    groq: {
      apiKey: string;
      baseUrl: string;
      defaultModel: string;
      serviceTier: 'auto' | 'on_demand' | 'flex' | 'performance';
    };
    synesia: {
      apiKey: string;
      baseUrl: string;
      defaultModel: string;
    };
    xai: {
      apiKey: string;
      baseUrl: string;
      defaultModel: string;
      reasoningMode: 'fast' | 'reasoning';
    };
    liminality: {
      apiKey: string;
      baseUrl: string;
      defaultModel: string;
      maxLoops: number;
    };
  };
  
  // Configuration des outils
  tools: {
    enableFunctionCalls: boolean;
    enableStreaming: boolean;
    maxToolCalls: number;
  };
  
  // Configuration du monitoring
  monitoring: {
    enableLogging: boolean;
    enableMetrics: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Configuration par défaut
 */
const DEFAULT_CONFIG: LLMConfig = {
  defaultProvider: 'groq',
  defaultModel: 'openai/gpt-oss-20b',
  defaultTemperature: 0.7,
  defaultMaxTokens: 8000,
  
  systemMessage: {
    defaultTemplate: 'assistant-contextual',
    customInstructions: undefined,
    language: 'fr'
  },
  
  providers: {
    groq: {
      apiKey: SERVER_ENV.llm.groqApiKey,
      baseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'openai/gpt-oss-20b',
      serviceTier: 'on_demand'
    },
    synesia: {
      apiKey: process.env.SYNESIA_API_KEY || '',
      baseUrl: process.env.SYNESIA_BASE_URL || 'https://api.synesia.com',
      defaultModel: 'gpt-4'
    },
    xai: {
      apiKey: SERVER_ENV.llm.xaiApiKey,
      baseUrl: 'https://api.x.ai/v1',
      defaultModel: 'grok-4-1-fast-reasoning',
      reasoningMode: 'fast'
    },
    liminality: {
      apiKey: SERVER_ENV.llm.liminalityApiKey || process.env.LIMINALITY_API_KEY || '',
      baseUrl: process.env.LIMINALITY_BASE_URL || 'https://origins-server.up.railway.app',
      defaultModel: process.env.LIMINALITY_MODEL || 'gpt-4o-mini',
      maxLoops: parseInt(process.env.LIMINALITY_MAX_LOOPS || '10', 10)
    }
  },
  
  tools: {
    enableFunctionCalls: true,
    enableStreaming: false, // Streaming géré par la route API
    maxToolCalls: 20
  },
  
  monitoring: {
    enableLogging: true,
    enableMetrics: true,
    logLevel: 'info'
  }
};

/**
 * Gestionnaire de configuration LLM
 */
export class LLMConfigManager {
  private static instance: LLMConfigManager;
  private config: LLMConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): LLMConfigManager {
    if (!LLMConfigManager.instance) {
      LLMConfigManager.instance = new LLMConfigManager();
    }
    return LLMConfigManager.instance;
  }

  /**
   * Charge la configuration depuis les variables d'environnement
   */
  private loadConfig(): LLMConfig {
    const config = { ...DEFAULT_CONFIG };

    // Configuration des messages système
    if (process.env.LLM_SYSTEM_TEMPLATE) {
      config.systemMessage.defaultTemplate = process.env.LLM_SYSTEM_TEMPLATE;
    }
    
    if (process.env.LLM_CUSTOM_INSTRUCTIONS) {
      config.systemMessage.customInstructions = process.env.LLM_CUSTOM_INSTRUCTIONS;
    }
    
    if (process.env.LLM_LANGUAGE) {
      config.systemMessage.language = process.env.LLM_LANGUAGE as 'fr' | 'en';
    }

    // Configuration des providers
    if (process.env.GROQ_API_KEY) {
      config.providers.groq.apiKey = process.env.GROQ_API_KEY;
    }
    
    if (process.env.GROQ_BASE_URL) {
      config.providers.groq.baseUrl = process.env.GROQ_BASE_URL;
    }
    
    if (process.env.GROQ_MODEL) {
      config.providers.groq.defaultModel = process.env.GROQ_MODEL;
    }
    
    if (process.env.GROQ_SERVICE_TIER) {
      config.providers.groq.serviceTier = process.env.GROQ_SERVICE_TIER as 'auto' | 'on_demand' | 'flex' | 'performance';
    }

    if (process.env.SYNESIA_API_KEY) {
      config.providers.synesia.apiKey = process.env.SYNESIA_API_KEY;
    }
    
    if (process.env.SYNESIA_BASE_URL) {
      config.providers.synesia.baseUrl = process.env.SYNESIA_BASE_URL;
    }
    
    if (process.env.SYNESIA_MODEL) {
      config.providers.synesia.defaultModel = process.env.SYNESIA_MODEL;
    }

    if (process.env.XAI_API_KEY) {
      config.providers.xai.apiKey = process.env.XAI_API_KEY;
    }
    
    if (process.env.XAI_BASE_URL) {
      config.providers.xai.baseUrl = process.env.XAI_BASE_URL;
    }
    
    if (process.env.XAI_MODEL) {
      config.providers.xai.defaultModel = process.env.XAI_MODEL;
    }
    
    if (process.env.XAI_REASONING_MODE) {
      config.providers.xai.reasoningMode = process.env.XAI_REASONING_MODE as 'fast' | 'reasoning';
    }

    // Configuration générale
    if (process.env.LLM_DEFAULT_PROVIDER) {
      config.defaultProvider = process.env.LLM_DEFAULT_PROVIDER;
    }
    
    if (process.env.LLM_DEFAULT_MODEL) {
      config.defaultModel = process.env.LLM_DEFAULT_MODEL;
    }
    
    if (process.env.LLM_DEFAULT_TEMPERATURE) {
      config.defaultTemperature = parseFloat(process.env.LLM_DEFAULT_TEMPERATURE);
    }
    
    if (process.env.LLM_DEFAULT_MAX_TOKENS) {
      config.defaultMaxTokens = parseInt(process.env.LLM_DEFAULT_MAX_TOKENS);
    }

    // Configuration des outils
    if (process.env.LLM_ENABLE_FUNCTION_CALLS !== undefined) {
      config.tools.enableFunctionCalls = process.env.LLM_ENABLE_FUNCTION_CALLS === 'true';
    }
    
    if (process.env.LLM_ENABLE_STREAMING !== undefined) {
      config.tools.enableStreaming = process.env.LLM_ENABLE_STREAMING === 'true';
    }
    
    if (process.env.LLM_MAX_TOOL_CALLS) {
      config.tools.maxToolCalls = parseInt(process.env.LLM_MAX_TOOL_CALLS);
    }

    // Configuration du monitoring
    if (process.env.LLM_ENABLE_LOGGING !== undefined) {
      config.monitoring.enableLogging = process.env.LLM_ENABLE_LOGGING === 'true';
    }
    
    if (process.env.LLM_ENABLE_METRICS !== undefined) {
      config.monitoring.enableMetrics = process.env.LLM_ENABLE_METRICS === 'true';
    }
    
    if (process.env.LLM_LOG_LEVEL) {
      config.monitoring.logLevel = process.env.LLM_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error';
    }

    return config;
  }

  /**
   * Obtient la configuration actuelle
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Obtient une valeur de configuration spécifique
   */
  get<K extends keyof LLMConfig>(key: K): LLMConfig[K] {
    return this.config[key];
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Recharge la configuration depuis les variables d'environnement
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
  }

  /**
   * Vérifie si la configuration est valide
   */
  validateConfig(): boolean {
    // Vérifier les clés API requises
    if (!this.config.providers.groq.apiKey && this.config.defaultProvider === 'groq') {
      console.warn('[LLMConfigManager] ⚠️ Clé API Groq manquante');
      return false;
    }
    
    if (!this.config.providers.synesia.apiKey && this.config.defaultProvider === 'synesia') {
      console.warn('[LLMConfigManager] ⚠️ Clé API Synesia manquante');
      return false;
    }

    return true;
  }
}

/**
 * Fonctions utilitaires pour la compatibilité
 */
export const getLLMConfig = (): LLMConfig => {
  return LLMConfigManager.getInstance().getConfig();
};

export const getLLMConfigValue = <K extends keyof LLMConfig>(key: K): LLMConfig[K] => {
  return LLMConfigManager.getInstance().get(key);
}; 