import { GroqLimits } from '../types/groqTypes';

/**
 * Configuration par défaut pour le service Groq
 */
export const GROQ_CONFIG = {
  // 🎯 Limites de sécurité
  limits: {
    maxToolCalls: 10,
    maxRelances: 15, // 🚀 AUGMENTÉ À 15 CYCLES !
    maxContextMessages: 25,
    maxHistoryMessages: 40
  } as GroqLimits,

  // 🔧 Configuration des tools
  tools: {
    maxRetries: 3,
    timeout: 10000, // 10 secondes (optimisé)
    batchSize: 5
  },

  // 📝 Configuration des logs
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'dev',
    includeTimestamps: true,
    includeContext: true
  },

  // 🚀 Configuration des performances
  performance: {
    enableCaching: false,
    cacheTTL: 300000, // 5 minutes
    enableMetrics: true
  },

  // ⚠️ Configuration des erreurs
  errors: {
    enableRetry: true,
    maxRetryAttempts: 3,
    retryDelay: 1000, // 1 seconde
    enableFallback: true
  }
};

/**
 * Configuration pour l'environnement de développement
 */
export const GROQ_DEV_CONFIG = {
  ...GROQ_CONFIG,
  limits: {
    ...GROQ_CONFIG.limits,
    maxToolCalls: 5,
    maxContextMessages: 15
  },
  logging: {
    ...GROQ_CONFIG.logging,
    level: 'dev'
  },
  performance: {
    ...GROQ_CONFIG.performance,
    enableCaching: false,
    enableMetrics: true
  }
};

/**
 * Configuration pour l'environnement de production
 */
export const GROQ_PROD_CONFIG = {
  ...GROQ_CONFIG,
  limits: {
    ...GROQ_CONFIG.limits,
    maxToolCalls: 15,
    maxContextMessages: 30,
    maxRelances: 15 // 🚀 AUGMENTÉ À 15 CYCLES !
  },
  logging: {
    ...GROQ_CONFIG.logging,
    level: 'info'
  },
  performance: {
    ...GROQ_CONFIG.performance,
    enableCaching: true,
    enableMetrics: true
  },
  errors: {
    ...GROQ_CONFIG.errors,
    enableRetry: true,
    maxRetryAttempts: 2
  }
};

/**
 * Configuration pour les tests
 */
export const GROQ_TEST_CONFIG = {
  ...GROQ_CONFIG,
  limits: {
    ...GROQ_CONFIG.limits,
    maxToolCalls: 3,
    maxContextMessages: 10
  },
  logging: {
    ...GROQ_CONFIG.logging,
    level: 'error'
  },
  performance: {
    ...GROQ_CONFIG.performance,
    enableCaching: false,
    enableMetrics: false
  },
  errors: {
    ...GROQ_CONFIG.errors,
    enableRetry: false
  }
};

/**
 * Obtenir la configuration selon l'environnement
 */
export function getGroqConfig(): typeof GROQ_CONFIG {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'production':
      return GROQ_PROD_CONFIG;
    case 'development':
      return GROQ_DEV_CONFIG;
    case 'test':
      return GROQ_TEST_CONFIG;
    default:
      return GROQ_DEV_CONFIG;
  }
}

/**
 * Configuration personnalisée avec validation
 */
export function createCustomGroqConfig(overrides: Partial<typeof GROQ_CONFIG>): typeof GROQ_CONFIG {
  const config = { ...GROQ_CONFIG, ...overrides };
  
  // Validation des limites
  if (config.limits.maxToolCalls < 1 || config.limits.maxToolCalls > 50) {
    throw new Error('maxToolCalls doit être entre 1 et 50');
  }
  
  if (config.limits.maxContextMessages < 5 || config.limits.maxContextMessages > 100) {
    throw new Error('maxContextMessages doit être entre 5 et 100');
  }
  
  if (config.limits.maxHistoryMessages < 10 || config.limits.maxHistoryMessages > 200) {
    throw new Error('maxHistoryMessages doit être entre 10 et 200');
  }
  
  return config;
}

/**
 * Configuration pour des cas d'usage spécifiques
 */
export const GROQ_USE_CASE_CONFIGS = {
  // Configuration pour le chat en temps réel
  realtime: {
    limits: {
      maxToolCalls: 3,
      maxRelances: 1,
      maxContextMessages: 15,
      maxHistoryMessages: 25
    },
    tools: {
      maxRetries: 2,
      timeout: 5000 // 5 secondes (optimisé)
    }
  },
  
  // Configuration pour le traitement par lots
  batch: {
    limits: {
      maxToolCalls: 20,
      maxRelances: 3,
      maxContextMessages: 50,
      maxHistoryMessages: 100
    },
    tools: {
      maxRetries: 5,
      timeout: 15000 // 15 secondes (optimisé)
    }
  },
  
  // Configuration pour le debug
  debug: {
    limits: {
      maxToolCalls: 5,
      maxRelances: 1,
      maxContextMessages: 10,
      maxHistoryMessages: 20
    },
    logging: {
      level: 'dev',
      includeTimestamps: true,
      includeContext: true
    }
  }
};

export default GROQ_CONFIG; 