'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Plus, Zap, Globe, Search, ArrowUp } from 'react-feather';
import LoadingSpinner from './LoadingSpinner';
import AudioRecorder from './AudioRecorder';
import { logger, LogCategory } from '@/utils/logger';
import './LoadingSpinner.css';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading, textareaRef, disabled = false, placeholder = "Envoyer un message..." }) => {
  const [message, setMessage] = React.useState('');
  const [audioError, setAudioError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    setMessage(e.target.value);
  };

  const handleSend = () => {
    logger.debug(LogCategory.API, '🚀 Tentative d\'envoi:', { 
      message: message.trim(), 
      loading, 
      disabled,
      messageLength: message.length 
    });
    
    if (message.trim() && !loading && !disabled) {
      logger.debug(LogCategory.API, '✅ Envoi du message');
      onSend(message);
      setMessage('');
    } else {
      logger.debug(LogCategory.API, '❌ Envoi bloqué:', { 
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

  // Gérer la hauteur du textarea
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
          {/* Composant AudioRecorder isolé et propre */}
          <AudioRecorder 
            onTranscriptionComplete={handleTranscriptionComplete}
            onError={setAudioError}
            disabled={disabled}
          />
          
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