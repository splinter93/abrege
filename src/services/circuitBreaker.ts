/**
 * Circuit Breaker global pour protéger contre les services défaillants
 * Pattern: Closed → Open → Half-Open → Closed
 */

import { simpleLogger as logger } from '@/utils/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Fonctionnement normal
  OPEN = 'OPEN',         // Circuit ouvert (service down)
  HALF_OPEN = 'HALF_OPEN' // Test de rétablissement
}

interface CircuitConfig {
  failureThreshold: number;    // Nombre d'échecs avant ouverture
  successThreshold: number;    // Nombre de succès pour fermer
  timeout: number;             // Temps avant test (half-open)
  resetTimeout: number;        // Temps avant reset complet
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
  totalFailures: number;
}

/**
 * Circuit Breaker pour un service spécifique
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalCalls: number = 0;
  private totalFailures: number = 0;
  private readonly config: CircuitConfig;
  private readonly serviceName: string;

  constructor(serviceName: string, config: Partial<CircuitConfig> = {}) {
    this.serviceName = serviceName;
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000, // 1 minute
      resetTimeout: config.resetTimeout || 300000 // 5 minutes
    };
  }

  /**
   * Exécuter une fonction avec protection circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Vérifier l'état du circuit
    await this.checkState();

    // Si circuit ouvert, refuser immédiatement
    if (this.state === CircuitState.OPEN) {
      const error = new Error(`Circuit breaker OPEN pour ${this.serviceName}`);
      logger.warn(`[CircuitBreaker] ⛔ ${this.serviceName} - Circuit OPEN, appel refusé`);
      throw error;
    }

    this.totalCalls++;

    try {
      // Exécuter la fonction
      const result = await fn();
      
      // Enregistrer le succès
      this.recordSuccess();
      
      return result;
      
    } catch (error) {
      // Enregistrer l'échec
      this.recordFailure();
      
      throw error;
    }
  }

  /**
   * Vérifier et mettre à jour l'état du circuit
   */
  private async checkState(): Promise<void> {
    const now = Date.now();

    // OPEN → HALF_OPEN après timeout
    if (this.state === CircuitState.OPEN && this.lastFailureTime) {
      const timeSinceFailure = now - this.lastFailureTime;
      
      if (timeSinceFailure >= this.config.timeout) {
        logger.info(`[CircuitBreaker] 🔓 ${this.serviceName} - Passage OPEN → HALF_OPEN (test)`);
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
      }
    }

    // Reset complet après resetTimeout
    if (this.lastSuccessTime) {
      const timeSinceSuccess = now - this.lastSuccessTime;
      
      if (timeSinceSuccess >= this.config.resetTimeout) {
        logger.info(`[CircuitBreaker] 🔄 ${this.serviceName} - Reset complet après ${this.config.resetTimeout}ms`);
        this.reset();
      }
    }
  }

  /**
   * Enregistrer un succès
   */
  private recordSuccess(): void {
    this.lastSuccessTime = Date.now();
    this.failures = 0; // Reset compteur d'échecs

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      
      logger.dev(`[CircuitBreaker] ✅ ${this.serviceName} - Succès en HALF_OPEN (${this.successes}/${this.config.successThreshold})`);
      
      // HALF_OPEN → CLOSED après succès threshold
      if (this.successes >= this.config.successThreshold) {
        logger.info(`[CircuitBreaker] 🟢 ${this.serviceName} - Passage HALF_OPEN → CLOSED (rétabli)`);
        this.state = CircuitState.CLOSED;
        this.successes = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      logger.dev(`[CircuitBreaker] ✅ ${this.serviceName} - Succès en CLOSED`);
    }
  }

  /**
   * Enregistrer un échec
   */
  private recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failures++;
    this.totalFailures++;

    logger.warn(`[CircuitBreaker] ⚠️ ${this.serviceName} - Échec (${this.failures}/${this.config.failureThreshold})`);

    // CLOSED → OPEN après failure threshold
    if (this.state === CircuitState.CLOSED && this.failures >= this.config.failureThreshold) {
      logger.error(`[CircuitBreaker] 🔴 ${this.serviceName} - Passage CLOSED → OPEN (service down)`);
      this.state = CircuitState.OPEN;
      this.successes = 0;
    }
    
    // HALF_OPEN → OPEN immédiatement si échec pendant test
    else if (this.state === CircuitState.HALF_OPEN) {
      logger.error(`[CircuitBreaker] 🔴 ${this.serviceName} - Passage HALF_OPEN → OPEN (test échoué)`);
      this.state = CircuitState.OPEN;
      this.successes = 0;
    }
  }

  /**
   * Reset complet du circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    logger.info(`[CircuitBreaker] 🔄 ${this.serviceName} - Circuit breaker réinitialisé`);
  }

  /**
   * Forcer l'ouverture du circuit
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = Date.now();
    logger.warn(`[CircuitBreaker] ⛔ ${this.serviceName} - Circuit forcé OPEN`);
  }

  /**
   * Forcer la fermeture du circuit
   */
  forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    logger.info(`[CircuitBreaker] 🟢 ${this.serviceName} - Circuit forcé CLOSED`);
  }

  /**
   * Obtenir les statistiques du circuit
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures
    };
  }

  /**
   * Obtenir l'état actuel
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Vérifier si le circuit est ouvert
   */
  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Vérifier si le circuit est fermé
   */
  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Vérifier si le circuit est en test (half-open)
   */
  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }
}

/**
 * Manager global de circuit breakers
 */
class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Obtenir ou créer un circuit breaker pour un service
   */
  getBreaker(serviceName: string, config?: Partial<CircuitConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const breaker = new CircuitBreaker(serviceName, config);
      this.breakers.set(serviceName, breaker);
      logger.info(`[CircuitBreakerManager] ✨ Circuit breaker créé pour ${serviceName}`);
    }
    
    return this.breakers.get(serviceName)!;
  }

  /**
   * Obtenir tous les circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Obtenir les statistiques globales
   */
  getGlobalStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    
    return stats;
  }

  /**
   * Reset tous les circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('[CircuitBreakerManager] 🔄 Tous les circuit breakers réinitialisés');
  }

  /**
   * Obtenir un résumé des services en panne
   */
  getFailedServices(): string[] {
    const failed: string[] = [];
    
    for (const [name, breaker] of this.breakers.entries()) {
      if (breaker.isOpen()) {
        failed.push(name);
      }
    }
    
    return failed;
  }
}

// Instance singleton
export const circuitBreakerManager = new CircuitBreakerManager();

// ✅ Circuit breakers préconfigurés pour les services critiques
export const groqCircuitBreaker = circuitBreakerManager.getBreaker('groq', {
  failureThreshold: 3, // 3 échecs consécutifs
  successThreshold: 2, // 2 succès pour rétablir
  timeout: 30000,      // 30s avant test
  resetTimeout: 300000 // 5min avant reset
});

export const supabaseCircuitBreaker = circuitBreakerManager.getBreaker('supabase', {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 15000,
  resetTimeout: 180000 // 3min
});

export const mcpCircuitBreaker = circuitBreakerManager.getBreaker('mcp', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 60000, // MCP peut prendre plus de temps
  resetTimeout: 300000
});

logger.info('[CircuitBreaker] Services de circuit breaker initialisés');

