'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Volume2, Loader, X } from 'lucide-react';
import { xaiVoiceService, XAIVoiceSessionConfig } from '@/services/xai/xaiVoiceService';
import type { XAIVoiceTool } from '@/services/xai/types';
import { logger, LogCategory } from '@/utils/logger';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';
import { useAudioQueue } from '@/hooks/voice/useAudioQueue';
import { useTranscriptMessages, type TranscriptMessage } from '@/hooks/voice/useTranscriptMessages';
import './XAIVoiceChat.css';

/**
 * Props du composant XAI Voice Chat
 */
interface XAIVoiceChatProps {
  voice?: 'Ara' | 'Rex' | 'Sal' | 'Eve' | 'Leo';
  instructions?: string;
  tools?: XAIVoiceTool[];
  tool_choice?: 'auto' | 'none' | 'required';
  onError?: (error: string) => void;
}

/**
 * État du composant
 */
interface XAIVoiceState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  messages: TranscriptMessage[];
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
  tools,
  tool_choice,
  onError
}: XAIVoiceChatProps) {
  // Hooks extraits
  const { messages, addUserMessage, updateAssistantMessage, reset: resetTranscript } = useTranscriptMessages();
  const { addAudioChunk, stop: stopAudioQueue } = useAudioQueue();

  const [state, setState] = useState<Omit<XAIVoiceState, 'messages'>>({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    error: null
  });
  
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  const mediaRecorderRef = useRef<{ stream: MediaStream; processor: ScriptProcessorNode } | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const tokenRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);

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
      logger.error(LogCategory.AUDIO, '[XAIVoiceChat] Erreur chargement token', undefined, error instanceof Error ? error : new Error(String(error)));
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
          logger.info(LogCategory.AUDIO, '[XAIVoiceChat] ✅ Connecté');
          setState(prev => ({ ...prev, isConnected: true, error: null }));

          // Configurer la session
          const sessionConfig: XAIVoiceSessionConfig = {
            instructions,
            voice,
            input_audio_format: 'audio/pcm',
            output_audio_format: 'audio/pcm',
            sample_rate: 24000,
            modalities: ['text', 'audio'],
            tools,
            tool_choice
          };
          xaiVoiceService.configureSession(sessionConfig);
        },
        onDisconnected: () => {
          logger.info(LogCategory.AUDIO, '[XAIVoiceChat] Déconnecté');
          setState(prev => ({ ...prev, isConnected: false }));
        },
        onAudioDelta: (audioBase64: string) => {
          // Ajouter l'audio à la queue (hook gère la lecture)
          addAudioChunk(audioBase64);
        },
        onAudioDone: () => {
          logger.info(LogCategory.AUDIO, '[XAIVoiceChat] Audio reçu terminé');
          setState(prev => ({ ...prev, isProcessing: false }));
        },
        onTranscriptDelta: (text: string) => {
          // Delta = chunks de l'assistant en streaming
          updateAssistantMessage(text);
        },
        onTranscriptDone: (text: string) => {
          // Done = transcription complète du user
          logger.info(LogCategory.AUDIO, '[XAIVoiceChat] Transcription user terminée', { text });
          addUserMessage(text);
        },
        onError: (error) => {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logger.error(LogCategory.AUDIO, '[XAIVoiceChat] Erreur', { error }, error instanceof Error ? error : undefined);
          setState(prev => ({ ...prev, error: errorMsg, isProcessing: false }));
          onError?.(errorMsg);
        }
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur de connexion';
      setState(prev => ({ ...prev, error: errorMsg, isConnected: false }));
      onError?.(errorMsg);
    }
  }, [loadToken, instructions, voice, tools, tool_choice, onError, addAudioChunk, updateAssistantMessage, addUserMessage]);

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
        if (!isRecordingRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0);
        
        // Conversion Float32 [-1, 1] -> Int16 LE [-32768, 32767]
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          // Formule standard: clamp et round vers Int16
          pcm16[i] = Math.round(s * 32767);
        }

        // Convertir Int16Array -> Uint8Array (little-endian par défaut dans les navigateurs)
        const uint8Array = new Uint8Array(pcm16.buffer);
        const binaryString = Array.from(uint8Array)
          .map(byte => String.fromCharCode(byte))
          .join('');
        const base64 = btoa(binaryString);

        // Envoyer l'audio
        try {
          logger.info(LogCategory.AUDIO, '[XAIVoiceChat] Envoi chunk audio', { 
            base64Length: base64.length,
            pcmLength: pcm16.length 
          });
          xaiVoiceService.sendAudio(base64);
        } catch (error) {
          logger.error(LogCategory.AUDIO, '[XAIVoiceChat] Erreur envoi audio', undefined, error instanceof Error ? error : new Error(String(error)));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      isRecordingRef.current = true;
      setState(prev => ({
        ...prev,
        isRecording: true,
        isProcessing: false,
        error: null
      }));

      // Stocker les références pour cleanup
      mediaRecorderRef.current = {
        stream,
        processor
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erreur d\'accès au microphone';
      logger.error(LogCategory.AUDIO, '[XAIVoiceChat] Erreur démarrage enregistrement', undefined, error instanceof Error ? error : new Error(String(error)));
      setState(prev => ({ ...prev, error: errorMsg }));
      onError?.(errorMsg);
    }
  }, [state.isConnected, connect, onError, state.isRecording]);

  /**
   * Arrêter l'enregistrement
   */
  const stopRecording = useCallback(() => {
    logger.info(LogCategory.AUDIO, '[XAIVoiceChat] 🛑 stopRecording appelé');
    isRecordingRef.current = false;
    setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

    // Cleanup audio IMMÉDIAT (arrêter stream, etc.)
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (mediaRecorderRef.current?.processor) {
      mediaRecorderRef.current.processor.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;

    // CRITIQUE: Finaliser l'envoi audio AVANT toute autre chose
    try {
      logger.info(LogCategory.AUDIO, '[XAIVoiceChat] 🔵 CALL commitAudio depuis stopRecording');
      xaiVoiceService.commitAudio();
    } catch (error) {
      logger.error(LogCategory.AUDIO, '[XAIVoiceChat] Erreur finalisation audio', undefined, error instanceof Error ? error : new Error(String(error)));
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : String(error), isProcessing: false }));
    }
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
   * Arrêter complètement le voice chat (STOP)
   */
  const stop = useCallback(() => {
    logger.info(LogCategory.AUDIO, '[XAIVoiceChat] 🛑 STOP demandé - Arrêt complet');
    
    // Si enregistrement en cours, d'abord commitAudio
    if (isRecordingRef.current || state.isRecording) {
      logger.info(LogCategory.AUDIO, '[XAIVoiceChat] Enregistrement en cours - commitAudio d\'abord');
      stopRecording();
      // Le disconnect sera géré par le guard inFlight dans le service
    }
    
    // Arrêter l'audio en cours de lecture (hook gère la queue)
    stopAudioQueue();
    
    // Fermer l'audio context (mais pas la WS encore)
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    
    // Nettoyer les références
    mediaRecorderRef.current = null;
    tokenRef.current = null;
    
    // Déconnecter la connexion WebSocket (le service gère le guard inFlight)
    // Si commitAudio vient d'être appelé, disconnect() sera reporté automatiquement
    xaiVoiceService.disconnect();
    
    // Réinitialiser l'état
    setState({
      isConnected: false,
      isRecording: false,
      isProcessing: false,
      error: null
    });
    resetTranscript();
    
    logger.info(LogCategory.AUDIO, '[XAIVoiceChat] ✅ STOP complet - Déconnexion initiée (peut être reportée si inFlight)');
  }, [state.isRecording, stopRecording, stopAudioQueue, resetTranscript]);

  /**
   * Nettoyage au démontage (uniquement lors du démontage du composant)
   */
  useEffect(() => {
    return () => {
      // Cleanup uniquement au démontage, pas via stop() pour éviter les appels multiples
      logger.info(LogCategory.AUDIO, '[XAIVoiceChat] Cleanup au démontage');
      xaiVoiceService.disconnect();
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current?.processor) {
        mediaRecorderRef.current.processor.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []); // Dépendances vides = uniquement au démontage

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    if (transcriptContainerRef.current) {
      const messagesContainer = transcriptContainerRef.current.querySelector('.xai-voice-chat__messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="xai-voice-chat">
      <div className="xai-voice-chat__header">
        <h2>XAI Voice Chat</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`xai-voice-chat__status ${state.isConnected ? 'connected' : 'disconnected'}`}>
            {state.isConnected ? 'Connecté' : 'Déconnecté'}
          </div>
          {(state.isConnected || state.isRecording || state.isProcessing) && (
            <button
              className="xai-voice-chat__stop-button"
              onClick={stop}
              title="Arrêter complètement (STOP)"
              aria-label="Arrêter complètement"
            >
              <X className="xai-voice-chat__stop-icon" />
              STOP
            </button>
          )}
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
        {state.isConnected && (
          <button
            className="xai-voice-chat__test-text-button"
            onClick={async () => {
              try {
                if (!state.isConnected) {
                  await connect();
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                logger.info(LogCategory.AUDIO, '[XAIVoiceChat] Test TEXT envoyé');
                xaiVoiceService.sendTextMessage('hello');
                setState(prev => ({ ...prev, isProcessing: true }));
              } catch (error) {
                logger.error(LogCategory.AUDIO, '[XAIVoiceChat] Erreur test TEXT', undefined, error instanceof Error ? error : new Error(String(error)));
                setState(prev => ({ ...prev, error: error instanceof Error ? error.message : String(error) }));
              }
            }}
          >
            Test TEXT
          </button>
        )}
      </div>

      {messages.length > 0 && (
        <div className="xai-voice-chat__transcript" ref={transcriptContainerRef}>
          <h3>Conversation</h3>
          <div className="xai-voice-chat__messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`xai-voice-chat__message xai-voice-chat__message--${message.role}`}
              >
                <div className="xai-voice-chat__message-label">
                  {message.role === 'user' ? 'Vous' : 'Assistant'}
                </div>
                <div className="xai-voice-chat__message-text">{message.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

