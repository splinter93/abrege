"use client";
import React, { useState, useRef, useEffect } from 'react';
import ChatInput from './ChatInput';
import MarkdownMessage from './MarkdownMessage';
import { getSynesiaResponse } from './chatService';
import './chat.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatComponentProps {
  className?: string;
}

const ChatComponent: React.FC<ChatComponentProps> = ({ className = '' }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await getSynesiaResponse(message, messages);
      
      if (response.error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Erreur: ${response.error}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      } else if (response.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erreur lors de la communication avec l\'IA',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const onToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button onClick={onToggle} className="chat-toggle-button">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {isOpen && (
        <div className={`chat-container ${className}`}>
          <div className="chat-header">
            <div className="chat-title">
              <span>Assistant IA</span>
            </div>
          </div>

          <div className="chat-content">
            <div className="messages-container">
              <div className="message-list">
                {messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}>
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
              onSend={handleSend}
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