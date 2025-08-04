import React, { useRef, useEffect } from 'react';
import { Send, Loader, Plus, Globe, Search, Type, Mic, ArrowUp } from 'react-feather';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, loading, textareaRef }) => {
  const [message, setMessage] = React.useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleSend = () => {
    if (message.trim() && !loading) {
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
    <div className="chatgpt-input-area">
      <div className="input-main-container">
        <div className="input-content">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Poser une question"
            className="chatgpt-textarea"
            rows={1}
          />
          
          <div className="input-icons-container">
            <div className="input-icons-left">
              <button className="icon-button" aria-label="Ajouter">
                <Plus size={16} />
              </button>
              <button className="icon-button" aria-label="Globe">
                <Globe size={16} />
              </button>
              <button className="icon-button" aria-label="Rechercher">
                <Search size={16} />
              </button>
              <button className="icon-button" aria-label="Format">
                <Type size={16} />
              </button>
              <span className="version-text">o3</span>
            </div>
          </div>
        </div>
        
                  <div className="input-actions">
            <button className="speaker-button" aria-label="Haut-parleur">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            </button>
            
            <button 
              onClick={handleSend} 
              disabled={!message.trim() || loading}
              className="mic-button-chatgpt"
              aria-label="Microphone"
            >
              {loading ? (
                <Loader size={16} className="loading-spinner" />
              ) : (
                <Mic size={16} />
              )}
            </button>
            
            <button 
              onClick={handleSend} 
              disabled={!message.trim() || loading}
              className="send-button-chatgpt"
              aria-label="Envoyer le message"
            >
              {loading ? (
                <Loader size={16} className="loading-spinner" />
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