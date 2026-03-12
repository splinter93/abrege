'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger, LogCategory } from '@/utils/logger';
import { normalizeTTSVoice } from '@/constants/ttsVoices';
import { TTSStreamingPlayer } from '@/utils/ttsStreamingPlayer';

const DEFAULT_PROXY_URL = 'ws://localhost:3001/ws/xai-voice';
const PROXY_BASE_URL = process.env.NEXT_PUBLIC_XAI_VOICE_PROXY_URL || DEFAULT_PROXY_URL;

/** Nombre de tentatives sur erreur WS avant abandon de la phrase */
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
 * Slot pré-chargé pour la phrase suivante.
 * La WS est ouverte et les chunks MP3 sont accumulés en mémoire.
 * Quand la phrase courante finit de jouer, on injecte les chunks dans le player principal.
 */
interface PrefetchedSlot {
  text: string;
  ws: WebSocket | null;
  chunks: Uint8Array[];
  /** true dès que audio.done est reçu — tous les chunks sont disponibles */
  audioDone: boolean;
  /** true si la WS a échoué → slot inutilisable, fallback direct */
  failed: boolean;
  error: Error | null;
  /** Callbacks pour notifier la fin du prefetch */
  onAudioDone: (() => void) | null;
  onError: ((err: Error) => void) | null;
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

  /** Slot de la phrase suivante pré-chargée */
  const prefetchRef = useRef<PrefetchedSlot | null>(null);

  /** WS active de la phrase en cours de lecture (pour cleanup) */
  const activeWsRef = useRef<WebSocket | null>(null);

  // ─── Cleanup ─────────────────────────────────────────────────────────────

  const cancelPrefetch = useCallback(() => {
    const slot = prefetchRef.current;
    if (!slot) return;
    prefetchRef.current = null;
    slot.onAudioDone = null;
    slot.onError = null;
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

  // ─── Prefetch ─────────────────────────────────────────────────────────────

  /**
   * Ouvre une WS xAI pour la phrase suivante et accumule les chunks MP3 en mémoire.
   * Les chunks sont injectés dans le player principal dès que la phrase courante finit.
   */
  const startPrefetch = useCallback((text: string, voiceId: string): PrefetchedSlot => {
    const slot: PrefetchedSlot = {
      text,
      ws: null,
      chunks: [],
      audioDone: false,
      failed: false,
      error: null,
      onAudioDone: null,
      onError: null,
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
      if (prefetchRef.current !== slot) return; // slot annulé
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
          slot.onAudioDone?.();
        } else if (msg.type === 'error') {
          slot.failed = true;
          slot.error = new Error(msg.message ?? 'TTS error');
          slot.onError?.(slot.error);
        }
      } catch { /* ignore non-JSON */ }
    };

    ws.onerror = () => {
      if (prefetchRef.current !== slot) return;
      if (!slot.audioDone && !slot.failed) {
        slot.failed = true;
        slot.error = new Error('WebSocket error');
        slot.onError?.(slot.error);
      }
    };

    ws.onclose = () => {
      if (prefetchRef.current !== slot) return;
      // Close propre sans audio.done (ex: xAI ferme après done) → on considère ok
      if (!slot.failed && !slot.audioDone) {
        slot.audioDone = true;
        slot.onAudioDone?.();
      }
    };

    return slot;
  }, []);

