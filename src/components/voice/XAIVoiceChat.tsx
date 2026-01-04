'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Volume2, Loader } from 'lucide-react';
import { xaiVoiceService, XAIVoiceSessionConfig } from '@/services/xai/xaiVoiceService';
import { logger, LogCategory } from '@/utils/logger';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';
import './XAIVoiceChat.css';

/**
 * Props du composant XAI Voice Chat
 */
interface XAIVoiceChatProps {
  voice?: 'Ara' | 'Rex' | 'Sal' | 'Eve' | 'Leo';
  instructions?: string;
  onError?: (error: string) => void;
}

/**
 * État du composant
 */
interface XAIVoiceState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
}

/**
 * Composant XAI Voice Chat
 * 
 * Interface simple pour converser avec XAI Voice via WebSocket
 */
export function XAIVoiceChat({
  voice = 'Ara',
  instructions = 'You are a helpful AI assistant. Respond naturally and concisely.',
  onError
}: XAIVoiceChatProps) {
  const [state, setState] = useState<XAIVoiceState>({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    transcript: '',
    error: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef<string | null>(null);

  /**
   * Charger le token éphémère
   */
  const loadToken = useCallback(async (): Promise<string> => {
    if (tokenRef.current) {
      return tokenRef.current;
    }

    try {
      // Récupérer le token d'authentification Supabase
      const supabase = getSupabaseClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error('Authentification requise. Veuillez vous connecter.');
      }

      const response = await fetch('/api/chat/voice/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Erreur ${response.status}` }));
        throw new Error(errorData.error || 'Erreur lors de la génération du token');
      }

      const data = await response.json();
      
      // Debug: logger la réponse pour diagnostiquer
      logger.info(LogCategory.AUDIO, '[XAIVoiceChat] Réponse API token', { 
        hasSuccess: !!data.success,
        hasClientSecret: !!data.client_secret,
        keys: Object.keys(data),
        clientSecretLength: data.client_secret?.length || 0,
        clientSecretPrefix: data.client_secret?.substring(0, 20) || 'none'
      });
      
      if (!data.success || !data.client_secret) {
        throw new Error(data.error || 'Token éphémère non reçu dans la réponse');
      }
      
      tokenRef.current = data.client_secret;
      return data.client_secret;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur lors de la génération du token';
      logger.error('[XAIVoiceChat] Erreur chargement token', error);
      setState(prev => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
      throw error;
    }
  }, [onError]);

  /**
   * Connecter au service XAI Voice
   */
  const connect = useCallback(async () => {
    try {
      const token = await loadToken();
      
      if (!token || typeof token !== 'string' || token.length === 0) {
        throw new Error('Token éphémère invalide ou manquant');
      }
      
      await xaiVoiceService.connect(token, {
        onConnected: () => {
          logger.info('[XAIVoiceChat] ✅ Connecté');
          setState(prev => ({ ...prev, isConnected: true, error: null }));

          // Configurer la session
          const sessionConfig: XAIVoiceSessionConfig = {
            instructions,
            voice,
            input_audio_format: 'audio/pcm',
            output_audio_format: 'audio/pcm',
            sample_rate: 24000,
            modalities: ['text', 'audio']
          };
          xaiVoiceService.configureSession(sessionConfig);
        },
        onDisconnected: () => {
          logger.info('[XAIVoiceChat] Déconnecté');
          setState(prev => ({ ...prev, isConnected: false }));
        },
        onAudioDelta: (audioBase64: string) => {
          // Ajouter l'audio à la queue
          audioQueueRef.current.push(audioBase64);
          playAudioQueue();
        },
        onAudioDone: () => {
          logger.info('[XAIVoiceChat] Audio reçu terminé');
          setState(prev => ({ ...prev, isProcessing: false }));
        },
        onTranscriptDelta: (text: string) => {
          setState(prev => ({
            ...prev,
            transcript: prev.transcript + text
          }));
        },
        onTranscriptDone: (text: string) => {
          logger.info('[XAIVoiceChat] Transcription terminée', { text });
          setState(prev => ({
            ...prev,
            transcript: text,
            isProcessing: false
          }));
        },
        onError: (error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error('[XAIVoiceChat] Erreur', { error });
          setState(prev => ({ ...prev, error: errorMsg, isProcessing: false }));
          onError?.(errorMsg);
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur de connexion';
      setState(prev => ({ ...prev, error: errorMsg, isConnected: false }));
      onError?.(errorMsg);
    }
  }, [loadToken, instructions, voice, onError]);

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
      logger.error('[XAIVoiceChat] Erreur lecture audio', error);
    } finally {
      isPlayingRef.current = false;
    }
  }, []);

  /**
   * Créer un fichier WAV depuis des données PCM
   */
  const createWavFile = (pcmData: Uint8Array, sampleRate: number, channels: number, bitsPerSample: number): Blob => {
    const length = pcmData.length;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true);
    view.setUint16(32, channels * bitsPerSample / 8, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    // PCM data
    const dataView = new Uint8Array(buffer, 44);
    dataView.set(pcmData);

    return new Blob([buffer], { type: 'audio/wav' });
  };

  /**
   * Démarrer l'enregistrement
   */
  const startRecording = useCallback(async () => {
    if (!state.isConnected) {
      await connect();
      // Attendre un peu que la connexion soit stable
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      });

      // Créer AudioContext pour convertir en PCM16
      const audioContext = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!state.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convertir en base64
        const uint8Array = new Uint8Array(pcm16.buffer);
        const binaryString = Array.from(uint8Array)
          .map(byte => String.fromCharCode(byte))
          .join('');
        const base64 = btoa(binaryString);

        // Envoyer l'audio
        try {
          xaiVoiceService.sendAudio(base64);
        } catch (error) {
          logger.error('[XAIVoiceChat] Erreur envoi audio', error);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setState(prev => ({
        ...prev,
        isRecording: true,
        isProcessing: false,
        transcript: '',
        error: null
      }));

      // Stocker les références pour cleanup
      (mediaRecorderRef as unknown as { current: { stream: MediaStream; processor: ScriptProcessorNode } }).current = {
        stream,
        processor
      } as unknown as MediaRecorder;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur d\'accès au microphone';
      logger.error('[XAIVoiceChat] Erreur démarrage enregistrement', error);
      setState(prev => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
    }
  }, [state.isConnected, connect, onError, state.isRecording]);

  /**
   * Arrêter l'enregistrement
   */
  const stopRecording = useCallback(() => {
    setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

    // Finaliser l'envoi audio
    try {
      xaiVoiceService.commitAudio();
    } catch (error) {
      logger.error('[XAIVoiceChat] Erreur finalisation audio', error);
    }

    // Cleanup
    const recorderRef = mediaRecorderRef.current as unknown as { stream?: MediaStream; processor?: ScriptProcessorNode };
    if (recorderRef?.stream) {
      recorderRef.stream.getTracks().forEach(track => track.stop());
    }
    if (recorderRef?.processor) {
      recorderRef.processor.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    mediaRecorderRef.current = null;
  }, []);

  /**
   * Toggle enregistrement
   */
  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state.isRecording, startRecording, stopRecording]);

  /**
   * Nettoyage au démontage
   */
  useEffect(() => {
    return () => {
      xaiVoiceService.disconnect();
      if (mediaRecorderRef.current) {
        const recorderRef = mediaRecorderRef.current as unknown as { stream?: MediaStream; processor?: ScriptProcessorNode };
        if (recorderRef?.stream) {
          recorderRef.stream.getTracks().forEach(track => track.stop());
        }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div className="xai-voice-chat">
      <div className="xai-voice-chat__header">
        <h2>XAI Voice Chat</h2>
        <div className={`xai-voice-chat__status ${state.isConnected ? 'connected' : 'disconnected'}`}>
          {state.isConnected ? 'Connecté' : 'Déconnecté'}
        </div>
      </div>

      {state.error && (
        <div className="xai-voice-chat__error">
          {state.error}
        </div>
      )}

      <div className="xai-voice-chat__controls">
        <button
          className={`xai-voice-chat__button ${state.isRecording ? 'recording' : ''} ${state.isProcessing ? 'processing' : ''}`}
          onClick={toggleRecording}
          disabled={state.isProcessing && !state.isRecording}
        >
          {state.isProcessing && !state.isRecording ? (
            <Loader className="xai-voice-chat__icon spin" />
          ) : state.isRecording ? (
            <Square className="xai-voice-chat__icon" />
          ) : (
            <Mic className="xai-voice-chat__icon" />
          )}
          {state.isRecording ? 'Arrêter' : state.isProcessing ? 'Traitement...' : 'Parler'}
        </button>
      </div>

      {state.transcript && (
        <div className="xai-voice-chat__transcript">
          <h3>Transcription :</h3>
          <p>{state.transcript}</p>
        </div>
      )}
    </div>
  );
}

