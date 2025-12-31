/**
 * Service de retry automatique pour erreurs réseau
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Services avec retry logic
 * - Error handling 3 niveaux
 * - TypeScript strict (0 any)
 * - Logging structuré
 * 
 * @module services/network/NetworkRetryService
 */

import { simpleLogger as logger } from '@/utils/logger';

/**
 * Types d'erreurs réseau récupérables
 */
export enum RecoverableNetworkError {
  TIMEOUT = 'timeout',
  BAD_GATEWAY = 'bad_gateway',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  RATE_LIMIT = 'rate_limit',
  NETWORK_ERROR = 'network_error'
}

/**
 * Erreur réseau enrichie
 * 
 * Conforme GUIDE-EXCELLENCE-CODE.md :
 * - Interface explicite (pas de any)
 * - Type guard pour unions
 */
export interface NetworkError extends Error {
  statusCode?: number;
  errorType?: RecoverableNetworkError;
  isRecoverable?: boolean;
}

/**
 * Type guard pour vérifier si une erreur est une NetworkError
 * 
 * @param error - Erreur à vérifier
 * @returns true si c'est une NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof Error && 'isRecoverable' in error;
}

/**
 * Options de retry
 */
export interface RetryOptions {
  /**
   * Nombre maximum de tentatives (défaut: 3)
   */
  maxRetries?: number;
  
  /**
   * Délai initial en ms (défaut: 1000)
   */
  initialDelay?: number;
  
  /**
   * Multiplicateur pour exponential backoff (défaut: 2)
   */
  backoffMultiplier?: number;
  
  /**
   * Délai maximum entre tentatives en ms (défaut: 10000)
   */
  maxDelay?: number;
  
  /**
   * Nom de l'opération pour logging
   */
  operationName?: string;
}

/**
 * Résultat d'une tentative
 */
interface RetryAttempt {
  attempt: number;
  success: boolean;
  error?: NetworkError;
  delay: number;
}

/**
 * Service singleton pour gérer les retries réseau
 * 
 * Pattern conforme GUIDE :
 * - Singleton si stateful (pas de state ici, mais pattern cohérent)
 * - Retry logic dans services
 * - Error handling 3 niveaux
 */
export class NetworkRetryService {
  private static instance: NetworkRetryService;
  
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_INITIAL_DELAY = 1000; // 1s
  private readonly DEFAULT_BACKOFF_MULTIPLIER = 2;
  private readonly DEFAULT_MAX_DELAY = 10000; // 10s

  private constructor() {
    // Private constructor pour singleton
  }

  /**
   * Récupère l'instance singleton
   */
  static getInstance(): NetworkRetryService {
    if (!NetworkRetryService.instance) {
      NetworkRetryService.instance = new NetworkRetryService();
    }
    return NetworkRetryService.instance;
  }

