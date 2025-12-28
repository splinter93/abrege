/**
 * Configuration optimisée des timeouts pour les performances
 * Timeouts adaptatifs basés sur le type d'opération et les conditions
 */

export interface TimeoutConfig {
  toolCalls: {
    single: number;      // Timeout pour un tool call individuel
    batch: number;       // Timeout pour un batch de tool calls
    parallel: number;    // Timeout pour l'exécution parallèle
    retry: number;       // Timeout entre les tentatives
  };
  api: {
    groq: number;        // Timeout pour l'API Groq
    openai: number;      // Timeout pour l'API OpenAI
    anthropic: number;   // Timeout pour l'API Anthropic
    supabase: number;    // Timeout pour Supabase
  };
  database: {
    query: number;       // Timeout pour les requêtes DB
    transaction: number; // Timeout pour les transactions
    connection: number;  // Timeout de connexion
  };
  cache: {
    redis: number;       // Timeout pour Redis
    memory: number;      // Timeout pour le cache mémoire
  };
  retries: {
    max: number;         // Nombre maximum de tentatives
    backoff: 'linear' | 'exponential' | 'fixed';
    baseDelay: number;   // Délai de base en ms
    maxDelay: number;    // Délai maximum en ms
    jitter: boolean;     // Ajouter du jitter pour éviter les thundering herds
  };
}

export interface AdaptiveTimeoutConfig extends TimeoutConfig {
  adaptive: {
    enabled: boolean;    // Activer les timeouts adaptatifs
    learningPeriod: number; // Période d'apprentissage en ms
    adjustmentFactor: number; // Facteur d'ajustement (0.1 = 10%)
    minTimeout: number;  // Timeout minimum
    maxTimeout: number;  // Timeout maximum
  };
}

