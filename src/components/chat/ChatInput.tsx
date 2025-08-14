'use client';
import React, { useEffect } from 'react';
import { Send, Plus, Zap, Globe, Search, Mic, ArrowUp } from 'react-feather';
import LoadingSpinner from './LoadingSpinner';
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

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    setMessage(e.target.value);
  };

  const handleSend = () => {
    if (message.trim() && !loading && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
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
          
          <button 
            onClick={handleSend} 
            disabled={!message.trim() || loading || disabled}
            className="chat-input-mic"
            aria-label="Microphone"
          >
            {loading ? (
              <LoadingSpinner size={16} variant="spinner" className="loading-spinner" />
            ) : (
              <Mic size={16} />
            )}
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