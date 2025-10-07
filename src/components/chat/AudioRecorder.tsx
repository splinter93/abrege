'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader } from 'react-feather';
import { logger } from '@/utils/logger';

interface AudioRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  variant?: 'chat' | 'toolbar';
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
  audioBlob: Blob | null;
}

export default function AudioRecorder({ 
  onTranscriptionComplete, 
  onError, 
  disabled = false,
  variant = 'chat'
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0,
    audioBlob: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Vérifier si l'enregistrement audio est supporté
  const isAudioSupported = typeof window !== 'undefined' && 
    'MediaRecorder' in window && 
    'getUserMedia' in navigator;

  // Démarrer l'enregistrement
  const startRecording = useCallback(async () => {
    if (!isAudioSupported) {
      onError('L\'enregistrement audio n\'est pas supporté par votre navigateur');
      return;
    }

    if (disabled) return;

    try {
      logger.debug('[AudioRecorder] 🎤 Démarrage de l\'enregistrement', {});

      // Demander l'accès au microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Créer le MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Gérer les données audio
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Gérer la fin de l'enregistrement
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setState(prev => ({ ...prev, audioBlob, isRecording: false }));
        
        // Arrêter le stream
        stream.getTracks().forEach(track => track.stop());
        
        // Traiter l'audio
        processAudio(audioBlob);
      };

      // Démarrer l'enregistrement
      mediaRecorder.start();
      startTimeRef.current = Date.now();
      
      // Démarrer le timer
      durationIntervalRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration }));
      }, 1000);

      setState(prev => ({ ...prev, isRecording: true, duration: 0 }));

      logger.debug('[AudioRecorder] ✅ Enregistrement démarré', {});

    } catch (error) {
      logger.error('[AudioRecorder] ❌ Erreur lors du démarrage:', error);
      onError('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  }, [isAudioSupported, disabled, onError]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !state.isRecording) return;

    logger.debug('[AudioRecorder] 🛑 Arrêt de l\'enregistrement');

    // Arrêter l'enregistrement
    mediaRecorderRef.current.stop();
    
    // Arrêter le timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));
  }, [state.isRecording]);

  // Traiter l'audio avec Whisper
  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      logger.debug('[AudioRecorder] 🎵 Traitement audio avec Whisper');

      // Créer le FormData
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'text');
      formData.append('temperature', '0');

      // Appeler l'API Whisper
      const response = await fetch('/api/ui/whisper/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data.text) {
        logger.debug('[AudioRecorder] ✅ Transcription réussie:', result.data.text);
        onTranscriptionComplete(result.data.text.trim());
      } else {
        throw new Error('Aucun texte transcrit');
      }

    } catch (error) {
      logger.error('[AudioRecorder] ❌ Erreur lors de la transcription:', error);
      onError(error instanceof Error ? error.message : 'Erreur lors de la transcription');
    } finally {
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        audioBlob: null,
        duration: 0 
      }));
    }
  }, [onTranscriptionComplete, onError]);

  // Gérer le clic sur le bouton
  const handleClick = useCallback(() => {
    if (disabled || state.isProcessing) return;

    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [disabled, state.isRecording, state.isProcessing, startRecording, stopRecording]);

  // Nettoyer les intervalles au démontage
  React.useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);



  // Déterminer l'icône et la classe selon le variant
  const getButtonState = () => {
    const baseClass = variant === 'toolbar' ? 'toolbar-btn' : 'chatgpt-input-mic';
    
    if (state.isProcessing) {
      return {
        icon: <Loader size={18} className="animate-spin" />,
        className: variant === 'toolbar' ? 'toolbar-btn processing' : 'chatgpt-input-mic-processing',
        title: 'Traitement en cours...'
      };
    }
    
    if (state.isRecording) {
      return {
        icon: <Square size={18} />,
        className: variant === 'toolbar' ? 'toolbar-btn recording' : 'chatgpt-input-mic-recording',
        title: 'Cliquer pour arrêter'
      };
    }
    
    return {
      icon: <Mic size={18} />,
      className: baseClass,
      title: 'Cliquer pour enregistrer'
    };
  };

  const buttonState = getButtonState();

  return (
    <button
      onClick={handleClick}
      disabled={disabled || state.isProcessing}
      className={buttonState.className}
      title={buttonState.title}
      aria-label={buttonState.title}
    >
      {buttonState.icon}
    </button>
  );
}
