'use client';

import { useState, useCallback, useRef } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { normalizeTTSVoice } from '@/constants/ttsVoices';
import { getCachedBlob, setCachedBlob } from '@/utils/ttsCache';

export interface UseTextToSpeechReturn {
  speak: (text: string, voiceId?: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  error: string | null;
}

/**
 * Hook standalone pour la synthèse vocale via xAI TTS (proxy backend).
 * Safari-safe : utilise <audio> + blob URL (pas d'AudioContext).
 * Utilise le cache LRU et normalizeTTSVoice comme TextToSpeechContext.
 */
export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(async (text: string, voiceId?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    stop();
    setError(null);

    const voice = normalizeTTSVoice(voiceId);

    try {
      setIsPlaying(true);

      let blob: Blob | null = getCachedBlob(trimmed, voice);

      if (!blob) {
        const response = await fetch('/api/ui/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, voice_id: voice })
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
          throw new Error(err.error ?? `TTS ${response.status}`);
        }

        blob = await response.blob();
        setCachedBlob(trimmed, voice, blob);
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setIsPlaying(false);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setIsPlaying(false);
          reject(new Error('Erreur lecture audio'));
        };
        audio.play().catch(reject);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la lecture';
      setError(msg);
      logger.error(`[TTS] ${msg}`, e);
      setIsPlaying(false);
      currentAudioRef.current = null;
    }
  }, [stop]);

  return { speak, stop, isPlaying, error };
}
