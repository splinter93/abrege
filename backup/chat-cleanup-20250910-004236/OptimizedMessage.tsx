'use client';
import React from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';

/**
 * Version optimisée du composant ChatMessage
 * Évite les re-renders inutiles pendant le streaming
 */
const OptimizedMessage = React.memo(({ message, className }: { message: ChatMessageType; className?: string }) => {
  return (
    <div className={`optimized-message ${className || ''}`}>
      {message.content}
    </div>
  );
});

OptimizedMessage.displayName = 'OptimizedMessage';

export default OptimizedMessage;
