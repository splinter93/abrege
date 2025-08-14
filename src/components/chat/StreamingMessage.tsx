'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import StreamingLineByLine from './StreamingLineByLine';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import BubbleButtons from './BubbleButtons';
import './StreamingLineByLine.css';

interface StreamingMessageProps {
  message: ChatMessageType;
  className?: string;
  lineDelay?: number; // Délai entre chaque ligne (ms)
  onComplete?: () => void;
  showBubbleButtons?: boolean;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  message,
  className = '',
  lineDelay = 600, // 600ms par défaut pour un bon équilibre
  onComplete,
  showBubbleButtons = true
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingComplete, setStreamingComplete] = useState(false);

  const { role, content, reasoning } = message;

  // Démarrer le streaming automatiquement pour les messages assistant
  useEffect(() => {
    if (role === 'assistant' && content && !isStreaming) {
      setIsStreaming(true);
    }
  }, [role, content, isStreaming]);

  const handleStreamingComplete = () => {
    setStreamingComplete(true);
    setIsStreaming(false);
    onComplete?.();
  };

  // Masquer les observations internes
  if (role === 'assistant' && (message as any).name === 'observation') {
    return null;
  }

  // Ne pas afficher les messages 'tool' en tant que bulle dédiée
  if (role === 'tool') {
    return null;
  }

  // Ajuster le délai selon la longueur du contenu
  const getAdjustedDelay = () => {
    if (!content) return lineDelay;
    
    const lineCount = content.split('\n').filter(l => l.trim()).length;
    const charCount = content.length;
    
    // Délai plus court pour les messages courts
    if (charCount < 200) return Math.max(300, lineDelay * 0.7);
    // Délai plus long pour les messages très longs
    if (charCount > 1000) return Math.min(1200, lineDelay * 1.3);
    
    return lineDelay;
  };

  return (
    <motion.div
      className={`chat-message chat-message-${role} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`chat-message-bubble chat-message-bubble-${role}`}>
        {/* Raisonnement (si présent) */}
        {reasoning && role === 'assistant' && (
          <div className="reasoning-message">
            <strong>🧠 Raisonnement :</strong>
            <div className="reasoning-content">{reasoning}</div>
          </div>
        )}

        {/* Tool calls - only for assistant messages */}
        {role === 'assistant' && message.tool_calls && message.tool_calls.length > 0 && (
          <div className="tool-calls-message">
            <div className="tool-calls-header">
              <strong>🔧 Outils utilisés :</strong>
            </div>
            {message.tool_calls.map((toolCall, index) => (
              <div key={toolCall.id || index} className="tool-call-item">
                <code>{toolCall.function?.name || 'unknown'}</code>
                {toolCall.function?.arguments && (
                  <div className="tool-arguments">
                    {toolCall.function.arguments}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contenu principal avec streaming */}
        {content && (
          <div className="chat-message-content">
            {role === 'assistant' && isStreaming ? (
              <StreamingLineByLine
                content={content}
                lineDelay={getAdjustedDelay()}
                onComplete={handleStreamingComplete}
                className="chat-streaming-content"
              />
            ) : (
              <div className="static-content">
                {/* Utiliser le composant markdown existant ou un rendu simple */}
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            )}
          </div>
        )}

        {/* Indicateur de frappe si en cours de streaming */}
        {isStreaming && !streamingComplete && (
          <div className="chat-typing-indicator">
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
          </div>
        )}
      </div>

      {/* Boutons d'action sous la bulle */}
      {showBubbleButtons && content && (
        <div className="chat-message-actions">
          <BubbleButtons
            content={content}
            messageId={message.id}
            onCopy={() => console.log('Message copié')}
            onEdit={role === 'user' ? () => console.log('Édition du message') : undefined}
            showEditButton={role === 'user'}
            className={role === 'user' ? 'bubble-buttons-user' : ''}
          />
        </div>
      )}
    </motion.div>
  );
};

export default StreamingMessage; 