import React from 'react';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import { type ChatMessage } from '@/store/useChatStore';

interface OptimizedMessageProps {
  message: ChatMessage;
  index: number;
}

/**
 * Composant optimisé pour les messages avec React.memo
 * Évite les re-renders inutiles pendant le streaming
 */
const OptimizedMessage = React.memo<OptimizedMessageProps>(({ message, index }) => {
  return (
    <div 
      className={`chat-message chat-message-${message.role}`}
      role="article"
      aria-label={`Message ${message.role === 'user' ? 'utilisateur' : 'assistant'}`}
    >
      <div className={`chat-message-bubble chat-message-bubble-${message.role}`}>
        {message.role === 'assistant' ? (
          <EnhancedMarkdownMessage content={message.content} />
        ) : (
          message.content
        )}
      </div>
    </div>
  );
});

OptimizedMessage.displayName = 'OptimizedMessage';

export default OptimizedMessage; 