  /**
   * Attend que le slot soit prêt (audio.done ou échec), puis injecte les chunks
   * dans le player principal. Résout quand le player a terminé la lecture.
   */
  const playFromSlot = useCallback(
    (slot: PrefetchedSlot, player: TTSStreamingPlayer): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (stoppedRef.current) { resolve(); return; }

        const inject = () => {
          if (stoppedRef.current) { resolve(); return; }
          if (slot.failed) {
            reject(slot.error ?? new Error('Prefetch failed'));
            return;
          }
          // Injecter tous les chunks accumulés dans le player principal
          for (const chunk of slot.chunks) {
            player.appendChunk(chunk);
          }
          slot.chunks = []; // libérer la mémoire
          // Signaler la fin au player
          try { player.endOfStream(); } catch { /* ignore */ }
          resolve();
        };

        if (slot.audioDone || slot.failed) {
          inject();
        } else {
          slot.onAudioDone = inject;
          slot.onError = (err) => reject(err);
        }
      });
    },
    []
  );

  // ─── Lecture directe (sans slot) ─────────────────────────────────────────

  /**
   * Lecture directe : ouvre une WS, pipe les chunks dans le player principal en temps réel.
   * Utilisé pour la première phrase et comme fallback si le prefetch a échoué.
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

  // ─── Player principal : attend la fin de lecture audio ───────────────────

  /**
   * Attache les callbacks onEnded/onError au player existant et résout
   * quand la lecture audio est terminée (après endOfStream()).
   */
  const waitForPlayerEnd = useCallback((player: TTSStreamingPlayer): Promise<void> => {
    return new Promise((resolve, reject) => {
      player.setCallbacks({
        onEnded: () => resolve(),
        onError: (err) => reject(err),
      });
    });
  }, []);

  // ─── Queue processing avec pipelining ────────────────────────────────────

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const voiceId = voiceIdRef.current;

    while (sentenceQueueRef.current.length > 0) {
      if (stoppedRef.current) break;

      const text = sentenceQueueRef.current.shift()!;
      const player = playerRef.current;
      if (!player) break;

      try {
        const existingSlot = prefetchRef.current;
        const slotMatchesText = existingSlot && existingSlot.text === text && !existingSlot.failed;

        // ── Lancer le prefetch de la phrase suivante AVANT de commencer la lecture ──
        const nextText = sentenceQueueRef.current[0];
        if (nextText && !stoppedRef.current && !prefetchRef.current) {
          startPrefetch(nextText, voiceId);
        }

        if (slotMatchesText && existingSlot) {
          // ── Slot disponible : injecter les chunks déjà reçus + attendre la fin ──
          prefetchRef.current = null;
          activeWsRef.current = existingSlot.ws;
          await playFromSlot(existingSlot, player);
          if (activeWsRef.current === existingSlot.ws) activeWsRef.current = null;
          // playFromSlot a appelé endOfStream() → attendre la fin de lecture audio
          await waitForPlayerEnd(player);
        } else {
          // ── Pas de slot (première phrase ou prefetch raté) : lecture directe ──
          await speakSentenceDirect(text, player, voiceId);
          player.endOfStream();
          await waitForPlayerEnd(player);
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
        // On continue avec la phrase suivante — pas d'abandon total du stream
        continue;
      }

      // Entre deux phrases : préparer un nouveau player pour la suivante
      if (!stoppedRef.current && sentenceQueueRef.current.length > 0) {
        const nextPlayer = new TTSStreamingPlayer();
        playerRef.current = nextPlayer;
        nextPlayer.start({
          onEnded: () => { currentMessageIdRef.current = null; setIsPlayingMessageId(null); },
          onError: (err) => {
            logger.error(LogCategory.AUDIO, '[TTS] Player error', undefined, err instanceof Error ? err : new Error(String(err)));
          }
        });
        nextPlayer.getAudio()?.play().catch(() => {});

        // Si la phrase suivante n'a pas encore de slot, en démarrer un
        const nextText = sentenceQueueRef.current[0];
        if (nextText && !prefetchRef.current) {
          startPrefetch(nextText, voiceId);
        }
      }
    }

    if (!stoppedRef.current && streamEndedRef.current && sentenceQueueRef.current.length === 0) {
      safeEndOfStream();
    }

    isProcessingRef.current = false;
  }, [startPrefetch, playFromSlot, speakSentenceDirect, waitForPlayerEnd, safeEndOfStream, cancelPrefetch]);

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

      // Prefetch immédiat si on est en train de lire la première phrase et que
      // cette nouvelle phrase est la 2e dans la queue
      if (
        !stoppedRef.current &&
        isProcessingRef.current &&
        !prefetchRef.current &&
        sentenceQueueRef.current.length >= 1
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