  /**
   * Vérifie si une erreur est récupérable
   * 
   * Erreurs récupérables :
   * - Timeout (pas de réponse)
   * - 502 Bad Gateway (serveur intermédiaire)
   * - 503 Service Unavailable (surcharge temporaire)
   * - 429 Rate Limit (avec retry-after)
   * - Erreurs réseau (pas de connexion)
   * 
   * Erreurs NON récupérables :
   * - 400 Bad Request (validation)
   * - 401 Unauthorized (auth)
   * - 403 Forbidden (permissions)
   * - 404 Not Found
   * - 413 Payload Too Large
   * 
   * @param error - Erreur à vérifier
   * @returns true si récupérable, false sinon
   */
  isRecoverableError(error: unknown): error is NetworkError {
    if (!(error instanceof Error)) {
      return false;
    }

    const networkError = error as NetworkError;
    
    // ✅ PRIORITÉ 1 : Si isRecoverable est explicitement défini, l'utiliser
    if (networkError.isRecoverable !== undefined) {
      return networkError.isRecoverable;
    }
    
    // ✅ PRIORITÉ 2 : Vérifier le status code HTTP
    if (networkError.statusCode !== undefined) {
      const recoverableStatusCodes = [502, 503, 429];
      if (recoverableStatusCodes.includes(networkError.statusCode)) {
        return true;
      }
      
      // Status codes non récupérables
      const nonRecoverableStatusCodes = [400, 401, 403, 404, 413];
      if (nonRecoverableStatusCodes.includes(networkError.statusCode)) {
        return false;
      }
    }

    // ✅ PRIORITÉ 3 : Vérifier le type d'erreur
    if (networkError.errorType) {
      return [
        RecoverableNetworkError.TIMEOUT,
        RecoverableNetworkError.BAD_GATEWAY,
        RecoverableNetworkError.SERVICE_UNAVAILABLE,
        RecoverableNetworkError.RATE_LIMIT,
        RecoverableNetworkError.NETWORK_ERROR
      ].includes(networkError.errorType);
    }

    // ✅ PRIORITÉ 4 : Vérifier le message d'erreur pour détecter timeout/network
    const errorMessage = error.message.toLowerCase();
    const networkKeywords = ['timeout', 'network', 'failed to fetch', 'connection', 'econnrefused'];
    
    if (networkKeywords.some(keyword => errorMessage.includes(keyword))) {
      return true;
    }

    return false;
  }

  /**
   * Crée une erreur réseau typée depuis une Response fetch
   * 
   * @param response - Response fetch avec status non-OK
   * @param originalError - Erreur originale (optionnel)
   * @returns NetworkError typée
   */
  createNetworkError(response: Response, originalError?: Error): NetworkError {
    const statusCode = response.status;
    let errorType: RecoverableNetworkError | undefined;
    let isRecoverable = false;

    switch (statusCode) {
      case 502:
        errorType = RecoverableNetworkError.BAD_GATEWAY;
        isRecoverable = true;
        break;
      case 503:
        errorType = RecoverableNetworkError.SERVICE_UNAVAILABLE;
        isRecoverable = true;
        break;
      case 429:
        errorType = RecoverableNetworkError.RATE_LIMIT;
        isRecoverable = true;
        break;
      default:
        isRecoverable = false;
    }

    const error = (originalError || new Error(`HTTP ${statusCode}: ${response.statusText}`)) as NetworkError;
    error.statusCode = statusCode;
    error.errorType = errorType;
    error.isRecoverable = isRecoverable;

    return error;
  }

  /**
   * Crée une erreur réseau typée depuis une exception
   * 
   * @param exception - Exception (Error ou autre)
   * @returns NetworkError typée
   */
  createNetworkErrorFromException(exception: unknown): NetworkError {
    // Si c'est déjà une NetworkError avec les propriétés, la retourner telle quelle
    if (exception instanceof Error) {
      const error = exception as NetworkError;
      
      // Si l'erreur a déjà errorType et isRecoverable, c'est une NetworkError complète
      if (error.errorType !== undefined && error.isRecoverable !== undefined) {
        return error;
      }
      
      // Détecter le type d'erreur depuis le message
      const message = error.message.toLowerCase();
      
      if (message.includes('timeout')) {
        error.errorType = RecoverableNetworkError.TIMEOUT;
        error.isRecoverable = true;
      } else if (message.includes('network') || message.includes('fetch')) {
        error.errorType = RecoverableNetworkError.NETWORK_ERROR;
        error.isRecoverable = true;
      } else {
        error.errorType = RecoverableNetworkError.NETWORK_ERROR;
        error.isRecoverable = false; // Par défaut, non récupérable si on ne sait pas
      }

      return error;
    }

    // Fallback pour erreurs non-Error
    const error = new Error(String(exception)) as NetworkError;
    error.errorType = RecoverableNetworkError.NETWORK_ERROR;
    error.isRecoverable = false;
    
    return error;
  }

