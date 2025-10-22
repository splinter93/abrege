'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Send, Globe, Search, ArrowUp, Folder } from 'react-feather';
import { Lightbulb } from 'lucide-react';
import { logger, LogCategory } from '@/utils/logger';
import AudioRecorder from './AudioRecorder';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading, textareaRef, disabled = false, placeholder = "Commencez à discuter..." }) => {
  const [message, setMessage] = React.useState('');
  const [audioError, setAudioError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  // ✅ MÉMOIRE: Gérer la transcription audio avec cleanup
  const handleTranscriptionComplete = useCallback((text: string) => {
    setMessage(prev => prev + (prev ? ' ' : '') + text);
    setAudioError(null);
    
    // Focus sur le textarea pour permettre l'édition avec cleanup
    const timeoutId = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }, 100);
    
    // ✅ MÉMOIRE: Cleanup du timeout si le composant se démonte
    return () => clearTimeout(timeoutId);
  }, [textareaRef]);

  // Gérer la hauteur du textarea
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = 'auto';
      
      // Calculate new height based on content
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 18; // min-height from CSS
      const maxHeight = 80; // max-height from CSS
      
      // Apply height with constraints
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [message, textareaRef]);

  return (
    <div className="chatgpt-input-area">
      {/* Affichage des erreurs audio */}
      {audioError && (
        <div className="chatgpt-message-error">
          <div className="chatgpt-message-bubble">
            <span className="chatgpt-message-status-icon error">🎤</span>
            <span>{audioError}</span>
            <button 
              className="chatgpt-message-action"
              onClick={() => setAudioError(null)}
              aria-label="Fermer l'erreur"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Zone de texte principale */}
      <textarea
        ref={textareaRef}
        value={message}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="chatgpt-input-textarea"
        rows={1}
        disabled={false}
      />
      
      {/* Actions de l'input */}
      <div className="chatgpt-input-actions">
        <button className="chatgpt-input-speaker" aria-label="Ajouter">
          <Folder size={18} />
        </button>
        <button className="chatgpt-input-web-search" aria-label="Recherche web">
          <Globe size={18} />
        </button>
        <button className="chatgpt-input-mic" aria-label="Reasoning">
          <Lightbulb size={18} />
        </button>
        
        <div style={{ flex: 1 }}></div>
        
        <AudioRecorder 
          onTranscriptionComplete={handleTranscriptionComplete}
          onError={setAudioError}
          disabled={disabled}
        />
        
        <button 
          onClick={handleSend} 
          disabled={!message.trim() || loading || disabled}
          className={`chatgpt-input-send ${loading ? 'loading' : ''}`}
          aria-label="Envoyer le message"
        >
          {loading ? (
            <div className="chat-input-typing-dots">
              <div className="chat-input-typing-dot"></div>
              <div className="chat-input-typing-dot"></div>
              <div className="chat-input-typing-dot"></div>
            </div>
          ) : (
            <ArrowUp size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput; 