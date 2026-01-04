/**
 * Handlers d'événements WebSocket (close/error)
 * Extrait de XAIVoiceProxyService.ts pour réduire la taille du fichier principal
 */

import { logger, LogCategory } from "./utils/logger";
import { ProxyErrorHandler } from './errorHandler';
import type { ConnectionManager } from './connectionManager';

/**
 * Options pour les event handlers
 */
export interface EventHandlerOptions {
  connectionManager: ConnectionManager;
  closeConnection: (connectionId: string, code: number, reason: string) => void;
}

/**
 * Gère la fermeture du client
 */
export function handleClientClose(
  connectionId: string,
  options: EventHandlerOptions
): void {
  logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Client fermé', {
    connectionId
  });
  options.closeConnection(connectionId, 1000, 'Client closed');
}

/**
 * Gère la fermeture de XAI
 */
export function handleXAIClose(
  connectionId: string,
  code: number | undefined,
  options: EventHandlerOptions
): void {
  logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Connexion XAI fermée', {
    connectionId,
    code
  });
  options.closeConnection(connectionId, code || 1000, 'XAI connection closed');
}

/**
 * Gère une erreur client
 */
export function handleClientError(
  connectionId: string,
  error: Error,
  options: EventHandlerOptions
): void {
  const handled = ProxyErrorHandler.handleError(error, {
    connectionId,
    operation: 'clientError'
  });
  logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] Erreur client', {
    connectionId,
    message: handled.message
  }, error);
  
  if (handled.shouldClose) {
    options.closeConnection(connectionId, 1011, handled.message);
  }
}

/**
 * Gère une erreur XAI
 */
export function handleXAIError(
  connectionId: string,
  error: Error,
  options: EventHandlerOptions
): void {
  const handled = ProxyErrorHandler.handleError(error, {
    connectionId,
    operation: 'xaiError'
  });
  logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] Erreur XAI', {
    connectionId,
    message: handled.message
  }, error);
  
  if (handled.shouldClose) {
    options.closeConnection(connectionId, 1011, handled.message);
  }
}

