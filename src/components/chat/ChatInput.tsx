import React, { useState, useRef, RefObject, memo, useCallback } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

const ChatInput: React.FC<ChatInputProps> = memo(({ onSend, loading, textareaRef }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput && !loading) {
      onSend(trimmedInput);
      setInputValue('');
    }
  }, [inputValue, loading, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="input-area-container">
      <div className="input-area">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tapez votre message..."
          disabled={loading}
          rows={1}
          className="chat-textarea"
          aria-label="Zone de saisie du message"
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !inputValue.trim()}
          className="send-button"
          aria-label="Envoyer le message"
        >
          {loading ? (
            <div className="loading-spinner"></div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
});

export default ChatInput; 