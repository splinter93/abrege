'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { getCachedBlob, setCachedBlob } from '@/utils/ttsCache';
import { normalizeTTSVoice } from '@/constants/ttsVoices';
import { useTTSStreaming } from '@/hooks/useTTSStreaming';

interface TextToSpeechContextValue {
  speak: (text: string, options?: { voiceId?: string; messageId?: string }) => Promise<void>;
  /** Incremental TTS: open connection (streaming mode only) */
  startStream: (options?: { voiceId?: string; messageId?: string }) => void;
  /** Incremental TTS: push a text segment */
  pushText: (text: string) => void;
  /** Incremental TTS: signal end of stream */
  endStream: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isPlayingMessageId: string | null;
  isPaused: boolean;
}

const TextToSpeechContext = createContext<TextToSpeechContextValue | null>(null);

interface TextToSpeechProviderProps {
  children: React.ReactNode;
  /** Voix par défaut (ex: agent.voice). Si invalide, fallback sur eve. */
  defaultVoiceId?: string;
  /** Si true, utilise le TTS streaming (WebSocket) au lieu du REST. */
  streamingMode?: boolean;
}

export function TextToSpeechProvider({ children, defaultVoiceId, streamingMode = false }: TextToSpeechProviderProps) {
  const [isPlayingMessageId, setIsPlayingMessageId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const streaming = useTTSStreaming(defaultVoiceId);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsPlayingMessageId(null);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.play().catch(() => {});
      setIsPaused(false);
    }
  }, []);

  const speakRest = useCallback(
    async (text: string, options?: { voiceId?: string; messageId?: string }) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stop();
      const voiceId = normalizeTTSVoice(options?.voiceId ?? defaultVoiceId);
      const messageId = options?.messageId ?? null;

      try {
        setIsPlayingMessageId(messageId ?? '__playing');
        setIsPaused(false);

        let blob: Blob | null = getCachedBlob(trimmed, voiceId);

        if (!blob) {
          const response = await fetch('/api/ui/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: trimmed, voice_id: voiceId })
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
            throw new Error(err.error || `TTS ${response.status}`);
          }

          blob = await response.blob();
          setCachedBlob(trimmed, voiceId, blob);
        }

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            currentAudioRef.current = null;
            setIsPlayingMessageId(null);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            currentAudioRef.current = null;
            setIsPlayingMessageId(null);
            reject(new Error('Erreur lecture audio'));
          };
          audio.play().catch(reject);
        });
      } catch (e) {
        logger.error(`[TTS] ${e instanceof Error ? e.message : 'Erreur'}`, e);
        setIsPlayingMessageId(null);
        currentAudioRef.current = null;
      }
    },
    [stop, defaultVoiceId]
  );

  const speak = useCallback(
    async (text: string, options?: { voiceId?: string; messageId?: string }): Promise<void> => {
      if (streamingMode) {
        streaming.speak(text, options);
        return;
      }
      await speakRest(text, options);
    },
    [streamingMode, streaming.speak, speakRest]
  );

  const stopUnified = useCallback(() => {
    if (streamingMode) {
      streaming.stop();
    } else {
      stop();
    }
  }, [streamingMode, streaming.stop, stop]);

  const pauseUnified = useCallback(() => {
    if (streamingMode) {
      streaming.pause();
    } else {
      pause();
    }
  }, [streamingMode, streaming.pause, pause]);

  const resumeUnified = useCallback(() => {
    if (streamingMode) {
      streaming.resume();
    } else {
      resume();
    }
  }, [streamingMode, streaming.resume, resume]);

  const noop = useCallback(() => {}, []);

  const isPlayingMessageIdUnified = streamingMode ? streaming.isPlayingMessageId : isPlayingMessageId;
  const isPausedUnified = streamingMode ? streaming.isPaused : isPaused;

  return (
    <TextToSpeechContext.Provider
      value={{
        speak,
        startStream: streamingMode ? streaming.startStream : noop,
        pushText: streamingMode ? streaming.pushText : noop,
        endStream: streamingMode ? streaming.endStream : noop,
        stop: stopUnified,
        pause: pauseUnified,
        resume: resumeUnified,
        isPlayingMessageId: isPlayingMessageIdUnified,
        isPaused: isPausedUnified
      }}
    >
      {children}
    </TextToSpeechContext.Provider>
  );
}

export function useTextToSpeechContext(): TextToSpeechContextValue {
  const ctx = useContext(TextToSpeechContext);
  if (!ctx) {
    throw new Error('useTextToSpeechContext must be used within TextToSpeechProvider');
  }
  return ctx;
}

export function useTextToSpeechContextOptional(): TextToSpeechContextValue | null {
  return useContext(TextToSpeechContext);
}
