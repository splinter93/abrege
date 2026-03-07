'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { getCachedBlob, setCachedBlob } from '@/utils/ttsCache';
import { normalizeTTSVoice } from '@/constants/ttsVoices';

interface TextToSpeechContextValue {
  speak: (text: string, options?: { voiceId?: string; messageId?: string }) => Promise<void>;
  stop: () => void;
  isPlayingMessageId: string | null;
}

const TextToSpeechContext = createContext<TextToSpeechContextValue | null>(null);

interface TextToSpeechProviderProps {
  children: React.ReactNode;
  /** Voix par défaut (ex: agent.voice). Si invalide, fallback sur eve. */
  defaultVoiceId?: string;
}

export function TextToSpeechProvider({ children, defaultVoiceId }: TextToSpeechProviderProps) {
  const [isPlayingMessageId, setIsPlayingMessageId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsPlayingMessageId(null);
  }, []);

  const speak = useCallback(
    async (text: string, options?: { voiceId?: string; messageId?: string }) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stop();
      const voiceId = normalizeTTSVoice(options?.voiceId ?? defaultVoiceId);
      const messageId = options?.messageId ?? null;

      try {
        setIsPlayingMessageId(messageId);

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

  return (
    <TextToSpeechContext.Provider value={{ speak, stop, isPlayingMessageId }}>
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
