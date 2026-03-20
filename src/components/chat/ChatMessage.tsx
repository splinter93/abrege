'use client';
import React, { useState, useRef, useEffect } from 'react';
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
import { useTextToSpeechContextOptional } from '@/contexts/TextToSpeechContext';
import { stripMarkdownForTTS } from '@/utils/stripMarkdownForTTS';
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
  animateContent = false, // eslint-disable-line @typescript-eslint/no-unused-vars -- réservé pour usage futur
  messageIndex,
  onEdit,
  onRegenerate
}) => {
  const tts = useTextToSpeechContextOptional();
  const content = message?.content ?? '';
  const messageId = message?.id;
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const userContentRef = useRef<HTMLDivElement>(null);

  if (!message) {
    logger.warn('ChatMessage: message is undefined');
    return null;
  }

  // ✅ Déstructuration après le guard — message est garanti non-null ici
  const { role } = message;

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

  const handleVoice = tts
    ? () => {
        const plain = stripMarkdownForTTS(content);
        if (plain) tts.speak(plain, { messageId });
      }
    : () => logger.dev('Lecture vocale du message');
  const isVoicePlaying = tts?.isPlayingMessageId === messageId;

  // Détecte si le message user dépasse 5 lignes (après rendu)
  useEffect(() => {
    if (role !== 'user' || !userContentRef.current) return;
    const el = userContentRef.current;
    setNeedsTruncation(el.scrollHeight > el.clientHeight + 2);
  }, [content, role]);

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
          <StreamTimelineRenderer timeline={timeline!} isActiveStreaming={Boolean(assistantMessage?.isStreaming)} />
        ) : (
          <>
            {/* Contenu - texte avec liens pour user, markdown pour assistant */}
            {content && (
              <div className="chatgpt-message-content">
                {role === 'user' ? (
                  <div
                    className={`user-message-expandable${isExpanded ? ' user-message-expandable--open' : ''}`}
                  >
                    <div
                      ref={userContentRef}
                      className={`user-message-expandable__content${!isExpanded ? ' user-message-expandable__content--clamped' : ''}`}
                    >
                      <UserMessageText 
                        content={content}
                        mentions={userMessage?.mentions}
                        prompts={userMessage?.prompts}
                      />
                    </div>
                    {needsTruncation && (
                      <button
                        className={`user-message-expand-btn${isExpanded ? ' user-message-expand-btn--open' : ''}`}
                        onClick={() => setIsExpanded(v => !v)}
                        aria-label={isExpanded ? 'Réduire le message' : 'Afficher tout le message'}
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <path d="M2.5 5L7 9.5L11.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <EnhancedMarkdownMessage content={content} />
                )}              </div>
            )}
          </>
        )}
        
        {/* Indicateur de chargement */}
        {isStreaming && !content && (
          <div className="chatgpt-message-loading" role="status" aria-label="Chargement en cours">
            <div className="chatgpt-message-loading-dots">
              <div className="chatgpt-message-loading-dot"></div>
              <div className="chatgpt-message-loading-dot"></div>
              <div className="chatgpt-message-loading-dot"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Boutons d'action */}
      {content && !(role === 'assistant' && assistantMessage?.isStreaming) && (
        <div className="chatgpt-message-actions">
          <BubbleButtons
            content={content}
            messageId={messageId}
            messageIndex={messageIndex}
            onCopy={async () => {
              try {
                await navigator.clipboard.writeText(content);
                // Optionnel: feedback visuel
              } catch (err) {
                logger.error('Failed to copy text: ', err);
              }
            }}
            onVoice={handleVoice}
            isVoicePlaying={isVoicePlaying}
            onEdit={onEdit}
            onRegenerate={role === 'assistant' && messageId ? () => onRegenerate?.(messageId) : undefined}
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
