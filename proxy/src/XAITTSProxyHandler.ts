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

/** xAI TTS WebSocket: only these 5 voices are supported. @see https://docs.x.ai/developers/model-capabilities/audio/text-to-speech */
const VALID_VOICES = ['eve', 'ara', 'leo', 'rex', 'sal'] as const;

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

const DEFAULT_LANGUAGE = 'en';

function buildXAITTSUrl(params: Record<string, string>): string {
  const rawVoice = (params.voice || DEFAULT_VOICE).toLowerCase();
  const voice = VALID_VOICES.includes(rawVoice) ? rawVoice : DEFAULT_VOICE;
  const codec = params.codec || DEFAULT_CODEC;
  const sampleRate = params.sample_rate || String(DEFAULT_SAMPLE_RATE);
  const bitRate = params.bit_rate || String(DEFAULT_BIT_RATE);
  const language = params.language || DEFAULT_LANGUAGE;
  const search = new URLSearchParams({
    voice,
    codec,
    sample_rate: sampleRate,
    bit_rate: bitRate,
    language
  });
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

    const apiKey = (this.config.xaiApiKey || '').trim();
    if (!apiKey) {
      logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] XAI_API_KEY vide ou manquante', { connectionId });
      try {
        clientWs.send(JSON.stringify({ type: 'error', message: 'Proxy: XAI_API_KEY not configured' }));
      } catch { /* ignore */ }
      clientWs.close(1011, 'Config error');
      this.sessionCount = Math.max(0, this.sessionCount - 1);
      this.connections.delete(connectionId);
      return;
    }

    const xaiWs = new WebSocket(xaiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    conn.xaiWs = xaiWs;

    xaiWs.on('unexpected-response', (req, res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        let parsed: { error?: { message?: string }; message?: string } = {};
        try {
          parsed = JSON.parse(body) || {};
        } catch { /* ignore */ }
        const msg = (parsed?.error?.message ?? parsed?.message ?? body) || res.statusMessage || 'Unknown';
        logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] xAI 400 response body', {
          connectionId,
          statusCode: res.statusCode,
          xaiError: msg,
          xaiUrlParams: { voice: params.voice, codec: params.codec }
        });
      });
    });

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
      const errInfo: Record<string, unknown> = {
        connectionId,
        message: err.message,
        xaiUrlParams: { voice: params.voice, codec: params.codec, sample_rate: params.sample_rate }
      };
      const req = (err as Error & { req?: { res?: { statusCode?: number; statusMessage?: string } } }).req;
      if (req?.res) {
        errInfo.httpStatus = req.res.statusCode;
        errInfo.httpMessage = req.res.statusMessage;
      }
      logger.error(LogCategory.AUDIO, '[XAITTSProxyHandler] xAI WS error', errInfo, err);
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
