/**
 * Gestion d'erreurs centralisée pour le proxy WebSocket XAI Voice
 * Conforme au GUIDE D'EXCELLENCE - Error Handling (3 niveaux)
 */

// Import relatif depuis server/ vers src/
import { logger, LogCategory } from "../utils/logger';

/**
 * Erreur de connexion proxy
 */
export class ProxyConnectionError extends Error {
  constructor(
    message: string,
    public connectionId?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ProxyConnectionError';
    Object.setPrototypeOf(this, ProxyConnectionError.prototype);
  }
}

/**
 * Erreur API XAI
 */
export class XAIAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'XAIAPIError';
    Object.setPrototypeOf(this, XAIAPIError.prototype);
  }
}

/**
 * Erreur de configuration
 */
export class ProxyConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProxyConfigError';
    Object.setPrototypeOf(this, ProxyConfigError.prototype);
  }
}

/**
 * Handler centralisé d'erreurs pour le proxy
 * Niveau 1 : Catch spécifique
 * Niveau 2 : Fallback gracieux
 * Niveau 3 : User-facing (via WebSocket close)
 */
export class ProxyErrorHandler {
  /**
   * Traite une erreur et retourne un message utilisateur-friendly
   */
  static handleError(
    error: unknown,
    context: {
      connectionId?: string;
      operation: string;
      userId?: string;
    }
  ): { message: string; code?: string; shouldClose: boolean } {
    // Niveau 1 : Catch spécifique
    if (error instanceof ProxyConnectionError) {
      logger.error(LogCategory.AUDIO, '[ProxyErrorHandler] ProxyConnectionError', {
        connectionId: error.connectionId || context.connectionId,
        operation: context.operation,
        code: error.code,
        message: error.message
      }, error);
      
      return {
        message: 'Erreur de connexion proxy',
        code: error.code || 'PROXY_CONNECTION_ERROR',
        shouldClose: true
      };
    }

    if (error instanceof XAIAPIError) {
      logger.error(LogCategory.AUDIO, '[ProxyErrorHandler] XAIAPIError', {
        connectionId: context.connectionId,
        operation: context.operation,
        statusCode: error.statusCode,
        message: error.message
      }, error);
      
      return {
        message: `Erreur API XAI: ${error.statusCode || 'Unknown'}`,
        code: 'XAI_API_ERROR',
        shouldClose: true
      };
    }

    if (error instanceof ProxyConfigError) {
      logger.error(LogCategory.AUDIO, '[ProxyErrorHandler] ProxyConfigError', {
        operation: context.operation,
        message: error.message
      }, error);
      
      return {
        message: 'Erreur de configuration proxy',
        code: 'PROXY_CONFIG_ERROR',
        shouldClose: false // Ne pas fermer toutes les connexions pour une erreur de config
      };
    }

    // Niveau 2 : Fallback gracieux
    if (error instanceof Error) {
      logger.error(LogCategory.AUDIO, '[ProxyErrorHandler] Generic Error', {
        connectionId: context.connectionId,
        operation: context.operation,
        errorName: error.name,
        message: error.message,
        stack: error.stack
      }, error);
      
      return {
        message: 'Erreur interne du proxy',
        code: 'INTERNAL_ERROR',
        shouldClose: true
      };
    }

    // Niveau 3 : User-facing (erreur inconnue)
    const errorMessage = typeof error === 'string' ? error : 'Erreur inconnue';
    logger.error(LogCategory.AUDIO, '[ProxyErrorHandler] Unknown Error', {
      connectionId: context.connectionId,
      operation: context.operation,
      errorType: typeof error,
      errorMessage
    });
    
    return {
      message: 'Erreur inconnue',
      code: 'UNKNOWN_ERROR',
      shouldClose: true
    };
  }

  /**
   * Crée une erreur ProxyConnectionError depuis une erreur WebSocket
   */
  static createConnectionError(
    error: unknown,
    connectionId: string,
    code?: string
  ): ProxyConnectionError {
    const message = error instanceof Error ? error.message : String(error);
    return new ProxyConnectionError(message, connectionId, code);
  }

  /**
   * Crée une erreur XAIAPIError depuis une réponse HTTP
   */
  static createXAIAPIError(
    message: string,
    statusCode?: number,
    response?: unknown
  ): XAIAPIError {
    return new XAIAPIError(message, statusCode, response);
  }
}

