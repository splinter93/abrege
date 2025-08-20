/**
 * Utilitaires de retry avec backoff exponentiel
 * Améliore la robustesse des appels API et des opérations réseau
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 seconde
  maxDelay: 10000, // 10 secondes max
  backoffMultiplier: 2,
  jitter: true
};

/**
 * Retry avec backoff exponentiel et jitter
 * Évite le "thundering herd" en ajoutant de l'aléatoire
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Dernière tentative échouée
      if (attempt === finalConfig.maxRetries) {
        throw lastError;
      }
      
      // Calculer le délai avec backoff exponentiel
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelay
      );
      
      // Ajouter du jitter pour éviter la synchronisation
      const jitteredDelay = finalConfig.jitter 
        ? delay * (0.5 + Math.random() * 0.5)
        : delay;
      
      console.log(`[RetryUtils] 🔄 Tentative ${attempt + 1}/${finalConfig.maxRetries + 1} échouée, retry dans ${jitteredDelay.toFixed(0)}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  // Ce code ne devrait jamais être atteint
  throw lastError!;
}

/**
 * Retry avec condition personnalisée
 * Permet de retry seulement si l'erreur est récupérable
 */
export async function retryWithCondition<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: Error, attempt: number) => boolean,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Vérifier si on doit retry
      if (!shouldRetry(lastError, attempt) || attempt === finalConfig.maxRetries) {
        throw lastError;
      }
      
      // Calculer le délai
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelay
      );
      
      const jitteredDelay = finalConfig.jitter 
        ? delay * (0.5 + Math.random() * 0.5)
        : delay;
      
      console.log(`[RetryUtils] 🔄 Retry conditionnel ${attempt + 1}/${finalConfig.maxRetries + 1} dans ${jitteredDelay.toFixed(0)}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError!;
}

/**
 * Retry avec timeout
 * Évite les opérations qui traînent trop longtemps
 */
export async function retryWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  return retryWithCondition(
    () => Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      )
    ]),
    (error, attempt) => {
      // Retry seulement si c'est un timeout
      return error.message === 'Timeout' && attempt < finalConfig.maxRetries;
    },
    config
  );
}

/**
 * Retry avec circuit breaker simple
 * Arrête les retry si trop d'erreurs consécutives
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  
  constructor(failureThreshold = 5, resetTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private isOpen(): boolean {
    if (this.failureCount >= this.failureThreshold) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.resetTimeout) {
        return true; // Circuit ouvert
      } else {
        this.reset(); // Reset automatique après timeout
      }
    }
    return false;
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }
  
  private reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    console.log('[CircuitBreaker] 🔄 Circuit reset automatique');
  }
  
  getStatus(): { isOpen: boolean; failureCount: number; timeUntilReset: number } {
    const timeUntilReset = Math.max(0, this.resetTimeout - (Date.now() - this.lastFailureTime));
    return {
      isOpen: this.isOpen(),
      failureCount: this.failureCount,
      timeUntilReset
    };
  }
} 