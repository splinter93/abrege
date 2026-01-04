/**
 * Service singleton pour le proxy WebSocket XAI Voice
 * Gère les connexions bidirectionnelles entre clients et XAI API
 * Conforme au GUIDE D'EXCELLENCE - Singleton, Error Handling, Logging
 */

import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
// Import relatif depuis server/ vers src/
import { logger, LogCategory } from '../../src/utils/logger';
import { ProxyConnectionMetadata, ProxyConnectionState, ProxyConnectionOptions, XAIVoiceProxyConfig } from './types';
import { ProxyErrorHandler, ProxyConnectionError, XAIAPIError } from './errorHandler';

/**
 * Connexion proxy active
 */
interface ActiveConnection {
  clientWs: WebSocket;
  xaiWs: WebSocket | null;
  metadata: ProxyConnectionMetadata;
  pingInterval?: NodeJS.Timeout;
  messageQueue: string[]; // Queue (text frames) pour les messages reçus avant connexion XAI
  audioChunkCount?: number; // Compteur pour dump WAV (1 chunk sur N)
}

/**
 * Helper pour calculer la longueur de WebSocket.RawData
 * Note: Type assertion utilisée car TypeScript a du mal avec l'union type complexe de ws
 */
function getRawDataLength(data: WebSocket.RawData): number | string {
  // Type assertion nécessaire car TypeScript ne peut pas bien inférer le type union
  const dataTyped = data as string | Buffer | ArrayBuffer | Buffer[];
  if (typeof dataTyped === 'string') {
    return dataTyped.length;
  }
  if (Buffer.isBuffer(dataTyped)) {
    return dataTyped.length;
  }
  if (dataTyped instanceof ArrayBuffer) {
    return dataTyped.byteLength;
  }
  if (Array.isArray(dataTyped)) {
    return dataTyped.reduce((acc: number, buf: Buffer) => {
      return acc + (Buffer.isBuffer(buf) ? buf.length : 0);
    }, 0);
  }
  return 'unknown';
}

/**
 * Service singleton pour gérer le proxy WebSocket XAI Voice
 */
export class XAIVoiceProxyService {
  private static instance: XAIVoiceProxyService | null = null;
  private wss: WebSocketServer | null = null;
  private connections: Map<string, ActiveConnection> = new Map();
  private config: XAIVoiceProxyConfig;
  private isRunning = false;

