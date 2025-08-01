"use client";
import React, { useState, useRef, useEffect } from 'react';
import ChatInput from './ChatInput';
import MarkdownMessage from './MarkdownMessage';
import ChatKebabMenu from './ChatKebabMenu';
import { useChatMessages } from './useChatMessages';
import './chat.css';

interface ChatComponentProps {
  className?: string;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ className = '' }) => {
  const { messages, loading, sendMessage } = useChatMessages();
  const [isOpen, setIsOpen] = useState(false);
  const [isWideMode, setIsWideMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleToggleWideMode = () => {
    setIsWideMode(!isWideMode);
  };

  return (
    <>
      <button 
        onClick={onToggle} 
        className="chat-toggle-button"
        aria-label={isOpen ? "Fermer le chat" : "Ouvrir le chat"}
        aria-expanded={isOpen}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {isOpen && (
        <div className={`chat-container ${isWideMode ? 'chat-container-wide' : 'chat-container-normal'} ${className}`} role="dialog" aria-label="Chat avec l'assistant IA">
          <div className="chat-header">
            <div className="chat-title">
              <span>Scrivia Chat</span>
            </div>
            <ChatKebabMenu 
              isWideMode={isWideMode}
              onToggleWideMode={handleToggleWideMode}
            />
          </div>

          <div className="chat-content">
            <div className="messages-container" role="log" aria-live="polite" aria-label="Messages du chat">
              <div className="message-list">
                {messages.map((msg, idx) => (
                  <div 
                    key={msg.id || idx} 
                    className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
                    role="article"
                    aria-label={`Message ${msg.role === 'user' ? 'utilisateur' : 'assistant'}`}
                  >
                    <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                      {msg.role === 'assistant' ? (
                        <MarkdownMessage content={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {loading && (
                <div className="loading-bubble">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <ChatInput
              onSend={sendMessage}
              loading={loading}
              textareaRef={textareaRef}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatComponent; 