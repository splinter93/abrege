'use client';

import React, { memo } from 'react';
import { useMarkdownRender } from '@/hooks/editor/useMarkdownRender';
import './ChatMessage.css';

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
  isStreaming?: boolean;
}

const ChatMessage = memo<ChatMessageProps>(({ content, role, isStreaming = false }) => {
  const { html } = useMarkdownRender({ content });

  return (
    <div className={`chat-message chat-message-${role}`}>
      <div className={`chat-message-bubble chat-message-bubble-${role}`}>
        <div 
          className="chat-markdown"
          dangerouslySetInnerHTML={{ __html: html }}
        />
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
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage; 