export class OptimizedTimeouts {
  private static instance: OptimizedTimeouts;
  private config: AdaptiveTimeoutConfig;
  private performanceHistory: Map<string, number[]> = new Map();
  private adaptiveTimeouts: Map<string, number> = new Map();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.startAdaptiveLearning();
  }

  public static getInstance(): OptimizedTimeouts {
    if (!OptimizedTimeouts.instance) {
      OptimizedTimeouts.instance = new OptimizedTimeouts();
    }
    return OptimizedTimeouts.instance;
  }

  /**
   * Configuration par défaut optimisée pour la production
   */
  private getDefaultConfig(): AdaptiveTimeoutConfig {
    return {
      toolCalls: {
        single: 120000,    // 120s (2 min) pour un tool call - permet enchaînements longs comme Cursor
        batch: 300000,     // 5min pour un batch (augmenté pour cohérence)
        parallel: 180000,  // 3min pour l'exécution parallèle
        retry: 5000,       // 5s entre les tentatives
      },
      api: {
        groq: 45000,       // 45s pour Groq
        openai: 60000,     // 1min pour OpenAI
        anthropic: 90000,  // 1.5min pour Anthropic
        supabase: 30000,   // 30s pour Supabase
      },
      database: {
        query: 15000,      // 15s pour les requêtes
        transaction: 30000, // 30s pour les transactions
        connection: 10000,  // 10s pour la connexion
      },
      cache: {
        redis: 5000,       // 5s pour Redis
        memory: 1000,      // 1s pour le cache mémoire
      },
      retries: {
        max: 5,
        backoff: 'exponential',
        baseDelay: 1000,
        maxDelay: 30000,
        jitter: true,
      },
      adaptive: {
        enabled: true,
        learningPeriod: 24 * 60 * 60 * 1000, // 24 heures
        adjustmentFactor: 0.1, // 10%
        minTimeout: 1000,      // 1 seconde minimum
        maxTimeout: 300000,    // 5 minutes maximum
      },
    };
  }

  /**
   * Obtenir le timeout pour un tool call spécifique
   */
  getToolCallTimeout(toolName: string, isBatch: boolean = false): number {
    const baseTimeout = isBatch ? this.config.toolCalls.batch : this.config.toolCalls.single;
    
    if (this.config.adaptive.enabled) {
      return this.getAdaptiveTimeout(`tool:${toolName}`, baseTimeout);
    }
    
    return baseTimeout;
  }

  /**
   * Obtenir le timeout pour une API spécifique
   */
  getApiTimeout(provider: 'groq' | 'openai' | 'anthropic' | 'supabase'): number {
    const baseTimeout = this.config.api[provider];
    
    if (this.config.adaptive.enabled) {
      return this.getAdaptiveTimeout(`api:${provider}`, baseTimeout);
    }
    
    return baseTimeout;
  }

  /**
   * Obtenir le timeout pour une requête de base de données
   */
  getDatabaseTimeout(operation: 'query' | 'transaction' | 'connection'): number {
    const baseTimeout = this.config.database[operation];
    
    if (this.config.adaptive.enabled) {
      return this.getAdaptiveTimeout(`db:${operation}`, baseTimeout);
    }
    
    return baseTimeout;
  }

  /**
   * Obtenir le timeout pour le cache
   */
  getCacheTimeout(type: 'redis' | 'memory'): number {
    const baseTimeout = this.config.cache[type];
    
    if (this.config.adaptive.enabled) {
      return this.getAdaptiveTimeout(`cache:${type}`, baseTimeout);
    }
    
    return baseTimeout;
  }

  /**
   * Calculer le délai de retry avec backoff
   */
  calculateRetryDelay(attempt: number): number {
    const { baseDelay, maxDelay, backoff, jitter } = this.config.retries;
    
    let delay: number;
    
    switch (backoff) {
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = baseDelay * attempt;
        break;
      case 'fixed':
      default:
        delay = baseDelay;
        break;
    }
    
    // Limiter au délai maximum
    delay = Math.min(delay, maxDelay);
    
    // Ajouter du jitter pour éviter les thundering herds
    if (jitter) {
      const jitterAmount = delay * 0.1; // 10% de jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }
    
    return Math.max(0, delay);
  }

  /**
   * Obtenir le timeout adaptatif pour une opération
   */
  private getAdaptiveTimeout(operation: string, baseTimeout: number): number {
    const adaptiveTimeout = this.adaptiveTimeouts.get(operation);
    
    if (adaptiveTimeout !== undefined) {
      return Math.max(
        this.config.adaptive.minTimeout,
        Math.min(adaptiveTimeout, this.config.adaptive.maxTimeout)
      );
    }
    
    return baseTimeout;
  }

  /**
   * Enregistrer les performances d'une opération
   */
  recordPerformance(operation: string, duration: number, success: boolean): void {
    if (!this.config.adaptive.enabled) return;
    
    try {
      if (!this.performanceHistory.has(operation)) {
        this.performanceHistory.set(operation, []);
      }
      
      const history = this.performanceHistory.get(operation)!;
      history.push(duration);
      
      // Garder seulement les 100 dernières mesures
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }
      
      // Ajuster le timeout si nécessaire
      this.adjustTimeout(operation, history, success);
    } catch (error) {
      console.error(`[OptimizedTimeouts] ❌ Error recording performance for ${operation}:`, error);
    }
  }

  /**
   * Ajuster le timeout basé sur les performances
   */
  private adjustTimeout(operation: string, history: number[], success: boolean): void {
    if (history.length < 10) return; // Pas assez de données
    
    const currentTimeout = this.adaptiveTimeouts.get(operation) || this.getBaseTimeout(operation);
    const recentHistory = history.slice(-20); // 20 dernières mesures
    const averageDuration = recentHistory.reduce((sum, d) => sum + d, 0) / recentHistory.length;
    const p95Duration = this.calculatePercentile(recentHistory, 0.95);
    
    let newTimeout = currentTimeout;
    
    if (success) {
      // Si l'opération réussit, ajuster basé sur les performances
      if (averageDuration < currentTimeout * 0.5) {
        // Si la durée moyenne est très inférieure au timeout, le réduire
        newTimeout = Math.max(
          this.config.adaptive.minTimeout,
          currentTimeout * (1 - this.config.adaptive.adjustmentFactor)
        );
      } else if (p95Duration > currentTimeout * 0.8) {
        // Si le P95 est proche du timeout, l'augmenter
        newTimeout = Math.min(
          this.config.adaptive.maxTimeout,
          currentTimeout * (1 + this.config.adaptive.adjustmentFactor)
        );
      }
    } else {
      // Si l'opération échoue, augmenter le timeout
      newTimeout = Math.min(
        this.config.adaptive.maxTimeout,
        currentTimeout * (1 + this.config.adaptive.adjustmentFactor * 2)
      );
    }
    
    this.adaptiveTimeouts.set(operation, newTimeout);
  }

  /**
   * Obtenir le timeout de base pour une opération
   */
  private getBaseTimeout(operation: string): number {
    if (operation.startsWith('tool:')) {
      return this.config.toolCalls.single;
    } else if (operation.startsWith('api:')) {
      const provider = operation.split(':')[1] as keyof typeof this.config.api;
      return this.config.api[provider];
    } else if (operation.startsWith('db:')) {
      const op = operation.split(':')[1] as keyof typeof this.config.database;
      return this.config.database[op];
    } else if (operation.startsWith('cache:')) {
      const type = operation.split(':')[1] as keyof typeof this.config.cache;
      return this.config.cache[type];
    }
    
    return 30000; // 30s par défaut
  }

  /**
   * Calculer un percentile
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Démarrer l'apprentissage adaptatif
   */
  private startAdaptiveLearning(): void {
    if (!this.config.adaptive.enabled) return;
    
    setInterval(() => {
      this.cleanupOldData();
    }, this.config.adaptive.learningPeriod);
  }

  /**
   * Nettoyer les anciennes données
   */
  private cleanupOldData(): void {
    try {
      const now = Date.now();
      const maxAge = this.config.adaptive.learningPeriod;
      
      for (const [operation, history] of this.performanceHistory.entries()) {
        // Garder seulement les données récentes
        if (history.length > 50) {
          this.performanceHistory.set(operation, history.slice(-50));
        }
      }
    } catch (error) {
      console.error('[OptimizedTimeouts] ❌ Error cleaning up old data:', error);
    }
  }

  /**
   * Obtenir les statistiques des timeouts adaptatifs
   */
  getAdaptiveStats(): {
    totalOperations: number;
    adaptiveTimeouts: Record<string, number>;
    performanceHistory: Record<string, number>;
  } {
    const adaptiveTimeouts: Record<string, number> = {};
    const performanceHistory: Record<string, number> = {};
    
    for (const [operation, timeout] of this.adaptiveTimeouts.entries()) {
      adaptiveTimeouts[operation] = timeout;
    }
    
    for (const [operation, history] of this.performanceHistory.entries()) {
      performanceHistory[operation] = history.length;
    }
    
    return {
      totalOperations: this.adaptiveTimeouts.size,
      adaptiveTimeouts,
      performanceHistory,
    };
  }

  /**
   * Réinitialiser les timeouts adaptatifs
   */
  resetAdaptiveTimeouts(): void {
    this.adaptiveTimeouts.clear();
    this.performanceHistory.clear();
    console.log('[OptimizedTimeouts] 🔄 Adaptive timeouts reset');
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(newConfig: Partial<AdaptiveTimeoutConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[OptimizedTimeouts] ⚙️ Configuration updated');
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): AdaptiveTimeoutConfig {
    return { ...this.config };
  }
}

/**
 * Instance singleton des timeouts optimisés
 */
export const optimizedTimeouts = OptimizedTimeouts.getInstance();
