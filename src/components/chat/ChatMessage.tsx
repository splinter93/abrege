'use client';
import React from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
  isStreaming?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, className, isStreaming = false }) => {
  // Vérification de sécurité
  if (!message) {
    console.warn('ChatMessage: message is undefined');
    return null;
  }
  
  const { role, content } = message;

  const renderToolCalls = () => {
    if (!message.tool_calls || message.tool_calls.length === 0) return null;
    
    return (
      <div className="chat-tool-calls">
        {message.tool_calls.map((toolCall, index) => (
          <div key={index} className="chat-tool-call">
            <div className="chat-tool-call-header">
              <span className="chat-tool-call-name">{toolCall.function?.name}</span>
            </div>
            <div className="chat-tool-call-args">
              <pre>{JSON.stringify(toolCall.function?.arguments, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderToolResult = () => {
    if (!message.tool_call_id) return null;
    
    return (
      <div className="chat-tool-result">
        <div className="chat-tool-result-header">
          <span>Résultat de l'outil</span>
        </div>
        <div className="chat-tool-result-content">
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className={`chat-message chat-message-${role} ${className || ''}`}>
      <div className={`chat-message-bubble chat-message-bubble-${role}`}>
        {/* Contenu markdown normal (pas pour les messages tool) */}
        {content && role !== 'tool' && (
          <div 
            className="chat-markdown"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        
        {/* Tool calls (style ChatGPT) */}
        {renderToolCalls()}
        
        {/* Résultat de tool call */}
        {renderToolResult()}
        
        {/* Indicateur de frappe */}
        {isStreaming && (
          <div className="chat-typing-indicator">
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
          </div>
        )}
      </div>
    </div>
  );
};

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