  private constructor(config: XAIVoiceProxyConfig) {
    this.config = config;
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
    for (const [connectionId, connection] of this.connections.entries()) {
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
    this.connections.set(connectionId, {
      clientWs,
      xaiWs: null,
      metadata,
      messageQueue: [],
      audioChunkCount: 0
    });

    // Vérifier que la connexion est bien stockée
    const storedConnection = this.connections.get(connectionId);
    if (!storedConnection) {
      logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ Connexion non stockée après set()', { connectionId });
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
      const dataLength = getRawDataLength(data);
      logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] 📨 Message reçu du client (avant handleClientMessage)', {
        connectionId,
        dataType: typeof data,
        dataLength
      });
      this.handleClientMessage(connectionId, data);
    });

    // Gestion de la fermeture client
    clientWs.on('close', () => {
      this.handleClientClose(connectionId);
    });

    // Gestion des erreurs client
    clientWs.on('error', (error: Error) => {
      this.handleClientError(connectionId, error);
    });

    // Ping pour maintenir la connexion
    const pingInterval = setInterval(() => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.ping();
      }
    }, this.config.pingInterval || 30000);

    const connection = this.connections.get(connectionId);
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
    const connection = this.connections.get(connectionId);
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
          
          // Envoyer les messages en queue maintenant que la connexion est prête
          const connection = this.connections.get(connectionId);
          if (connection && connection.messageQueue.length > 0) {
            logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Envoi des messages en queue', {
              connectionId,
              queueLength: connection.messageQueue.length
            });
            for (const queuedMessage of connection.messageQueue) {
              connection.xaiWs?.send(queuedMessage);
            }
            connection.messageQueue = [];
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
        this.handleXAIMessage(connectionId, data);
      });

      // Gestion de la fermeture XAI
      xaiWs.on('close', (code: number) => {
        this.handleXAIClose(connectionId, code);
      });

      // Gestion des erreurs XAI
      xaiWs.on('error', (error: Error) => {
        this.handleXAIError(connectionId, error);
      });
    } catch (error) {
      metadata.state = 'error';
      throw error;
    }
  }

  /**
   * Gère un message du client vers XAI
   */
  private handleClientMessage(connectionId: string, data: WebSocket.RawData): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      logger.warn(LogCategory.AUDIO, '[XAIVoiceProxyService] Message reçu mais connexion introuvable', {
        connectionId
      });
      return;
    }

    connection.metadata.lastActivity = Date.now();
    
    const DEBUG_RAW = process.env.DEBUG_XAI_RAW === '1';
    const dataStr = typeof data === 'string'
      ? data
      : data instanceof Buffer
        ? data.toString('utf8')
        : Buffer.from(data as any).toString('utf8');
    const dataSize = data instanceof Buffer ? data.length : dataStr.length;
    // Some clients use older/alternative event names or include unsupported session keys.
    // We normalize a few known cases here so XAI consistently processes the stream.
    let outboundStr = dataStr;
    
    try {
      const parsed = JSON.parse(dataStr) as any;
      // Normalize event type aggressively (trims + removes zero-width chars) so mappings always trigger.
      const normalizedType = typeof parsed.type === 'string'
        ? parsed.type.trim().replace(/[\u200B-\u200D\uFEFF]/g, '')
        : parsed.type;
      const messageType = typeof normalizedType === 'string' ? normalizedType : (normalizedType || 'unknown');

      // ---- Normalization layer (prevents “ping-only” sessions due to ignored messages) ----
      const mutations: string[] = [];
      let outgoing: any = parsed;

      // 1) `session.update` does NOT document a `modalities` field in `session`.
      //    Some clients send it; strip it to avoid the server ignoring the update.
      if (messageType === 'session.update' && outgoing?.session && Array.isArray(outgoing.session.modalities)) {
        delete outgoing.session.modalities;
        mutations.push('removed session.modalities');
      }

      // 2) Some clients send `conversation.item.commit`; server expects `input_audio_buffer.commit`.
      //    Be extremely defensive: some clients include invisible chars or odd variants.
      if (
        messageType === 'conversation.item.commit' ||
        (typeof messageType === 'string' && messageType.startsWith('conversation.item.commit')) ||
        (typeof parsed.type === 'string' && parsed.type.includes('conversation.item.commit'))
      ) {
        outgoing = { ...outgoing, type: 'input_audio_buffer.commit' };
        mutations.push('renamed conversation.item.commit -> input_audio_buffer.commit');
      }

      // 3) Normalize text message shapes (ensure `item.content` is an array with `input_text`).
      if (messageType === 'conversation.item.create' && outgoing?.item) {
        if (typeof outgoing.item.content === 'string') {
          outgoing.item = {
            ...outgoing.item,
            content: [{ type: 'input_text', text: outgoing.item.content }]
          };
          mutations.push('normalized item.content string -> input_text[]');
        } else if (Array.isArray(outgoing.item.content)) {
          outgoing.item = {
            ...outgoing.item,
            content: outgoing.item.content.map((c: any) => {
              if (c && typeof c === 'object' && !c.type && typeof c.text === 'string') {
                return { ...c, type: 'input_text' };
              }
              return c;
            })
          };
        }
      }

      // If we mutated the payload, use the normalized JSON as the outbound frame.
      if (mutations.length) {
        outboundStr = JSON.stringify(outgoing);
      }
      // -------------------------------------------------------------------------------

      // Dump WAV pour audio (1er chunk seulement)
      if (messageType === 'input_audio_buffer.append' && parsed.audio && typeof parsed.audio === 'string') {
        connection.audioChunkCount = (connection.audioChunkCount || 0) + 1;
        if (connection.audioChunkCount === 1) {
          try {
            // Décoder base64 -> Buffer
            const audioBuffer = Buffer.from(parsed.audio, 'base64');

            // Créer header WAV (PCM16 mono 24000 Hz)
            const sampleRate = 24000;
            const numChannels = 1;
            const bitsPerSample = 16;
            const dataSize = audioBuffer.length;
            const fileSize = 36 + dataSize;

            const wavHeader = Buffer.alloc(44);
            // RIFF
            wavHeader.write('RIFF', 0);
            wavHeader.writeUInt32LE(fileSize, 4);
            wavHeader.write('WAVE', 8);
            // fmt chunk
            wavHeader.write('fmt ', 12);
            wavHeader.writeUInt32LE(16, 16); // fmt chunk size
            wavHeader.writeUInt16LE(1, 20); // audio format (PCM)
            wavHeader.writeUInt16LE(numChannels, 22);
            wavHeader.writeUInt32LE(sampleRate, 24);
            wavHeader.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // byte rate
            wavHeader.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // block align
            wavHeader.writeUInt16LE(bitsPerSample, 34);
            // data chunk
            wavHeader.write('data', 36);
            wavHeader.writeUInt32LE(dataSize, 40);

            // Concat header + data
            const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);

            // Écrire fichier dans /tmp
            const timestamp = Date.now();
            const filename = `xai-debug-${timestamp}.wav`;
            const filepath = path.join(os.tmpdir(), filename);

            fs.writeFileSync(filepath, wavBuffer);
            logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] 💾 WAV dump créé', {
              connectionId,
              filepath,
              audioSize: audioBuffer.length,
              wavSize: wavBuffer.length
            });
          } catch (error) {
            logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] Erreur création WAV dump', undefined, error instanceof Error ? error : new Error(String(error)));
          }
        }
      }

      // Log systématique: type + taille + keys principales
      const logData: Record<string, unknown> = {
        connectionId,
        type: messageType,
        size: dataSize,
        xaiReady: connection.xaiWs?.readyState === WebSocket.OPEN
      };

      if (mutations.length) {
        logData.proxyMutations = mutations;
      }

      // Keys principales selon le type
      if (parsed.session) {
        logData.sessionKeys = Object.keys(parsed.session);
        logData.hasModalities = !!parsed.session.modalities;
        logData.modalities = parsed.session.modalities;
      }
      if (parsed.audio) {
        logData.audioLength = parsed.audio.length;
        logData.hasAudio = true;
      }
      if (parsed.item) {
        logData.itemKeys = Object.keys(parsed.item);
        logData.itemType = parsed.item.type;
      }
      if (parsed.response) {
        logData.responseKeys = Object.keys(parsed.response);
        logData.responseModalities = parsed.response.modalities;
      }

      // Log JSON complet si DEBUG_RAW (sans audio base64 pour éviter spam)
      if (DEBUG_RAW) {
        const loggableParsed = { ...parsed };
        if (loggableParsed.audio && typeof loggableParsed.audio === 'string') {
          loggableParsed.audio = `[BASE64_${loggableParsed.audio.length}_chars]`;
        }
        logData.rawJSON = JSON.stringify(loggableParsed, null, 2).substring(0, 2000);
      }

      // Helpful when debugging mappings: show what we actually sent.
      if (mutations.length) {
        try {
          const effective = JSON.parse(outboundStr as any);
          logData.effectiveType = effective?.type;
        } catch {
          // ignore
        }
      }

      logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] 📤 Message client → XAI', logData);

    } catch {
      logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Message client → XAI (non-JSON)', {
        connectionId,
        size: dataSize,
        xaiReady: connection.xaiWs?.readyState === WebSocket.OPEN
      });
    }

    // Final ultra-defensive fixups (works even if JSON parsing / normalization above failed)
    // Some clients still emit `conversation.item.commit` on teardown/end-of-turn; XAI expects `input_audio_buffer.commit`.
    if (typeof outboundStr === 'string' && outboundStr.includes('conversation.item.commit')) {
      outboundStr = outboundStr.replace(/conversation\.item\.commit/g, 'input_audio_buffer.commit');
    }
    // IMPORTANT: XAI attend des frames TEXT (JSON). Envoyer un Buffer = frame binaire, souvent ignorée.
    if (connection.xaiWs && connection.xaiWs.readyState === WebSocket.OPEN) {
      connection.xaiWs.send(outboundStr);
    } else {
      // Sinon, mettre en queue pour envoi une fois la connexion établie
      logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Message mis en queue (XAI non prêt)', {
        connectionId,
        queueLength: connection.messageQueue.length,
        xaiState: connection.xaiWs?.readyState
      });
      connection.messageQueue.push(outboundStr);
    }
  }

  /**
   * Gère un message de XAI vers le client
   */
  private handleXAIMessage(connectionId: string, data: WebSocket.RawData): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    if (connection.clientWs.readyState === WebSocket.OPEN) {
      connection.metadata.lastActivity = Date.now();
      
      const DEBUG_RAW = process.env.DEBUG_XAI_RAW === '1';
      const dataStr = typeof data === 'string'
        ? data
        : data instanceof Buffer
          ? data.toString('utf8')
          : Buffer.from(data as any).toString('utf8');
      const dataSize = data instanceof Buffer ? data.length : dataStr.length;
      
      try {
        const parsed = JSON.parse(dataStr);
        const messageType = parsed.type || 'unknown';
        
        // Log systématique: type + taille + keys principales
        const logData: Record<string, unknown> = {
          connectionId,
          type: messageType,
          size: dataSize
        };
        
        // Keys principales selon le type
        if (parsed.error) {
          logData.error = parsed.error;
          logData.errorType = parsed.error.type;
          logData.errorMessage = parsed.error.message;
          logData.errorCode = parsed.error.code;
        }
        if (parsed.delta) {
          logData.hasDelta = true;
          logData.deltaLength = parsed.delta.length;
          logData.deltaType = typeof parsed.delta;
        }
        if (parsed.session) {
          logData.sessionKeys = Object.keys(parsed.session);
        }
        if (parsed.conversation) {
          logData.conversationKeys = Object.keys(parsed.conversation);
        }
        
        // Log JSON complet si DEBUG_RAW (sans delta pour éviter spam)
        if (DEBUG_RAW) {
          const loggableParsed = { ...parsed };
          if (loggableParsed.delta && typeof loggableParsed.delta === 'string') {
            loggableParsed.delta = `[DELTA_${loggableParsed.delta.length}_chars]`;
          }
          logData.rawJSON = JSON.stringify(loggableParsed, null, 2).substring(0, 2000);
        }
        
        if (messageType === 'error') {
          logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] ❌ Message XAI → client (ERROR)', logData);
        } else {
          logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] 📥 Message XAI → client', logData);
        }
      } catch {
        logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Message XAI → client (non-JSON)', {
          connectionId,
          size: dataSize
        });
      }
      
      connection.clientWs.send(dataStr);
    }
  }

  /**
   * Gère la fermeture du client
   */
  private handleClientClose(connectionId: string): void {
    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Client fermé', {
      connectionId
    });
    this.closeConnection(connectionId, 1000, 'Client closed');
  }

  /**
   * Gère la fermeture de XAI
   */
  private handleXAIClose(connectionId: string, code?: number): void {
    logger.info(LogCategory.AUDIO, '[XAIVoiceProxyService] Connexion XAI fermée', {
      connectionId,
      code
    });
    this.closeConnection(connectionId, code || 1000, 'XAI connection closed');
  }

  /**
   * Gère une erreur client
   */
  private handleClientError(connectionId: string, error: Error): void {
    const handled = ProxyErrorHandler.handleError(error, {
      connectionId,
      operation: 'clientError'
    });
    logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] Erreur client', {
      connectionId,
      message: handled.message
    }, error);
    
    if (handled.shouldClose) {
      this.closeConnection(connectionId, 1011, handled.message);
    }
  }

  /**
   * Gère une erreur XAI
   */
  private handleXAIError(connectionId: string, error: Error): void {
    const handled = ProxyErrorHandler.handleError(error, {
      connectionId,
      operation: 'xaiError'
    });
    logger.error(LogCategory.AUDIO, '[XAIVoiceProxyService] Erreur XAI', {
      connectionId,
      message: handled.message
    }, error);
    
    if (handled.shouldClose) {
      this.closeConnection(connectionId, 1011, handled.message);
    }
  }

  /**
   * Ferme une connexion proprement
   */
  private closeConnection(connectionId: string, code: number, reason: string): void {
    try {
      const connection = this.connections.get(connectionId);
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
      this.connections.delete(connectionId);
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
    return this.connections.size;
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

