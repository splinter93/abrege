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
import { Minimize2 } from 'lucide-react';
import './ReasoningDropdown.css';

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
  isStreaming?: boolean;
  animateContent?: boolean; // eslint-disable-line @typescript-eslint/no-unused-vars -- réservé pour usage futur
  messageIndex?: number;
  onEdit?: (messageId: string, content: string, index: number) => void;
  onRegenerate?: (assistantMessageId: string) => void;
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

  // Dériver role et content avant tout hook pour respecter les Rules of Hooks
  const role = message?.role;
  const content = message?.content ?? '';
  const messageId = message?.id;

  const [isExpanded, setIsExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const userContentRef = useRef<HTMLDivElement>(null);

  // Détecte si le message user dépasse vraiment 5 lignes (évite faux positifs line-clamp)
  // Guard interne : no-op si message absent ou rôle non-user
  useEffect(() => {
    if (role !== 'user' || !userContentRef.current) return;
    const el = userContentRef.current;
    const lineHeight = parseInt(getComputedStyle(el).lineHeight, 10) || 20;
    const overflow = el.scrollHeight - el.clientHeight;
    setNeedsTruncation(overflow > lineHeight * 0.5);
  }, [content, role]);

  if (!message) {
    logger.warn('ChatMessage: message is undefined');
    return null;
  }

  // Masquer les observations internes et messages tool
  if (isObservationMessage(message)) return null;
  if (role === 'tool') return null;

  // Supporte à la fois camelCase (code) et snake_case (DB)
  const assistantMessage = role === 'assistant' ? message as import('@/types/chat').AssistantMessage : null;
  const timeline = assistantMessage?.streamTimeline || assistantMessage?.stream_timeline;
  // Si une timeline existe, StreamTimelineRenderer l'affiche (tool calls inclus) — pas de duplication
  const hasStreamTimeline = role === 'assistant' && timeline && timeline.items && timeline.items.length > 0;
  const reasoning = assistantMessage?.reasoning;

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

  const assistantStreaming = role === 'assistant' && Boolean(assistantMessage?.isStreaming);
  const showAssistantLoadingDots =
    assistantStreaming && !hasStreamTimeline && !content.trim();

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


        {/* Reasoning : toujours dans le flux quand présent — invisible pendant le stream pour réserver la hauteur
            (évite saut quand le reasoning arrive en fin de stream). */}
        {reasoning && (
          <div
            className="chatgpt-message-reasoning-slot"
            style={
              role === 'assistant' && assistantMessage?.isStreaming
                ? { visibility: 'hidden', pointerEvents: 'none' }
                : undefined
            }
            aria-hidden={role === 'assistant' && Boolean(assistantMessage?.isStreaming)}
          >
            <ReasoningDropdown
              reasoning={reasoning}
              className="chatgpt-message-reasoning"
            />
          </div>
        )}

        {role === 'assistant' ? (
          /* Un seul bloc ancré : évite saut quand loading → timeline (ancre absente puis présente) */
          <div
            data-chat-stream-anchor=""
            className={`chatgpt-assistant-anchor${assistantStreaming ? ' chatgpt-assistant-anchor--streaming' : ''}`}
          >
            {hasStreamTimeline ? (
              <StreamTimelineRenderer
                timeline={timeline!}
                isActiveStreaming={Boolean(assistantMessage?.isStreaming)}
              />
            ) : content ? (
              <div className="chatgpt-message-content">
                <EnhancedMarkdownMessage content={content} />
              </div>
            ) : null}
            {showAssistantLoadingDots ? (
              <div className="chatgpt-message-loading" role="status" aria-label="Chargement en cours">
                <div className="chatgpt-message-loading-dots">
                  <div className="chatgpt-message-loading-dot"></div>
                  <div className="chatgpt-message-loading-dot"></div>
                  <div className="chatgpt-message-loading-dot"></div>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {content ? (
              <div className="chatgpt-message-content">
                <div className="user-message-expandable">
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
                </div>
              </div>
            ) : null}
            {isStreaming && !content ? (
              <div className="chatgpt-message-loading" role="status" aria-label="Chargement en cours">
                <div className="chatgpt-message-loading-dots">
                  <div className="chatgpt-message-loading-dot"></div>
                  <div className="chatgpt-message-loading-dot"></div>
                  <div className="chatgpt-message-loading-dot"></div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
      
      {/* Boutons d'action — toujours rendus quand content existe pour éviter tout layout-shift.
          Invisibles pendant le streaming pour ne pas polluer l'UX, mais la hauteur est préservée. */}
      {content && (
        <div
          className="chatgpt-message-actions"
          style={role === 'assistant' && assistantMessage?.isStreaming
            ? { visibility: 'hidden', pointerEvents: 'none' }
            : undefined}
        >
          <BubbleButtons
            content={content}
            messageId={messageId}
            messageIndex={messageIndex}
            prependAction={role === 'user' && needsTruncation ? (
              <button
                className={`bubble-button user-message-expand-btn${isExpanded ? ' user-message-expand-btn--open' : ''}`}
                onClick={() => setIsExpanded(v => !v)}
                aria-label={isExpanded ? 'Réduire le message' : 'Afficher tout le message'}
                type="button"
              >
                <Minimize2 size={14} aria-hidden />
              </button>
            ) : undefined}
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
