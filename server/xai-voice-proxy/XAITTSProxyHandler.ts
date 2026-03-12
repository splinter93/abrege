/**
 * Handler WebSocket pour le proxy TTS streaming xAI
 * Path: /ws/xai-tts
 * Relaye text.delta / text.done (client → xAI) et audio.delta / audio.done / error (xAI → client).
 * Limite: 50 sessions concurrentes (xAI).
 */

import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import { logger, LogCategory } from '../../src/utils/logger';
import type { XAIVoiceProxyConfig } from './types';
import type { ActiveTTSConnection } from './types';
import { isValidTTSVoice } from '../../src/constants/ttsVoices';

const TTS_PATH = '/ws/xai-tts';
const XAI_TTS_WS_URL = 'wss://api.x.ai/v1/tts';
const MAX_TTS_SESSIONS = 50;

const DEFAULT_VOICE = 'eve';
const DEFAULT_CODEC = 'mp3';
const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_BIT_RATE = 128000;

function parseQuery(url: string): Record<string, string> {
  const q = url.indexOf('?');
  if (q === -1) return {};
  const params: Record<string, string> = {};
  for (const part of url.slice(q + 1).split('&')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    try {
      const key = decodeURIComponent(part.slice(0, eq)).trim();
      const value = decodeURIComponent(part.slice(eq + 1)).trim();
      if (key && value) params[key] = value;
    } catch {
      // skip malformed query param
    }
  }
  return params;
}

function buildTTSUrl(params: Record<string, string>): string {
  const voice = isValidTTSVoice(params.voice) ? params.voice.toLowerCase() : DEFAULT_VOICE;
  const codec = params.codec || DEFAULT_CODEC;
  const sampleRate = params.sample_rate || String(DEFAULT_SAMPLE_RATE);
  const bitRate = params.bit_rate || String(DEFAULT_BIT_RATE);
  const search = new URLSearchParams({ voice, codec, sample_rate: sampleRate, bit_rate: bitRate });
  return `${XAI_TTS_WS_URL}?${search.toString()}`;
}

export class XAITTSProxyHandler {
  private wss: WebSocketServer;
  private config: XAIVoiceProxyConfig;
  private connections = new Map<string, ActiveTTSConnection>();
  private sessionCount = 0;

  constructor(config: XAIVoiceProxyConfig) {
    this.config = config;
    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on('connection', (clientWs: WebSocket, request: IncomingMessage) => {
      this.handleClientConnection(clientWs, request);
    });
  }

  /**
   * À appeler par le serveur HTTP : gère l'upgrade pour /ws/xai-tts
   */
  handleUpgrade(
    request: IncomingMessage,
    socket: import('stream').Duplex,
    head: Buffer
  ): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  /**
   * Vérifie si l'URL de la requête correspond au path TTS
   */
  static isTTSPath(url: string | undefined): boolean {
    const path = url?.split('?')[0] || '';
    return path === TTS_PATH;
  }

  private nextConnectionId(): string {
    return `tts_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private handleClientConnection(clientWs: WebSocket, request: IncomingMessage): void {
    if (this.sessionCount >= MAX_TTS_SESSIONS) {
      try {
        clientWs.send(JSON.stringify({ type: 'error', message: 'TTS session limit reached' }));
        clientWs.close(1013, 'Try again later');
      } catch {
        clientWs.terminate();
      }
      return;
    }

    const connectionId = this.nextConnectionId();
    const params = parseQuery(request.url || '');
    const xaiUrl = buildTTSUrl(params);

    const connection: ActiveTTSConnection = {
      connectionId,
      clientWs,
      xaiWs: null,
      connectedAt: Date.now(),
      state: 'connecting_xai'
    };
    this.connections.set(connectionId, connection);
    this.sessionCount++;

    logger.info(LogCategory.AUDIO, '[XAITTSProxyHandler] Nouvelle connexion TTS', {
      connectionId,
      voice: params.voice || DEFAULT_VOICE
    });

    const xaiWs = new WebSocket(xaiUrl, {
      headers: {
        Authorization: `Bearer ${this.config.xaiApiKey}`
      }
    });

    connection.xaiWs = xaiWs;
    connection.state = 'connecting_xai';

    const cleanup = (code: number, reason: string) => {
      if (!this.connections.has(connectionId)) return;
      this.connections.delete(connectionId);
      this.sessionCount--;
      try {
        if (xaiWs.readyState === WebSocket.OPEN || xaiWs.readyState === WebSocket.CLOSING) {
          xaiWs.close(code, reason);
        }
      } catch {
        xaiWs.terminate();
      }
      try {
        if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CLOSING) {
          clientWs.close(code, reason);
        }
      } catch {
        clientWs.terminate();
      }
      connection.state = 'disconnected';
      logger.info(LogCategory.AUDIO, '[XAITTSProxyHandler] Connexion TTS fermée', {
        connectionId,
        code,
        reason
      });
    };

    xaiWs.on('open', () => {
      connection.state = 'connected';
      logger.info(LogCategory.AUDIO, '[XAITTSProxyHandler] Connexion xAI TTS établie', {
        connectionId
      });
    });

    xaiWs.on('message', (data: WebSocket.RawData) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString();
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(raw);
        }
      } catch (err) {
        logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] Erreur relay xAI→client', {
          connectionId
        }, err instanceof Error ? err : new Error(String(err)));
        cleanup(1011, 'Relay error');
      }
    });

    xaiWs.on('close', (code: number, reason: Buffer | string) => {
      cleanup(code, Buffer.isBuffer(reason) ? reason.toString() : reason);
    });

    xaiWs.on('error', (error: Error) => {
      logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] Erreur WebSocket xAI TTS', {
        connectionId,
        message: error.message
      }, error);
      cleanup(1011, error.message);
    });

    clientWs.on('message', (data: WebSocket.RawData) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString();
        if (xaiWs.readyState === WebSocket.OPEN) {
          xaiWs.send(raw);
        }
      } catch (err) {
        logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] Erreur relay client→xAI', {
          connectionId
        }, err instanceof Error ? err : new Error(String(err)));
        cleanup(1011, 'Relay error');
      }
    });

    clientWs.on('close', (code: number, reason: Buffer | string) => {
      cleanup(code, Buffer.isBuffer(reason) ? reason.toString() : reason);
    });

    clientWs.on('error', (error: Error) => {
      logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] Erreur WebSocket client TTS', {
        connectionId,
        message: error.message
      }, error);
      cleanup(1011, error.message);
    });
  }

  /** Ferme toutes les connexions TTS (shutdown) */
  closeAll(code: number, reason: string): void {
    for (const [id, conn] of this.connections) {
      try {
        if (conn.xaiWs && (conn.xaiWs.readyState === WebSocket.OPEN || conn.xaiWs.readyState === WebSocket.CLOSING)) {
          conn.xaiWs.close(code, reason);
        }
      } catch {
        conn.xaiWs?.terminate();
      }
      try {
        if (conn.clientWs.readyState === WebSocket.OPEN || conn.clientWs.readyState === WebSocket.CLOSING) {
          conn.clientWs.close(code, reason);
        }
      } catch {
        conn.clientWs.terminate();
      }
    }
    this.connections.clear();
    this.sessionCount = 0;
  }
}
