/**
 * Service de gestion d'erreurs robuste pour les agents spécialisés
 * Classification, logging et récupération intelligente des erreurs
 */

import { 
  AgentError, 
  AgentErrorCode, 
  AgentMetadata 
} from '../types/AgentTypes';
import { simpleLogger as logger } from '@/utils/logger';

export class AgentErrorHandler {
  /**
   * Crée une erreur typée à partir d'une exception
   */
  static createError(
    error: unknown,
    context: {
      agentId: string;
      traceId?: string;
      operation: string;
    }
  ): AgentError {
    const errorCode = this.classifyError(error);
    const message = this.extractErrorMessage(error);
    
    const agentError: AgentError = {
      code: errorCode,
      message: this.normalizeErrorMessage(message),
      details: {
        agentId: context.agentId,
        operation: context.operation,
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      traceId: context.traceId
    };

    this.logError(agentError);
    return agentError;
  }

  /**
   * Classifie une erreur selon son type
   */
  private static classifyError(error: unknown): AgentErrorCode {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Erreurs d'authentification
      if (message.includes('token') || message.includes('unauthorized') || message.includes('authentication')) {
        return 'INVALID_TOKEN';
      }

      // Erreurs de validation
      if (message.includes('validation') || message.includes('invalid') || message.includes('format')) {
        return 'VALIDATION_FAILED';
      }

      // Erreurs d'agent
      if (message.includes('agent') && (message.includes('not found') || message.includes('not found'))) {
        return 'AGENT_NOT_FOUND';
      }

      // Erreurs d'input
      if (message.includes('input') || message.includes('argument')) {
        return 'INVALID_INPUT';
      }

      // Erreurs multimodales
      if (message.includes('multimodal') || message.includes('image') || message.includes('stream')) {
        return 'MULTIMODAL_ERROR';
      }

      // Erreurs de cache
      if (message.includes('cache') || message.includes('memory')) {
        return 'CACHE_ERROR';
      }
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Extrait le message d'erreur
   */
  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      const obj = error as Record<string, unknown>;
      if (typeof obj.message === 'string') {
        return obj.message;
      }
      if (typeof obj.error === 'string') {
        return obj.error;
      }
    }

    return 'Erreur inconnue';
  }

  /**
   * Normalise le message d'erreur
   */
  private static normalizeErrorMessage(message: string): string {
    return message
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
      .replace(/[^\w\s\-.,!?]/g, '') // Supprimer les caractères spéciaux
      .substring(0, 500); // Limiter la longueur
  }

  /**
   * Log une erreur avec le niveau approprié
   */
  private static logError(error: AgentError): void {
    const logData = {
      code: error.code,
      message: error.message,
      agentId: error.details?.agentId,
      operation: error.details?.operation,
      traceId: error.traceId
    };

    switch (error.code) {
      case 'INVALID_TOKEN':
      case 'INVALID_AGENT_ID':
      case 'INVALID_INPUT':
        logger.warn(`[AgentErrorHandler] ⚠️ ${error.code}:`, logData);
        break;
      
      case 'AGENT_NOT_FOUND':
      case 'VALIDATION_FAILED':
        logger.warn(`[AgentErrorHandler] ⚠️ ${error.code}:`, logData);
        break;
      
      case 'EXECUTION_FAILED':
      case 'MULTIMODAL_ERROR':
        logger.error(`[AgentErrorHandler] ❌ ${error.code}:`, logData);
        break;
      
      case 'CACHE_ERROR':
        logger.warn(`[AgentErrorHandler] ⚠️ ${error.code}:`, logData);
        break;
      
      case 'UNKNOWN_ERROR':
      default:
        logger.error(`[AgentErrorHandler] ❌ ${error.code}:`, logData);
        break;
    }
  }

  /**
   * Détermine si une erreur est récupérable
   */
  static isRecoverableError(error: AgentError): boolean {
    const recoverableCodes: AgentErrorCode[] = [
      'MULTIMODAL_ERROR',
      'CACHE_ERROR',
      'EXECUTION_FAILED'
    ];

    return recoverableCodes.includes(error.code);
  }

  /**
   * Détermine si une erreur nécessite un retry
   */
  static shouldRetry(error: AgentError, retryCount: number = 0): boolean {
    const maxRetries = 3;
    
    if (retryCount >= maxRetries) {
      return false;
    }

    const retryableCodes: AgentErrorCode[] = [
      'EXECUTION_FAILED',
      'MULTIMODAL_ERROR',
      'CACHE_ERROR'
    ];

    return retryableCodes.includes(error.code);
  }

  /**
   * Calcule le délai de retry avec backoff exponentiel
   */
  static getRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 seconde
    const maxDelay = 10000; // 10 secondes
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    
    // Ajouter un peu de jitter pour éviter les collisions
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Crée une réponse d'erreur standardisée
   */
  static createErrorResponse(
    error: AgentError,
    metadata: AgentMetadata
  ): {
    success: false;
    error: string;
    metadata: AgentMetadata;
  } {
    return {
      success: false,
      error: error.message,
      metadata: {
        ...metadata,
        traceId: error.traceId || metadata.traceId
      }
    };
  }

  /**
   * Gère une erreur avec retry automatique
   */
  static async handleWithRetry<T>(
    operation: () => Promise<T>,
    context: {
      agentId: string;
      traceId?: string;
      operation: string;
    },
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: AgentError | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const agentError = this.createError(error, context);
        lastError = agentError;

        if (!this.shouldRetry(agentError, attempt) || attempt === maxRetries) {
          break;
        }

        const delay = this.getRetryDelay(attempt);
        logger.info(`[AgentErrorHandler] 🔄 Retry ${attempt + 1}/${maxRetries} dans ${delay}ms`, {
          traceId: context.traceId,
          error: agentError.message
        });

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Erreur inconnue après retry');
  }

  /**
   * Sleep utilitaire
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Valide une erreur
   */
  static validateError(error: AgentError): boolean {
    if (!error.code || !error.message) {
      return false;
    }

    if (typeof error.code !== 'string' || typeof error.message !== 'string') {
      return false;
    }

    if (error.message.length === 0 || error.message.length > 1000) {
      return false;
    }

    return true;
  }

  /**
   * Crée un rapport d'erreur pour le monitoring
   */
  static createErrorReport(errors: AgentError[]): {
    totalErrors: number;
    errorsByCode: Record<AgentErrorCode, number>;
    mostCommonError: AgentErrorCode | null;
    recentErrors: AgentError[];
  } {
    const errorsByCode = errors.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<AgentErrorCode, number>);

    const mostCommonError = Object.entries(errorsByCode)
      .sort(([, a], [, b]) => b - a)[0]?.[0] as AgentErrorCode | null;

    const recentErrors = errors
      .sort((a, b) => (b.details?.timestamp || 0) - (a.details?.timestamp || 0))
      .slice(0, 10);

    return {
      totalErrors: errors.length,
      errorsByCode,
      mostCommonError,
      recentErrors
    };
  }
}
