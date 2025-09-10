'use client';
import React from 'react';
import { motion } from 'framer-motion';
import BubbleButtons from './BubbleButtons';
import { ChatMessage as ChatMessageType } from '@/types/chat';

interface MessageContainerProps {
  message: ChatMessageType;
  children: React.ReactNode;
  className?: string;
  role: 'user' | 'assistant';
}

const MessageContainer: React.FC<MessageContainerProps> = ({
  message,
  children,
  className = '',
  role
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`chat-message-container chat-message-container-${role} ${className}`}
    >
      {/* Container principal qui englobe tout */}
      <div className="chat-message-content-wrapper">
        {/* La bulle de message */}
        <div className="chat-message-bubble-wrapper">
          {children}
        </div>
        
        {/* Boutons d'action sous la bulle */}
        {message.content && (
          <div className="chat-message-actions-wrapper">
            <BubbleButtons
              content={message.content}
              messageId={message.id}
              onCopy={() => console.log('Message copié')}
              onEdit={role === 'user' ? () => console.log('Édition du message') : undefined}
              showEditButton={role === 'user'}
              className={role === 'user' ? 'bubble-buttons-user' : ''}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageContainer; 