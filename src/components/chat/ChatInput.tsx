'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Plus, Zap, Globe, Search, Mic, Square, Loader, ArrowUp } from 'react-feather';
import LoadingSpinner from './LoadingSpinner';
import { logger } from '@/utils/logger';
import './LoadingSpinner.css';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
}

interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  duration: number;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading, textareaRef, disabled = false, placeholder = "Envoyer un message..." }) => {
  const [message, setMessage] = React.useState('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0
  });

  // Refs pour l'enregistrement audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Vérifier si l'enregistrement audio est supporté
  const isAudioSupported = typeof window !== 'undefined' && 
    'MediaRecorder' in window && 
    'getUserMedia' in navigator;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    setMessage(e.target.value);
  };

  const handleSend = () => {
    logger.debug('[ChatInput] 🚀 Tentative d\'envoi:', { 
      message: message.trim(), 
      loading, 
      disabled,
      messageLength: message.length 
    });
    
    if (message.trim() && !loading && !disabled) {
      logger.debug('[ChatInput] ✅ Envoi du message');
      onSend(message);
      setMessage('');
    } else {
      logger.debug('[ChatInput] ❌ Envoi bloqué:', { 
        hasMessage: !!message.trim(), 
        loading, 
        disabled 
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Démarrer l'enregistrement audio
  const startRecording = useCallback(async () => {
    if (!isAudioSupported) {
      setAudioError('L\'enregistrement audio n\'est pas supporté par votre navigateur');
      return;
    }

    if (disabled || recordingState.isProcessing) return;

    try {
      logger.debug('[ChatInput] 🎤 Démarrage de l\'enregistrement');

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
        setRecordingState(prev => ({ ...prev, isRecording: false, isProcessing: true }));
        
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
        setRecordingState(prev => ({ ...prev, duration }));
      }, 1000);

      setRecordingState(prev => ({ ...prev, isRecording: true, duration: 0 }));

      logger.debug('[ChatInput] ✅ Enregistrement démarré');

    } catch (error) {
      logger.error('[ChatInput] ❌ Erreur lors du démarrage:', error);
      setAudioError('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  }, [isAudioSupported, disabled, recordingState.isProcessing]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !recordingState.isRecording) return;

    logger.debug('[ChatInput] 🛑 Arrêt de l\'enregistrement');

    // Arrêter l'enregistrement
    mediaRecorderRef.current.stop();
    
    // Arrêter le timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, [recordingState.isRecording]);

  // Gérer la transcription audio complétée
  const handleTranscriptionComplete = useCallback((text: string) => {
    setMessage(prev => prev + (prev ? ' ' : '') + text);
    setAudioError(null);
    
    // Focus sur le textarea pour permettre l'édition
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }, 100);
  }, [textareaRef]);

  // Traiter l'audio avec Whisper
  const processAudio = useCallback(async (audioBlob: Blob) => {
    try {
      logger.debug('[ChatInput] 🎵 Traitement audio avec Whisper');
      logger.debug('[ChatInput] 📁 Taille du fichier audio:', { size: audioBlob.size });
      
      // Validation du blob audio
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Blob audio invalide ou vide');
      }
      
      if (!audioBlob.type.startsWith('audio/')) {
        logger.warn('[ChatInput] ⚠️ Type de blob non-audio:', { type: audioBlob.type });
      }

      // Créer le FormData
      const formData = new FormData();
      
      // S'assurer que le blob a le bon type MIME
      const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
      formData.append('file', audioFile);
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'text');
      formData.append('temperature', '0');

      logger.debug('[ChatInput] 🚀 Envoi vers /api/v1/whisper/transcribe');
      logger.debug('[ChatInput] 📋 FormData créé:', { 
        fileSize: audioBlob.size, 
        fileType: audioBlob.type,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({ key, valueType: typeof value }))
      });

      // Appeler l'API Whisper
      const response = await fetch('/api/v1/whisper/transcribe', {
        method: 'POST',
        body: formData
        // Ne pas ajouter de headers Content-Type, laissez le navigateur le faire automatiquement
      });

      logger.debug('[ChatInput] 📡 Réponse reçue:', { status: response.status, statusText: response.statusText });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[ChatInput] ❌ Erreur HTTP:', { status: response.status, error: errorText });
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.debug('[ChatInput] 📄 Résultat reçu:', result);
      
      if (result.success && result.data && result.data.text) {
        logger.debug('[ChatInput] ✅ Transcription réussie:', result.data.text);
        handleTranscriptionComplete(result.data.text.trim());
      } else {
        logger.error('[ChatInput] ❌ Pas de texte dans la réponse:', result);
        throw new Error('Aucun texte transcrit dans la réponse');
      }

    } catch (error) {
      logger.error('[ChatInput] ❌ Erreur lors de la transcription:', error);
      setAudioError(error instanceof Error ? error.message : 'Erreur lors de la transcription');
    } finally {
      setRecordingState(prev => ({ 
        ...prev, 
        isProcessing: false,
        duration: 0 
      }));
    }
  }, [handleTranscriptionComplete]);

  // Gérer le clic sur le bouton microphone
  const handleMicClick = useCallback(() => {
    if (disabled || recordingState.isProcessing) return;

    if (recordingState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [disabled, recordingState.isRecording, recordingState.isProcessing, startRecording, stopRecording]);

  // Nettoyer les intervalles au démontage
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      
      // Calculate new height based on content
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 24; // min-height from CSS
      const maxHeight = 300; // max-height from CSS
      
      // Apply height with constraints
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message, textareaRef]);

  // Déterminer l'icône et la classe du bouton microphone
  const getMicButtonState = () => {
    if (recordingState.isProcessing) {
      return {
        icon: <Loader size={16} className="animate-spin" />,
        className: 'chat-input-mic-processing',
        title: 'Traitement en cours...'
      };
    }
    
    if (recordingState.isRecording) {
      return {
        icon: <Square size={16} />,
        className: 'chat-input-mic-recording',
        title: 'Cliquer pour arrêter'
      };
    }
    
    return {
      icon: <Mic size={16} />,
      className: 'chat-input-mic',
      title: 'Cliquer pour enregistrer'
    };
  };

  const micButtonState = getMicButtonState();

  return (
    <div className="chat-input-area">
      {/* Affichage des erreurs audio */}
      {audioError && (
        <div className="chat-input-audio-error">
          <div className="chat-input-audio-error-content">
            <span className="chat-input-audio-error-icon">🎤</span>
            <span className="chat-input-audio-error-text">{audioError}</span>
            <button 
              className="chat-input-audio-error-close"
              onClick={() => setAudioError(null)}
              aria-label="Fermer l'erreur"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="chat-input-main">
        <div className="chat-input-content">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`chat-input-textarea ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            rows={1}
            disabled={disabled}
          />
          
          <div className="chat-input-icons">
            <div className="chat-input-icons-left">
              <button className="chat-input-icon-btn" aria-label="Ajouter">
                <Plus size={16} />
              </button>
              <button className="chat-input-icon-btn" aria-label="Reasoning">
                <Zap size={16} />
              </button>
              <button className="chat-input-icon-btn" aria-label="Globe">
                <Globe size={16} />
              </button>
              <button className="chat-input-icon-btn" aria-label="Rechercher">
                <Search size={16} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="chat-input-actions">
          <button className="chat-input-speaker" aria-label="Haut-parleur">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          </button>
          
          {/* Bouton microphone avec fonctionnalité d'enregistrement intégrée */}
          <button 
            onClick={handleMicClick}
            disabled={disabled || recordingState.isProcessing}
            className={`${micButtonState.className}`}
            aria-label={micButtonState.title}
            title={micButtonState.title}
          >
            {micButtonState.icon}
          </button>
          
          <button 
            onClick={handleSend} 
            disabled={!message.trim() || loading || disabled}
            className="chat-input-send"
            aria-label="Envoyer le message"
          >
            {loading ? (
              <LoadingSpinner size={16} variant="spinner" className="loading-spinner" />
            ) : (
              <ArrowUp size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput; 