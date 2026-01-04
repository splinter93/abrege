/**
 * Service singleton pour le proxy WebSocket XAI Voice
 * Gère les connexions bidirectionnelles entre clients et XAI API
 * Conforme au GUIDE D'EXCELLENCE - Singleton, Error Handling, Logging
 */

import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
// Import relatif depuis server/ vers src/
import { logger, LogCategory } from "./utils/logger";
import { ProxyConnectionMetadata, XAIVoiceProxyConfig } from './types';
import { ProxyErrorHandler, ProxyConnectionError } from './errorHandler';
import type { ActiveConnection } from './connectionTypes';
import { ConnectionManager } from './connectionManager';
import { handleClientMessage, handleXAIMessage } from './messageHandlers';
import { handleClientClose, handleXAIClose, handleClientError, handleXAIError } from './eventHandlers';

/**
 * Service singleton pour gérer le proxy WebSocket XAI Voice
 */
export class XAIVoiceProxyService {
  private static instance: XAIVoiceProxyService | null = null;
  private wss: WebSocketServer | null = null;
  private connectionManager: ConnectionManager;
  private config: XAIVoiceProxyConfig;
  private isRunning = false;

  private constructor(config: XAIVoiceProxyConfig) {
    this.config = config;
    this.connectionManager = new ConnectionManager();
  }

  /**
   * Récupère l'instance singleton
   */
  static getInstance(config: XAIVoiceProxyConfig): XAIVoiceProxyService {
    if (!XAIVoiceProxyService.instance) {
      XAIVoiceProxyService.instance = new XAIVoiceProxyService(config);
    }
    return XAIVoiceProxyService.instance;
  }

