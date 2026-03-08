/**
 * Handler WebSocket pour le proxy TTS streaming xAI
 * Path: /ws/xai-tts
 * Relaye text.delta / text.done (client → xAI) et audio.delta / audio.done / error (xAI → client).
 * Limite: 50 sessions concurrentes.
 */

import WebSocket from 'ws';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { logger, LogCategory } from './utils/logger';
import type { XAIVoiceProxyConfig } from './types';

const TTS_PATH = '/ws/xai-tts';
const XAI_TTS_WS_URL = 'wss://api.x.ai/v1/tts';
const MAX_TTS_SESSIONS = 50;

const VALID_VOICES = ['eve', 'ara', 'ember', 'cove', 'orion', 'luna', 'stella'];

const DEFAULT_VOICE = 'eve';
const DEFAULT_CODEC = 'mp3';
const DEFAULT_SAMPLE_RATE = 24000;
const DEFAULT_BIT_RATE = 128000;

interface ActiveTTSConnection {
  connectionId: string;
  clientWs: WebSocket;
  xaiWs: WebSocket | null;
  connectedAt: number;
  state: 'connecting_xai' | 'connected' | 'disconnected';
}

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
      // skip malformed param
    }
  }
  return params;
}

function buildXAITTSUrl(params: Record<string, string>): string {
  const rawVoice = (params.voice || DEFAULT_VOICE).toLowerCase();
  const voice = VALID_VOICES.includes(rawVoice) ? rawVoice : DEFAULT_VOICE;
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

  static isTTSPath(url: string | undefined): boolean {
    return (url?.split('?')[0] || '') === TTS_PATH;
  }

  handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  private nextId(): string {
    return `tts_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
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

    const connectionId = this.nextId();
    const params = parseQuery(request.url || '');
    const xaiUrl = buildXAITTSUrl(params);

    const conn: ActiveTTSConnection = {
      connectionId,
      clientWs,
      xaiWs: null,
      connectedAt: Date.now(),
      state: 'connecting_xai'
    };
    this.connections.set(connectionId, conn);
    this.sessionCount++;

    logger.info(LogCategory.AUDIO, '[XAITTSProxyHandler] New TTS connection', {
      connectionId,
      voice: params.voice || DEFAULT_VOICE
    });

    const cleanup = (code: number, reason: string) => {
      if (!this.connections.has(connectionId)) return;
      this.connections.delete(connectionId);
      this.sessionCount = Math.max(0, this.sessionCount - 1);
      const xaiWs = conn.xaiWs;
      if (xaiWs) {
        try {
          if (xaiWs.readyState === WebSocket.OPEN || xaiWs.readyState === WebSocket.CONNECTING) {
            xaiWs.close(code, reason);
          }
        } catch { xaiWs.terminate(); }
      }
      try {
        if (clientWs.readyState === WebSocket.OPEN || clientWs.readyState === WebSocket.CONNECTING) {
          clientWs.close(code, reason);
        }
      } catch { clientWs.terminate(); }
      conn.state = 'disconnected';
      logger.info(LogCategory.AUDIO, '[XAITTSProxyHandler] Connection closed', { connectionId, code });
    };

    const xaiWs = new WebSocket(xaiUrl, {
      headers: {
        Authorization: `Bearer ${this.config.xaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    conn.xaiWs = xaiWs;

    xaiWs.on('open', () => {
      conn.state = 'connected';
      logger.info(LogCategory.AUDIO, '[XAITTSProxyHandler] xAI TTS connected', { connectionId });
    });

    xaiWs.on('message', (data: WebSocket.RawData) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString();
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(raw);
        }
      } catch (err) {
        logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] Relay xAI→client error', { connectionId }, err instanceof Error ? err : new Error(String(err)));
        cleanup(1011, 'Relay error');
      }
    });

    xaiWs.on('close', (code, reason) => {
      cleanup(code, Buffer.isBuffer(reason) ? reason.toString() : String(reason));
    });

    xaiWs.on('error', (err) => {
      logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] xAI WS error', { connectionId, message: err.message }, err);
      cleanup(1011, err.message);
    });

    clientWs.on('message', (data: WebSocket.RawData) => {
      try {
        const raw = typeof data === 'string' ? data : data.toString();
        if (xaiWs.readyState === WebSocket.OPEN) {
          xaiWs.send(raw);
        } else {
          // xAI WS pas encore ouverte : mettre en queue
          xaiWs.once('open', () => {
            if (xaiWs.readyState === WebSocket.OPEN) xaiWs.send(raw);
          });
        }
      } catch (err) {
        logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] Relay client→xAI error', { connectionId }, err instanceof Error ? err : new Error(String(err)));
        cleanup(1011, 'Relay error');
      }
    });

    clientWs.on('close', (code, reason) => {
      cleanup(code, Buffer.isBuffer(reason) ? reason.toString() : String(reason));
    });

    clientWs.on('error', (err) => {
      logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] Client WS error', { connectionId, message: err.message }, err);
      cleanup(1011, err.message);
    });
  }

  closeAll(code: number, reason: string): void {
    for (const conn of this.connections.values()) {
      try {
        if (conn.xaiWs && (conn.xaiWs.readyState === WebSocket.OPEN || conn.xaiWs.readyState === WebSocket.CONNECTING)) {
          conn.xaiWs.close(code, reason);
        }
      } catch { conn.xaiWs?.terminate(); }
      try {
        if (conn.clientWs.readyState === WebSocket.OPEN || conn.clientWs.readyState === WebSocket.CONNECTING) {
          conn.clientWs.close(code, reason);
        }
      } catch { conn.clientWs.terminate(); }
    }
    this.connections.clear();
    this.sessionCount = 0;
  }
}
