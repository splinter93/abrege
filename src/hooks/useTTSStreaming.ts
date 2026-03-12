'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger, LogCategory } from '@/utils/logger';
import { normalizeTTSVoice } from '@/constants/ttsVoices';
import { TTSStreamingPlayer } from '@/utils/ttsStreamingPlayer';

const DEFAULT_PROXY_URL = 'ws://localhost:3001/ws/xai-voice';
const PROXY_BASE_URL = process.env.NEXT_PUBLIC_XAI_VOICE_PROXY_URL || DEFAULT_PROXY_URL;

const MAX_WS_RETRIES = 1;

function getTTSWebSocketUrl(voiceId: string): string | null {
  try {
    const u = new URL(PROXY_BASE_URL);
    u.pathname = '/ws/xai-tts';
    u.search = `?voice=${encodeURIComponent(voiceId)}&codec=mp3&sample_rate=24000&bit_rate=128000&language=en`;
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

/**
 * Slot pré-chargé : WS ouverte vers xAI, chunks MP3 accumulés en mémoire.
 * Quand la phrase courante finit de recevoir ses chunks (audio.done),
 * on injecte instantanément les chunks du slot dans le player principal.
 */
interface PrefetchedSlot {
  text: string;
  ws: WebSocket | null;
  chunks: Uint8Array[];
  audioDone: boolean;
  failed: boolean;
  error: Error | null;
  onReady: (() => void) | null;
  onFail: ((err: Error) => void) | null;
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

  const sentenceQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const streamEndedRef = useRef(false);
  const stoppedRef = useRef(false);
  const endOfStreamCalledRef = useRef(false);

  const prefetchRef = useRef<PrefetchedSlot | null>(null);
  const activeWsRef = useRef<WebSocket | null>(null);

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  const cancelPrefetch = useCallback(() => {
    const slot = prefetchRef.current;
    if (!slot) return;
    prefetchRef.current = null;
    slot.onReady = null;
    slot.onFail = null;
    try { slot.ws?.close(1000, 'Cancelled'); } catch { /* ignore */ }
  }, []);

  const cleanup = useCallback(() => {
    stoppedRef.current = true;
    cancelPrefetch();
    const ws = activeWsRef.current;
    if (ws) {
      try { ws.close(1000, 'Stop'); } catch { /* ignore */ }
      activeWsRef.current = null;
    }
    sentenceQueueRef.current = [];
    isProcessingRef.current = false;
    streamEndedRef.current = false;
    endOfStreamCalledRef.current = false;
  }, [cancelPrefetch]);

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

  // ─── Prefetch : accumule les chunks MP3 en mémoire ───────────────────────

  const startPrefetch = useCallback((text: string, voiceId: string): PrefetchedSlot => {
    const slot: PrefetchedSlot = {
      text,
      ws: null,
      chunks: [],
      audioDone: false,
      failed: false,
      error: null,
      onReady: null,
      onFail: null,
    };
    prefetchRef.current = slot;

    const url = getTTSWebSocketUrl(voiceId);
    if (!url) {
      slot.failed = true;
      slot.error = new Error('No proxy URL');
      return slot;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      slot.failed = true;
      slot.error = e instanceof Error ? e : new Error(String(e));
      return slot;
    }
    slot.ws = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'text.delta', delta: text }));
      ws.send(JSON.stringify({ type: 'text.done' }));
    };

    ws.onmessage = (event: MessageEvent) => {
      if (prefetchRef.current !== slot) return;
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
          slot.chunks.push(decodeBase64ToUint8Array(msg.delta));
        } else if (msg.type === 'audio.done') {
          slot.audioDone = true;
          try { ws.close(1000, 'Done'); } catch { /* ignore */ }
          slot.onReady?.();
        } else if (msg.type === 'error') {
          slot.failed = true;
          slot.error = new Error(msg.message ?? 'TTS error');
          slot.onFail?.(slot.error);
        }
      } catch { /* ignore non-JSON */ }
    };

    ws.onerror = () => {
      if (prefetchRef.current !== slot) return;
      if (!slot.audioDone && !slot.failed) {
        slot.failed = true;
        slot.error = new Error('WebSocket error');
        slot.onFail?.(slot.error);
      }
    };

    ws.onclose = () => {
      if (prefetchRef.current !== slot) return;
      if (!slot.failed && !slot.audioDone) {
        slot.audioDone = true;
        slot.onReady?.();
      }
    };

    return slot;
  }, []);

  // ─── Injecter un slot dans le player principal ───────────────────────────

  /**
   * Attend que le slot ait tous ses chunks (audio.done), puis les injecte
   * dans le player principal. Ne ferme PAS le MediaSource (pas d'endOfStream).
   */
  const injectSlot = useCallback(
    (slot: PrefetchedSlot, player: TTSStreamingPlayer): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (stoppedRef.current) { resolve(); return; }

        const flush = () => {
          if (stoppedRef.current) { resolve(); return; }
          if (slot.failed) { reject(slot.error ?? new Error('Prefetch failed')); return; }
          for (const chunk of slot.chunks) {
            player.appendChunk(chunk);
          }
          slot.chunks = [];
          resolve();
        };

        if (slot.audioDone || slot.failed) {
          flush();
        } else {
          slot.onReady = flush;
          slot.onFail = (err) => reject(err);
        }
      });
    },
    []
  );

  // ─── Lecture directe : pipe les chunks dans le player en temps réel ──────

  /**
   * Ouvre une WS, envoie le texte, pipe les chunks audio dans le player principal.
   * Résout quand audio.done est reçu (le player a tous les chunks de cette phrase).
   * NE ferme PAS le MediaSource — d'autres phrases peuvent suivre.
   */
  const speakSentenceDirect = useCallback(
    (text: string, player: TTSStreamingPlayer, voiceId: string, retryLeft = MAX_WS_RETRIES): Promise<void> => {
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
          if (retryLeft > 0 && !stoppedRef.current) {
            logger.warn(LogCategory.AUDIO, '[TTS] WS error, retrying', { retryLeft });
            settle(() => {
              speakSentenceDirect(text, player, voiceId, retryLeft - 1).then(resolve).catch(reject);
            });
          } else {
            settle(() => reject(new Error('WebSocket error')));
          }
        };

        ws.onclose = () => {
          if (activeWsRef.current === ws) activeWsRef.current = null;
          settle(() => resolve());
        };
      });
    },
    []
  );

  // ─── Queue : UN player pour tout le stream, phrases séquentielles ────────

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const player = playerRef.current;
    if (!player) { isProcessingRef.current = false; return; }
    const voiceId = voiceIdRef.current;

    while (sentenceQueueRef.current.length > 0) {
      if (stoppedRef.current) break;

      const text = sentenceQueueRef.current.shift()!;

      // ── Prefetch la phrase d'après pendant qu'on traite celle-ci ──
      const nextText = sentenceQueueRef.current[0];
      if (nextText && !stoppedRef.current && !prefetchRef.current) {
        startPrefetch(nextText, voiceId);
      }

      try {
        // Slot préchargé qui correspond à cette phrase ?
        const slot = prefetchRef.current;
        if (slot && slot.text === text && !slot.failed) {
          prefetchRef.current = null;
          activeWsRef.current = slot.ws;
          await injectSlot(slot, player);
          if (activeWsRef.current === slot.ws) activeWsRef.current = null;
        } else {
          // Pas de slot ou slot raté → lecture directe dans le même player
          if (slot && slot.text === text && slot.failed) {
            cancelPrefetch();
          }
          await speakSentenceDirect(text, player, voiceId);
        }
      } catch (err) {
        if (stoppedRef.current) break;
        logger.error(
          LogCategory.AUDIO,
          '[TTS] Sentence failed, skipping',
          undefined,
          err instanceof Error ? err : new Error(String(err))
        );
        cancelPrefetch();
        continue;
      }
    }

    // Stream terminé ET queue vide → fermer le MediaSource
    if (!stoppedRef.current && streamEndedRef.current && sentenceQueueRef.current.length === 0) {
      safeEndOfStream();
    }

    isProcessingRef.current = false;
  }, [startPrefetch, injectSlot, speakSentenceDirect, safeEndOfStream, cancelPrefetch]);

  // ─── API publique ─────────────────────────────────────────────────────────

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

  const pushText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      sentenceQueueRef.current.push(trimmed);

      // Prefetch immédiat si on traite déjà une phrase et que celle-ci est la prochaine
      if (
        !stoppedRef.current &&
        isProcessingRef.current &&
        !prefetchRef.current
      ) {
        startPrefetch(trimmed, voiceIdRef.current);
      }

      processQueue();
    },
    [processQueue, startPrefetch]
  );

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