  /**
   * Démarre le serveur WebSocket proxy
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn(LogCategory.AUDIO, '[XAIVoiceProxyService] Serveur déjà démarré');
      return;
    }

    try {
      this.wss = new WebSocketServer({
        port: this.config.port,
        path: this.config.path || '/ws/xai-voice'
      });

      this.wss.on('connection', (clientWs: WebSocket) => {
        this.handleClientConnection(clientWs);
      });

      this.wss.on('error', (error: Error) => {
        logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] Erreur serveur WebSocket', undefined, error);
      });

      this.isRunning = true;
      logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] ✅ Serveur démarré', {
        port: this.config.port,
        path: this.config.path || '/ws/xai-voice'
      });
    } catch (error) {
      const handled = ProxyErrorHandler.handleError(error, { operation: 'start' });
      logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ Erreur démarrage serveur', undefined, error instanceof Error ? error : new Error(String(error)));
      throw new ProxyConnectionError(handled.message, undefined, handled.code);
    }
  }

  /**
   * Arrête le serveur WebSocket proxy
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Arrêt du serveur...');

    // Fermer toutes les connexions actives
    for (const [connectionId] of this.connectionManager.getAll()) {
      this.closeConnection(connectionId, 1001, 'Server shutting down');
    }

    // Fermer le serveur
    return new Promise<void>((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          this.isRunning = false;
          this.wss = null;
          logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] ✅ Serveur arrêté');
          resolve();
        });
      } else {
        this.isRunning = false;
        resolve();
      }
    });
  }

  /**
   * Gère une nouvelle connexion client
   */
  private handleClientConnection(clientWs: WebSocket): void {
    const connectionId = this.generateConnectionId();
    const metadata: ProxyConnectionMetadata = {
      connectionId,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      state: 'connecting_client'
    };

    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Nouvelle connexion client', {
      connectionId
    });

    // Stocker la connexion AVANT d'appeler connectToXAI (évite race condition)
    const newConnection: ActiveConnection = {
      clientWs,
      xaiWs: null,
      metadata,
      messageQueue: [],
      audioChunkCount: 0
    };
    this.connectionManager.add(connectionId, newConnection);

    // Vérifier que la connexion est bien stockée
    const storedConnection = this.connectionManager.get(connectionId);
    if (!storedConnection) {
      logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ Connexion non stockée après add()', { connectionId });
      clientWs.close(1011, 'Internal server error');
      return;
    }

    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Connexion stockée, appel connectToXAI', { connectionId });

    // Créer la connexion XAI
    this.connectToXAI(connectionId, metadata).catch((error) => {
      const handled = ProxyErrorHandler.handleError(error, {
        connectionId,
        operation: 'connectToXAI'
      });
      logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ Erreur connexion XAI', {
        connectionId,
        error: handled.message
      }, error instanceof Error ? error : new Error(String(error)));
      clientWs.close(1011, handled.message);
    });

    // Gestion des messages client → XAI
    clientWs.on('message', (data: WebSocket.RawData) => {
      handleClientMessage(connectionId, data, {
        connectionManager: this.connectionManager,
        config: this.config
      });
    });

    // Gestion de la fermeture client
    clientWs.on('close', () => {
      handleClientClose(connectionId, {
        connectionManager: this.connectionManager,
        closeConnection: this.closeConnection.bind(this)
      });
    });

    // Gestion des erreurs client
    clientWs.on('error', (error: Error) => {
      handleClientError(connectionId, error, {
        connectionManager: this.connectionManager,
        closeConnection: this.closeConnection.bind(this)
      });
    });

    // Ping pour maintenir la connexion
    const pingInterval = setInterval(() => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.ping();
      }
    }, this.config.pingInterval || 30000);

    const connection = this.connectionManager.get(connectionId);
    if (connection) {
      connection.pingInterval = pingInterval;
    }
  }

  /**
   * Établit la connexion vers XAI API
   */
  private async connectToXAI(
    connectionId: string,
    metadata: ProxyConnectionMetadata
  ): Promise<void> {
    const connection = this.connectionManager.get(connectionId);
    if (!connection) {
      throw new ProxyConnectionError('Connexion introuvable', connectionId, 'CONNECTION_NOT_FOUND');
    }

    metadata.state = 'connecting_xai';

    try {
      const xaiWs = new WebSocket('wss://api.x.ai/v1/realtime', {
        headers: {
          'Authorization': `Bearer ${this.config.xaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      connection.xaiWs = xaiWs;

      // Attendre l'ouverture
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new ProxyConnectionError('Timeout connexion XAI', connectionId, 'XAI_CONNECTION_TIMEOUT'));
        }, this.config.connectionTimeout || 10000);

        xaiWs.on('open', () => {
          clearTimeout(timeout);
          metadata.state = 'connected';
          metadata.lastActivity = Date.now();
          logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] ✅ Connexion XAI établie', {
            connectionId
          });
          
          // Envoyer les messages en queue une fois la connexion établie
          const storedConnection = this.connectionManager.get(connectionId);
          if (storedConnection && storedConnection.messageQueue.length > 0) {
            logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Envoi messages en queue', {
              connectionId,
              queueLength: storedConnection.messageQueue.length
            });
            for (const queuedMessage of storedConnection.messageQueue) {
              if (xaiWs.readyState === WebSocket.OPEN) {
                xaiWs.send(queuedMessage);
              }
            }
            storedConnection.messageQueue = [];
          }
          
          resolve();
        });

        xaiWs.on('error', (error: Error) => {
          clearTimeout(timeout);
          reject(ProxyErrorHandler.createConnectionError(error, connectionId, 'XAI_CONNECTION_ERROR'));
        });
      });

      // Gestion des messages XAI → Client
      xaiWs.on('message', (data: WebSocket.RawData) => {
        handleXAIMessage(connectionId, data, {
          connectionManager: this.connectionManager,
          config: this.config
        });
      });

      // Gestion de la fermeture XAI
      xaiWs.on('close', (code: number) => {
        handleXAIClose(connectionId, code, {
          connectionManager: this.connectionManager,
          closeConnection: this.closeConnection.bind(this)
        });
      });

      // Gestion des erreurs XAI
      xaiWs.on('error', (error: Error) => {
        handleXAIError(connectionId, error, {
          connectionManager: this.connectionManager,
          closeConnection: this.closeConnection.bind(this)
        });
      });
    } catch (error) {
      metadata.state = 'error';
      throw error;
    }
  }


  /**
   * Ferme une connexion proprement
   */
  private closeConnection(connectionId: string, code: number, reason: string): void {
    try {
      const connection = this.connectionManager.get(connectionId);
      if (!connection) {
        return;
      }
      // Be defensive: callers may accidentally pass strings or invalid codes.
      const safeCode = this.sanitizeCloseCode(Number(code));

      // Arrêter le ping interval
      if (connection.pingInterval) {
        clearInterval(connection.pingInterval);
      }

      // Fermer connexion XAI
      if (connection.xaiWs && (connection.xaiWs.readyState === WebSocket.OPEN || connection.xaiWs.readyState === WebSocket.CLOSING)) {
        try {
          connection.xaiWs.close(safeCode, reason);
        } catch (err) {
          logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ Erreur close() XAI, terminate()', {
            connectionId,
            safeCode,
            reason
          }, err instanceof Error ? err : new Error(String(err)));
          try { connection.xaiWs.terminate(); } catch { /* ignore */ }
        }
      }

      // Fermer connexion client
      if (connection.clientWs.readyState === WebSocket.OPEN || connection.clientWs.readyState === WebSocket.CLOSING) {
        try {
          connection.clientWs.close(safeCode, reason);
        } catch (err) {
          logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ Erreur close() client, terminate()', {
            connectionId,
            safeCode,
            reason
          }, err instanceof Error ? err : new Error(String(err)));
          try { connection.clientWs.terminate(); } catch { /* ignore */ }
        }
      }

      // Retirer de la Map
      this.connectionManager.delete(connectionId);
      connection.metadata.state = 'disconnected';
      
      logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Connexion fermée', {
        connectionId,
        code,
        safeCode,
        reason
      });
    } catch (err) {
      logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ closeConnection() a levé une exception (ignorée)', {
        connectionId,
        code,
        reason
      }, err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Génère un ID unique pour une connexion
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Récupère le nombre de connexions actives
   */
  getActiveConnectionsCount(): number {
    return this.connectionManager.count();
  }

  /**
   * Vérifie si le serveur est en cours d'exécution
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }
  /**
   * ws n'autorise pas certains codes (ex: 1006/1015). On les remplace par un code valide.
   */
  private sanitizeCloseCode(code: number): number {
    if (!Number.isFinite(code)) return 1000;
    if (!Number.isInteger(code)) return 1000;
    // 1006/1015 sont des codes réservés (ne doivent pas être envoyés sur le wire)
    if (code === 1006 || code === 1015) return 1000;
    if (code < 1000 || code > 4999) return 1000;
    return code;
  }
}

