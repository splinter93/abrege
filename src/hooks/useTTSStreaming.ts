'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger, LogCategory } from '@/utils/logger';
import { normalizeTTSVoice } from '@/constants/ttsVoices';
import { TTSStreamingPlayer } from '@/utils/ttsStreamingPlayer';

const DEFAULT_PROXY_URL = 'ws://localhost:3001/ws/xai-voice';
const PROXY_BASE_URL = process.env.NEXT_PUBLIC_XAI_VOICE_PROXY_URL || DEFAULT_PROXY_URL;

function getTTSWebSocketUrl(voiceId: string): string | null {
  try {
    const u = new URL(PROXY_BASE_URL);
    u.pathname = '/ws/xai-tts';
    u.search = `?voice=${encodeURIComponent(voiceId)}&codec=mp3&sample_rate=24000&bit_rate=128000`;
    return u.toString();
  } catch {
    return null;
  }
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface TTSStreamingReturn {
  speak: (text: string, options?: { voiceId?: string; messageId?: string }) => void;
  startStream: (options?: { voiceId?: string; messageId?: string }) => void;
  pushText: (text: string) => void;
  endStream: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlayingMessageId: string | null;
  isPaused: boolean;
}

/**
 * TTS streaming via une seule WebSocket xAI par session.
 *
 * Architecture :
 *  - startStream() → ouvre une WS + un TTSStreamingPlayer
 *  - pushText()    → envoie text.delta sur la WS (xAI génère l'audio en continu)
 *  - endStream()   → envoie text.done (xAI renvoie audio.done quand fini)
 *  - audio.delta   → décodé et injecté dans le MediaSource player en temps réel
 *  - audio.done    → endOfStream() sur le player
 *
 * Zéro queue, zéro buffering de phrases, zéro reconnexion WS entre les phrases.
 */
export function useTTSStreaming(defaultVoiceId?: string): TTSStreamingReturn {
  const [isPlayingMessageId, setIsPlayingMessageId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const playerRef = useRef<TTSStreamingPlayer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const voiceIdRef = useRef<string>(normalizeTTSVoice(defaultVoiceId));
  const stoppedRef = useRef(false);
  const endOfStreamCalledRef = useRef(false);
  /** Messages text.delta / text.done reçus avant l'ouverture WS */
  const pendingRef = useRef<string[]>([]);

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    stoppedRef.current = true;
    endOfStreamCalledRef.current = false;
    pendingRef.current = [];
    const ws = wsRef.current;
    if (ws) {
      try { ws.close(1000, 'Stop'); } catch { /* ignore */ }
      wsRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    playerRef.current?.stop();
    playerRef.current = null;
    currentMessageIdRef.current = null;
    setIsPlayingMessageId(null);
    setIsPaused(false);
  }, [cleanup]);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    playerRef.current?.resume();
    setIsPaused(false);
  }, []);

  const safeEndOfStream = useCallback(() => {
    if (!endOfStreamCalledRef.current && playerRef.current) {
      endOfStreamCalledRef.current = true;
      try { playerRef.current.endOfStream(); } catch { /* already ended */ }
    }
  }, []);

  // ─── WebSocket : une seule connexion pour tout le stream ─────────────────

  const openWs = useCallback((voiceId: string, player: TTSStreamingPlayer): WebSocket | null => {
    const url = getTTSWebSocketUrl(voiceId);
    if (!url) return null;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      return null;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      const pending = pendingRef.current.splice(0);
      for (const msg of pending) {
        try {
          if (ws.readyState === WebSocket.OPEN) ws.send(msg);
        } catch { /* ignore */ }
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      if (stoppedRef.current) return;
      let data: string;
      if (typeof event.data === 'string') {
        data = event.data;
      } else if (event.data instanceof ArrayBuffer) {
        data = new TextDecoder().decode(event.data);
      } else {
        return;
      }
      try {
        const msg = JSON.parse(data) as { type: string; delta?: string; message?: string };
        if (msg.type === 'audio.delta' && msg.delta) {
          player.appendChunk(decodeBase64ToUint8Array(msg.delta));
        } else if (msg.type === 'audio.done') {
          safeEndOfStream();
        } else if (msg.type === 'error') {
          logger.error(LogCategory.AUDIO, '[TTS] Server error', { message: msg.message ?? 'Unknown' });
        }
      } catch { /* ignore non-JSON */ }
    };

    ws.onerror = () => {
      logger.error(LogCategory.AUDIO, '[TTS] WebSocket error');
      if (wsRef.current === ws) wsRef.current = null;
    };

    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      safeEndOfStream();
    };

    return ws;
  }, [safeEndOfStream]);

  /** Envoie un message JSON sur la WS (ou le queue si pas encore ouverte) */
  const wsSend = useCallback((json: string) => {
    const ws = wsRef.current;
    if (!ws) return;
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(json); } catch { /* ignore */ }
    } else if (ws.readyState === WebSocket.CONNECTING) {
      pendingRef.current.push(json);
    }
  }, []);

  // ─── API publique ─────────────────────────────────────────────────────────

  /** One-shot speak : ouvre une WS, envoie tout le texte, ferme */
  const speak = useCallback(
    (text: string, options?: { voiceId?: string; messageId?: string }) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stop();
      stoppedRef.current = false;
      endOfStreamCalledRef.current = false;
      const voiceId = normalizeTTSVoice(options?.voiceId ?? defaultVoiceId);
      voiceIdRef.current = voiceId;
      const messageId = options?.messageId ?? null;
      currentMessageIdRef.current = messageId;
      setIsPlayingMessageId(messageId ?? '__playing');
      setIsPaused(false);

      const player = new TTSStreamingPlayer();
      playerRef.current = player;
      player.start({
        onEnded: () => { currentMessageIdRef.current = null; setIsPlayingMessageId(null); },
        onError: (err) => {
          logger.error(LogCategory.AUDIO, '[TTS] Player error', undefined, err instanceof Error ? err : new Error(String(err)));
          currentMessageIdRef.current = null;
          setIsPlayingMessageId(null);
        }
      });
      player.getAudio()?.play().catch(() => {});

      openWs(voiceId, player);
      wsSend(JSON.stringify({ type: 'text.delta', delta: trimmed }));
      wsSend(JSON.stringify({ type: 'text.done' }));
    },
    [defaultVoiceId, stop, openWs, wsSend]
  );

  /** Démarre un stream incrémental. Texte envoyé via pushText(), fin via endStream(). */
  const startStream = useCallback(
    (options?: { voiceId?: string; messageId?: string }) => {
      stop();
      stoppedRef.current = false;
      endOfStreamCalledRef.current = false;
      pendingRef.current = [];
      const voiceId = normalizeTTSVoice(options?.voiceId ?? defaultVoiceId);
      voiceIdRef.current = voiceId;
      const messageId = options?.messageId ?? null;
      currentMessageIdRef.current = messageId;
      setIsPlayingMessageId(messageId ?? '__playing');
      setIsPaused(false);

      const player = new TTSStreamingPlayer();
      playerRef.current = player;
      player.start({
        onEnded: () => { currentMessageIdRef.current = null; setIsPlayingMessageId(null); },
        onError: (err) => {
          logger.error(LogCategory.AUDIO, '[TTS] Player error', undefined, err instanceof Error ? err : new Error(String(err)));
          currentMessageIdRef.current = null;
          setIsPlayingMessageId(null);
        }
      });
      player.getAudio()?.play().catch(() => {});

      openWs(voiceId, player);
    },
    [defaultVoiceId, stop, openWs]
  );

  /** Envoie un morceau de texte à xAI (text.delta). Appeler autant de fois que nécessaire. */
  const pushText = useCallback(
    (text: string) => {
      if (!text || stoppedRef.current) return;
      wsSend(JSON.stringify({ type: 'text.delta', delta: text }));
    },
    [wsSend]
  );

  /** Signale la fin du texte. xAI finit de générer l'audio puis renvoie audio.done. */
  const endStream = useCallback(() => {
    const ws = wsRef.current;
    if (!ws) {
      safeEndOfStream();
      return;
    }
    wsSend(JSON.stringify({ type: 'text.done' }));
  }, [safeEndOfStream, wsSend]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return {
    speak,
    startStream,
    pushText,
    endStream,
    stop,
    pause,
    resume,
    isPlayingMessageId,
    isPaused
  };
}
