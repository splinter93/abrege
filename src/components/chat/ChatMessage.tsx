'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChatMessage as ChatMessageType, 
  isObservationMessage,
  isToolResultSuccess 
} from '@/types/chat';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import UserMessageText from './UserMessageText';
import ToolCallMessage from './ToolCallMessage';
import { openImageModal } from './ImageModal';
import BubbleButtons from './BubbleButtons';
import ReasoningDropdown from './ReasoningDropdown';
import StreamTimelineRenderer from './StreamTimelineRenderer';
import { useChatStore } from '@/store/useChatStore';
import { useStreamingPreferences } from '@/hooks/useStreamingPreferences';
import { simpleLogger as logger } from '@/utils/logger';
import './ReasoningDropdown.css';
import './ToolCallMessage.css';

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
  isStreaming?: boolean;
  animateContent?: boolean; // Nouveau prop pour contrôler l'animation
  messageIndex?: number; // Index du message dans le thread
  onEdit?: (messageId: string, content: string, index: number) => void; // Callback d'édition
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  className, 
  isStreaming = false,
  animateContent = false,
  messageIndex,
  onEdit
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  
  if (!message) {
    logger.warn('ChatMessage: message is undefined');
    return null;
  }
  
  const { role, content, reasoning } = message;

  // Masquer les observations internes et messages tool
  if (isObservationMessage(message)) return null;
  if (role === 'tool') return null;

  useEffect(() => {
    if (content) setDisplayedContent(content);
  }, [content]);

  const parseSuccessFromContent = (raw: string | null | undefined): boolean | undefined => {
    if (!raw) return undefined;
    try {
      const data = JSON.parse(raw);
      return isToolResultSuccess(data);
    } catch {
      // ignore non-JSON content
      return undefined;
    }
  };

  const getToolResultsForAssistant = () => {
    // Tool results sont maintenant toujours dans message.tool_results
    // (chargés atomiquement depuis chat_messages)
    if (role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
      return message.tool_results || [];
    }
    return message.tool_results;
  };


  // ✅ NOUVEAU: Si une streamTimeline existe, l'utiliser pour le rendu
  const hasStreamTimeline = role === 'assistant' && message.streamTimeline && message.streamTimeline.items.length > 0;

  // Cast pour accéder aux propriétés spécifiques du UserMessage
  const userMessage = role === 'user' ? message as import('@/types/chat').UserMessage : null;
  const hasAttachedImages = userMessage?.attachedImages && userMessage.attachedImages.length > 0;

  // Handler pour ouvrir la modal au double-clic
  const handleImageDoubleClick = (imageSrc: string, fileName?: string) => {
    openImageModal({
      src: imageSrc,
      fileName: fileName
    });
  };

  return (
    <div className={`chatgpt-message chatgpt-message-${role} ${className || ''}`}>
      <div className={`chatgpt-message-bubble chatgpt-message-bubble-${role}`}>
        {/* Images attachées (messages user uniquement) */}
        {hasAttachedImages && (
          <div className="chatgpt-message-images">
            {userMessage.attachedImages!.map((img, index) => (
              <img
                key={index}
                src={img.url}
                alt={img.fileName || `Image ${index + 1}`}
                className="chatgpt-message-image"
                loading="lazy"
                onDoubleClick={() => handleImageDoubleClick(img.url, img.fileName)}
                style={{ cursor: 'pointer' }}
                title="Double-cliquer pour agrandir"
              />
            ))}
          </div>
        )}


        {/* Reasoning dropdown - affiché AVANT le contenu */}
        {reasoning && (
          <ReasoningDropdown 
            reasoning={reasoning}
            className="chatgpt-message-reasoning"
          />
        )}

        {/* ✅ PRIORITÉ 1: Utiliser la timeline si disponible (capture l'ordre exact du stream) */}
        {hasStreamTimeline ? (
          <StreamTimelineRenderer timeline={message.streamTimeline!} />
        ) : (
          <>
            {/* FALLBACK: Rendu classique si pas de timeline */}
            
            {/* Contenu - texte avec liens pour user, markdown pour assistant */}
            {content && (
              <div className="chatgpt-message-content">
                {role === 'user' ? (
                  <UserMessageText content={content} />
                ) : (
                  <EnhancedMarkdownMessage content={content} />
                )}
              </div>
            )}

            {/* Tool calls - APRÈS le contenu pour respecter la chronologie */}
            {role === 'assistant' && message.tool_calls && message.tool_calls.length > 0 && (
              <ToolCallMessage
                toolCalls={message.tool_calls}
                toolResults={getToolResultsForAssistant() || []}
              />
            )}
          </>
        )}
        
        {/* Indicateur de chargement */}
        {isStreaming && !displayedContent && (
          <div className="chatgpt-message-loading">
            <div className="chatgpt-message-loading-dots">
              <div className="chatgpt-message-loading-dot"></div>
              <div className="chatgpt-message-loading-dot"></div>
              <div className="chatgpt-message-loading-dot"></div>
            </div>
            <span>En cours de traitement...</span>
          </div>
        )}
      </div>
      
      {/* Boutons d'action */}
      {content && (
        <div className="chatgpt-message-actions">
          <BubbleButtons
            content={content}
            messageId={message.id}
            messageIndex={messageIndex}
            onCopy={async () => {
              try {
                await navigator.clipboard.writeText(content);
                // Optionnel: feedback visuel
              } catch (err) {
                logger.error('Failed to copy text: ', err);
              }
            }}
            onVoice={() => logger.debug('Lecture vocale du message')}
            onEdit={onEdit}
            showVoiceButton={role === 'assistant'}
            showEditButton={role === 'user'}
            className={role === 'user' ? 'bubble-buttons-user' : ''}
          />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