  /**
   * Calcule le délai pour exponential backoff
   * 
   * @param attempt - Numéro de tentative (1-based)
   * @param options - Options de retry
   * @returns Délai en ms
   */
  private calculateDelay(attempt: number, options: RetryOptions): number {
    const initialDelay = options.initialDelay || this.DEFAULT_INITIAL_DELAY;
    const multiplier = options.backoffMultiplier || this.DEFAULT_BACKOFF_MULTIPLIER;
    const maxDelay = options.maxDelay || this.DEFAULT_MAX_DELAY;

    // Exponential backoff: delay = initialDelay * (multiplier ^ (attempt - 1))
    const delay = initialDelay * Math.pow(multiplier, attempt - 1);
    
    // Limiter au maxDelay
    return Math.min(delay, maxDelay);
  }

  /**
   * Attend le délai avant la prochaine tentative
   * 
   * @param delay - Délai en ms
   * @returns Promise qui se résout après le délai
   */
  private async wait(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Exécute une fonction avec retry automatique
   * 
   * Pattern conforme GUIDE :
   * - Error handling 3 niveaux
   * - Retry logic dans services
   * - Logging structuré
   * 
   * @param fn - Fonction async à exécuter
   * @param options - Options de retry
   * @returns Résultat de la fonction
   * @throws {NetworkError} Si toutes les tentatives échouent
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || this.DEFAULT_MAX_RETRIES;
    const operationName = options.operationName || 'operation';
    
    let lastError: NetworkError | undefined;
    const attempts: RetryAttempt[] = [];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.dev(`[NetworkRetryService] 🔄 Tentative ${attempt}/${maxRetries} pour ${operationName}`);
        
        const result = await fn();
        
        // Succès
        if (attempt > 1) {
          logger.info(`[NetworkRetryService] ✅ Succès après ${attempt} tentatives pour ${operationName}`, {
            operationName,
            attempts: attempt,
            totalDelay: attempts.reduce((sum, a) => sum + a.delay, 0)
          });
        }
        
        return result;

      } catch (error) {
        // Créer une NetworkError typée
        const networkError: NetworkError = this.createNetworkErrorFromException(error);
        
        // Vérifier si récupérable
        if (!this.isRecoverableError(networkError)) {
          logger.warn(`[NetworkRetryService] ⚠️ Erreur non récupérable pour ${operationName}:`, {
            operationName,
            errorType: networkError.errorType,
            statusCode: networkError.statusCode,
            message: networkError.message
          });
          throw networkError;
        }

        lastError = networkError;
        
        // Calculer le délai pour la prochaine tentative
        const delay = attempt < maxRetries 
          ? this.calculateDelay(attempt, options)
          : 0;

        attempts.push({
          attempt,
          success: false,
          error: networkError,
          delay
        });

        logger.warn(`[NetworkRetryService] ⚠️ Tentative ${attempt}/${maxRetries} échouée pour ${operationName}:`, {
          operationName,
          attempt,
          maxRetries,
          errorType: networkError.errorType,
          statusCode: networkError.statusCode,
          message: networkError.message,
          nextDelay: delay > 0 ? `${delay}ms` : 'none (dernière tentative)'
        });

        // Si ce n'est pas la dernière tentative, attendre avant de réessayer
        if (attempt < maxRetries && delay > 0) {
          await this.wait(delay);
        }
      }
    }

    // Toutes les tentatives ont échoué
    logger.error(`[NetworkRetryService] ❌ Toutes les tentatives échouées pour ${operationName}:`, {
      operationName,
      maxRetries,
      attempts: attempts.length,
      totalDelay: attempts.reduce((sum, a) => sum + a.delay, 0),
      lastError: lastError ? {
        type: lastError.errorType,
        statusCode: lastError.statusCode,
        message: lastError.message
      } : undefined
    });

    throw lastError || new Error(`Toutes les tentatives échouées pour ${operationName}`);
  }
}

/**
 * Instance singleton exportée
 */
export const networkRetryService = NetworkRetryService.getInstance();

