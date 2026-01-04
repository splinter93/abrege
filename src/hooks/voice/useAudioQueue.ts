/**
 * Hook pour gérer la queue audio et la lecture des chunks audio reçus
 * Extrait de XAIVoiceChat.tsx pour réduire la taille du composant
 */

import { useRef, useCallback } from 'react';
import { logger, LogCategory } from '@/utils/logger';
import { createWavFile } from '@/utils/audio/wavEncoder';

/**
 * Return type du hook useAudioQueue
 */
export interface UseAudioQueueReturn {
  /**
   * Ajouter un chunk audio à la queue
   */
  addAudioChunk: (audioBase64: string) => void;
  
  /**
   * Arrêter la lecture et vider la queue
   */
  stop: () => void;
  
  /**
   * Jouer les chunks audio de la queue (appelé automatiquement par addAudioChunk)
   */
  playAudioQueue: () => Promise<void>;
}

/**
 * Hook pour gérer la queue audio et la lecture
 * 
 * Gère la queue de chunks audio Base64, les convertit en WAV et les joue séquentiellement
 */
export function useAudioQueue(): UseAudioQueueReturn {
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Jouer l'audio depuis la queue
   */
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;

    try {
      while (audioQueueRef.current.length > 0) {
        const audioBase64 = audioQueueRef.current.shift();
        if (!audioBase64) continue;

        // Convertir base64 en blob
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // PCM16 24kHz mono - créer un blob WAV
        const wavBlob = createWavFile(bytes, 24000, 1, 16);
        const audioUrl = URL.createObjectURL(wavBlob);

        // Jouer l'audio
        const audio = new Audio(audioUrl);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = reject;
          audio.play().catch(reject);
        });

        // Petit délai entre les chunks
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      logger.error(LogCategory.AUDIO, '[useAudioQueue] Erreur lecture audio', undefined, error instanceof Error ? error : new Error(String(error)));
    } finally {
      isPlayingRef.current = false;
    }
  }, []);

  /**
   * Ajouter un chunk audio à la queue et déclencher la lecture
   */
  const addAudioChunk = useCallback((audioBase64: string) => {
    audioQueueRef.current.push(audioBase64);
    playAudioQueue();
  }, [playAudioQueue]);

  /**
   * Arrêter la lecture et vider la queue
   */
  const stop = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  return {
    addAudioChunk,
    stop,
    playAudioQueue
  };
}

