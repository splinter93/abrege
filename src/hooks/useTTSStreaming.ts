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

export function useTTSStreaming(defaultVoiceId?: string): TTSStreamingReturn {
  const [isPlayingMessageId, setIsPlayingMessageId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const playerRef = useRef<TTSStreamingPlayer | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);
  const voiceIdRef = useRef<string>(normalizeTTSVoice(defaultVoiceId));

  // Incremental mode state
  const sentenceQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const streamEndedRef = useRef(false);
  const stoppedRef = useRef(false);
  const activeWsRef = useRef<WebSocket | null>(null);
  const endOfStreamCalledRef = useRef(false);

  const cleanup = useCallback(() => {
    stoppedRef.current = true;
    const ws = activeWsRef.current;
    if (ws) {
      try { ws.close(1000, 'Stop'); } catch { /* ignore */ }
      activeWsRef.current = null;
    }
    sentenceQueueRef.current = [];
    isProcessingRef.current = false;
    streamEndedRef.current = false;
    endOfStreamCalledRef.current = false;
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

  /** Open a new WS for one sentence, pipe audio into the shared player. Resolves on audio.done or WS close. */
  const speakSentence = useCallback((text: string, player: TTSStreamingPlayer, voiceId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const url = getTTSWebSocketUrl(voiceId);
      if (!url) { reject(new Error('No proxy URL')); return; }

      let settled = false;
      const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
        activeWsRef.current = ws;
      } catch (e) {
        reject(e);
        return;
      }

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'text.delta', delta: text }));
        ws.send(JSON.stringify({ type: 'text.done' }));
      };

      ws.onmessage = (event: MessageEvent) => {
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
            try { ws.close(1000, 'Done'); } catch { /* ignore */ }
            if (activeWsRef.current === ws) activeWsRef.current = null;
            settle(() => resolve());
          } else if (msg.type === 'error') {
            logger.error(LogCategory.AUDIO, '[TTS] Server error', { message: msg.message ?? 'Unknown' });
            settle(() => reject(new Error(msg.message ?? 'TTS error')));
          }
        } catch { /* ignore non-JSON */ }
      };

      ws.onerror = () => {
        if (activeWsRef.current === ws) activeWsRef.current = null;
        settle(() => reject(new Error('WebSocket error')));
      };

      ws.onclose = () => {
        if (activeWsRef.current === ws) activeWsRef.current = null;
        settle(() => resolve());
      };
    });
  }, []);

  const safeEndOfStream = useCallback(() => {
    if (!endOfStreamCalledRef.current && playerRef.current) {
      endOfStreamCalledRef.current = true;
      try { playerRef.current.endOfStream(); } catch { /* already ended */ }
    }
  }, []);

  /** Process the sentence queue sequentially */
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const player = playerRef.current;
    if (!player) { isProcessingRef.current = false; return; }
    const voiceId = voiceIdRef.current;

    while (sentenceQueueRef.current.length > 0) {
      if (stoppedRef.current) break;
      const text = sentenceQueueRef.current.shift()!;
      try {
        await speakSentence(text, player, voiceId);
      } catch (err) {
        if (stoppedRef.current) break;
        logger.error(LogCategory.AUDIO, '[TTS] Sentence failed', undefined, err instanceof Error ? err : new Error(String(err)));
        break;
      }
    }

    if (!stoppedRef.current && streamEndedRef.current && sentenceQueueRef.current.length === 0) {
      safeEndOfStream();
    }

    isProcessingRef.current = false;
  }, [speakSentence, safeEndOfStream]);

  /** One-shot speak (backwards compatible) */
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

      streamEndedRef.current = true;
      sentenceQueueRef.current = [trimmed];
      processQueue();
    },
    [defaultVoiceId, stop, processQueue]
  );

  /** Start an incremental TTS stream. Sentences are queued via pushText and played sequentially. */
  const startStream = useCallback(
    (options?: { voiceId?: string; messageId?: string }) => {
      stop();
      stoppedRef.current = false;
      endOfStreamCalledRef.current = false;
      const voiceId = normalizeTTSVoice(options?.voiceId ?? defaultVoiceId);
      voiceIdRef.current = voiceId;
      const messageId = options?.messageId ?? null;
      currentMessageIdRef.current = messageId;
      setIsPlayingMessageId(messageId ?? '__playing');
      setIsPaused(false);
      streamEndedRef.current = false;
      sentenceQueueRef.current = [];
      isProcessingRef.current = false;

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
    },
    [defaultVoiceId, stop]
  );

  /** Push a sentence to the queue. Starts processing immediately if idle. */
  const pushText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      sentenceQueueRef.current.push(trimmed);
      processQueue();
    },
    [processQueue]
  );

  /** Signal that no more sentences will be pushed. */
  const endStream = useCallback(() => {
    streamEndedRef.current = true;
    if (sentenceQueueRef.current.length === 0 && !isProcessingRef.current) {
      safeEndOfStream();
    }
  }, [safeEndOfStream]);

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
