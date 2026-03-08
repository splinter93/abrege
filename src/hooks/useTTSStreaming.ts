'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger, LogCategory } from '@/utils/logger';
import { normalizeTTSVoice } from '@/constants/ttsVoices';
import { TTSStreamingPlayer } from '@/utils/ttsStreamingPlayer';

const DEFAULT_PROXY_URL = 'ws://localhost:3001/ws/xai-voice';

function getTTSWebSocketUrl(voiceId: string): string | null {
  const base = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_XAI_VOICE_PROXY_URL
    ? process.env.NEXT_PUBLIC_XAI_VOICE_PROXY_URL
    : DEFAULT_PROXY_URL;
  try {
    const u = new URL(base);
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
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlayingMessageId: string | null;
  isPaused: boolean;
}

export function useTTSStreaming(defaultVoiceId?: string): TTSStreamingReturn {
  const [isPlayingMessageId, setIsPlayingMessageId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<TTSStreamingPlayer | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const voiceIdRef = useRef<string>(normalizeTTSVoice(defaultVoiceId));

  const stop = useCallback(() => {
    const ws = wsRef.current;
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
          ws.close(1000, 'Stop');
        }
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    playerRef.current?.stop();
    playerRef.current = null;
    currentMessageIdRef.current = null;
    setIsPlayingMessageId(null);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    playerRef.current?.resume();
    setIsPaused(false);
  }, []);

  const ensurePlayer = useCallback(() => {
    if (!playerRef.current) {
      playerRef.current = new TTSStreamingPlayer();
    }
    return playerRef.current;
  }, []);

  const connect = useCallback((voiceId: string): WebSocket | null => {
    const url = getTTSWebSocketUrl(voiceId);
    if (!url) {
      logger.warn(LogCategory.AUDIO, '[useTTSStreaming] No proxy URL configured');
      return null;
    }
    const existing = wsRef.current;
    if (existing) {
      try {
        if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CLOSING) {
          existing.close(1000, 'New utterance');
        }
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;
      voiceIdRef.current = voiceId;
      return ws;
    } catch (e) {
      logger.error(LogCategory.AUDIO, '[useTTSStreaming] WebSocket create failed', undefined, e instanceof Error ? e : new Error(String(e)));
      return null;
    }
  }, []);

  const speak = useCallback(
    (text: string, options?: { voiceId?: string; messageId?: string }) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stop();
      const voiceId = normalizeTTSVoice(options?.voiceId ?? defaultVoiceId);
      const messageId = options?.messageId ?? null;
      currentMessageIdRef.current = messageId;
      setIsPlayingMessageId(messageId);
      setIsPaused(false);

      const ws = connect(voiceId);
      if (!ws) {
        setIsPlayingMessageId(null);
        currentMessageIdRef.current = null;
        return;
      }

      const player = ensurePlayer();
      player.start({
        onEnded: () => {
          currentMessageIdRef.current = null;
          setIsPlayingMessageId(null);
        },
        onError: (err) => {
          logger.error(LogCategory.AUDIO, '[useTTSStreaming] Player error', undefined, err instanceof Error ? err : new Error(String(err)));
          currentMessageIdRef.current = null;
          setIsPlayingMessageId(null);
        }
      });
      player.getAudio()?.play().catch((err) => {
        logger.warn(LogCategory.AUDIO, '[useTTSStreaming] play() rejected (e.g. autoplay policy)', undefined, err instanceof Error ? err : new Error(String(err)));
      });

      const handleOpen = () => {
        ws.send(JSON.stringify({ type: 'text.delta', delta: trimmed }));
        ws.send(JSON.stringify({ type: 'text.done' }));
      };

      const handleMessage = (event: MessageEvent) => {
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
            player.endOfStream();
          } else if (msg.type === 'error') {
            logger.error(LogCategory.AUDIO, '[useTTSStreaming] Server error', { message: msg.message ?? 'Unknown' });
            stop();
          }
        } catch {
          // ignore non-JSON
        }
      };

      const handleCloseOrError = () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        currentMessageIdRef.current = null;
        setIsPlayingMessageId(null);
      };

      if (ws.readyState === WebSocket.OPEN) {
        handleOpen();
      } else {
        ws.onopen = handleOpen;
      }
      ws.onmessage = handleMessage as (ev: MessageEvent) => void;
      ws.onclose = handleCloseOrError;
      ws.onerror = handleCloseOrError;
    },
    [defaultVoiceId, connect, ensurePlayer, stop]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    speak,
    stop,
    pause,
    resume,
    isPlayingMessageId,
    isPaused
  };
}
