'use client';
import React, { useState, useEffect } from 'react';
import { 
  ChatMessage as ChatMessageType, 
  isObservationMessage
} from '@/types/chat';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import UserMessageText from './UserMessageText';
import { openImageModal } from './ImageModal';
import BubbleButtons from './BubbleButtons';
import ReasoningDropdown from './ReasoningDropdown';
import StreamTimelineRenderer from './StreamTimelineRenderer';
import NotePreview from './NotePreview';
import { simpleLogger as logger } from '@/utils/logger';
import './ReasoningDropdown.css';

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
  isStreaming?: boolean;
  animateContent?: boolean; // Nouveau prop pour contrôler l'animation
  messageIndex?: number; // Index du message dans le thread
  onEdit?: (messageId: string, content: string, index: number) => void; // Callback d'édition
  onRegenerate?: (assistantMessageId: string) => void; // Régénérer la réponse (par id du message assistant)
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  className, 
  isStreaming = false,
  animateContent = false,
  messageIndex,
  onEdit,
  onRegenerate
}) => {
  const [displayedContent, setDisplayedContent] = useState('');

  const content = message?.content ?? '';
  const role = message?.role;

  // ✅ Hooks inconditionnels avant tout return conditionnel — règle des hooks React
  useEffect(() => {
    if (content) setDisplayedContent(content);
  }, [content]);

  if (!message) {
    logger.warn('ChatMessage: message is undefined');
    return null;
  }

  // Masquer les observations internes et messages tool
  if (isObservationMessage(message)) return null;
  if (role === 'tool') return null;

  // ✅ SUPPRIMÉ: parseSuccessFromContent et getToolResultsForAssistant
  // Plus utilisés car ToolCallMessage est remplacé par StreamTimelineRenderer


  // ✅ NOUVEAU: Si une streamTimeline existe, l'utiliser pour le rendu
  // Supporte à la fois camelCase (code) et snake_case (DB)
  const assistantMessage = role === 'assistant' ? message as import('@/types/chat').AssistantMessage : null;
  const timeline = assistantMessage?.streamTimeline || assistantMessage?.stream_timeline;
  const hasStreamTimeline = role === 'assistant' && timeline && timeline.items && timeline.items.length > 0;
  const reasoning = assistantMessage?.reasoning;
  
  // ✅ FIX DUPLICATION: Si une timeline existe, ignorer tool_calls pour éviter duplication
  // Les tool calls sont déjà dans la timeline et seront affichés via StreamTimelineRenderer
  const hasToolCalls = assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0;
  const shouldIgnoreToolCalls = hasStreamTimeline && hasToolCalls;
  
  // ✅ DEBUG: Logger la timeline ET le content pour comprendre le problème
  if (role === 'assistant') {
    logger.dev('[ChatMessage] 📊 Message assistant:', {
      messageId: assistantMessage?.id || 'unknown',
      hasTimeline: !!timeline,
      timelineItemsCount: timeline?.items?.length || 0,
      timelineItemTypes: timeline?.items?.map(i => i.type) || [],
      hasToolCalls,
      shouldIgnoreToolCalls,
      contentPreview: content?.substring(0, 200) || 'NO CONTENT',
      contentIncludes_Function: content?.includes('Function:') || false,
      contentIncludes_tool_result: content?.includes('tool_result') || false
    });
  }

  // Cast pour accéder aux propriétés spécifiques du UserMessage
  const userMessage = role === 'user' ? message as import('@/types/chat').UserMessage : null;
  const hasAttachedImages = userMessage?.attachedImages && userMessage.attachedImages.length > 0;
  const hasAttachedNotes = userMessage?.attachedNotes && userMessage.attachedNotes.length > 0;

  // Handler pour ouvrir la modal au double-clic
  const handleImageDoubleClick = (imageSrc: string, fileName?: string) => {
    openImageModal({
      src: imageSrc,
      fileName: fileName
    });
  };

  return (
    <div className={`chatgpt-message chatgpt-message-${role} ${className || ''}`}>
      {/* Images attachées (messages user uniquement) - au-dessus de la bulle */}
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

      <div className={`chatgpt-message-bubble chatgpt-message-bubble-${role}`}>
        {/* Notes attachées (messages user uniquement) */}
        {hasAttachedNotes && (
          <div className="chatgpt-message-notes">
            {userMessage.attachedNotes!.map((note) => (
              <NotePreview
                key={note.id}
                note={note}
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
          <StreamTimelineRenderer timeline={timeline!} />
        ) : (
          <>
            {/* Contenu - texte avec liens pour user, markdown pour assistant */}
            {content && (
              <div className="chatgpt-message-content">
                {role === 'user' ? (
                  <UserMessageText 
                    content={content}
                    mentions={userMessage?.mentions}
                    prompts={userMessage?.prompts}
                  />
                ) : (
                  <EnhancedMarkdownMessage content={content} />
                )}
              </div>
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
            onVoice={() => logger.dev('Lecture vocale du message')}
            onEdit={onEdit}
            onRegenerate={role === 'assistant' && message.id ? () => onRegenerate?.(message.id!) : undefined}
            showVoiceButton={role === 'assistant'}
            showEditButton={role === 'user'}
            showRegenerateButton={role === 'assistant'}
            className={role === 'user' ? 'bubble-buttons-user' : ''}
          />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
