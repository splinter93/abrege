/**
 * Composant Zone des messages du chat
 * Extrait de ChatFullscreenV2.tsx (JSX lignes 1078-1219)
 * 
 * Contient:
 * - Empty state
 * - Loader infinite scroll
 * - Liste messages sans AnimatePresence (évite flash doublon à la sortie d’élément)
 * - Typing indicator
 * - Streaming timeline
 */

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ChatMessage as ChatMessageType, Agent } from '@/types/chat';
import type { StreamErrorDetails } from '@/services/streaming/StreamOrchestrator';
import ChatMessage from './ChatMessage';
import ChatEmptyState from './ChatEmptyState';
import MessageLoader from './MessageLoader';
import AgentDeletedMessage from './AgentDeletedMessage';
import { StreamErrorDisplay } from './StreamErrorDisplay';

/**
 * Props du composant
 */
export interface ChatMessagesAreaProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  isStreaming: boolean;
  loading: boolean;
  shouldAnimateMessages: boolean;
  messagesVisible: boolean;
  displayedSessionId: string | null;
  currentSessionId: string | null;
  selectedAgent: Agent | null;
  agentNotFound: boolean; // ✅ Indicateur agent supprimé
  streamError?: StreamErrorDetails | null; // ✅ NOUVEAU: Erreur de streaming
  onRetryMessage?: () => void; // ✅ NOUVEAU: Callback retry
  onDismissError?: () => void; // ✅ NOUVEAU: Callback dismiss erreur
  onEditMessage: (messageId: string, content: string, index: number) => void;
  onRegenerateResponse?: (assistantMessageId: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  keyboardInset?: number;
}

/** Clé stable : operation_id d’abord (bulle optimiste + DB alignées), évite remount / exit flash */
function getChatMessageReactKey(message: ChatMessageType, index: number): string {
  if (message.operation_id) {
    return `op:${message.operation_id}`;
  }
  if (message.clientMessageId) {
    return `c:${message.clientMessageId}`;
  }
  if (message.id) {
    return `i:${message.id}`;
  }
  return `x:${message.role}:${index}:${String(message.timestamp ?? '')}`;
}

/**
 * Zone d'affichage des messages
 * Gère l'affichage des messages, le streaming, les animations
 */
const ChatMessagesArea: React.FC<ChatMessagesAreaProps> = ({
  messages,
  isLoading,
  isLoadingMore,
  hasMore,
  isStreaming,
  loading,
  shouldAnimateMessages,
  messagesVisible,
  displayedSessionId,
  currentSessionId,
  selectedAgent,
  agentNotFound,
  streamError, // ✅ NOUVEAU
  onRetryMessage, // ✅ NOUVEAU
  onDismissError, // ✅ NOUVEAU
  onEditMessage,
  onRegenerateResponse,
  containerRef,
  messagesEndRef,
  keyboardInset = 0
}) => {
  // ✅ OPTIMISATION : Virtualisation si > 100 messages (conforme GUIDE-EXCELLENCE-CODE.md)
  const shouldVirtualize = messages.length > 100;
  const virtualizerRef = useRef<HTMLDivElement>(null);
  const hasStreamingAssistant = messages.some(
    (message) => message.role === 'assistant' && Boolean(message.isStreaming)
  );
  
  // Toujours appeler useVirtualizer (Rules of Hooks) — count: 0 si pas de virtualisation
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? messages.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 120, // Hauteur estimée par message
    overscan: 5
  });

  return (
    <div
      className="chatgpt-messages-container"
      ref={containerRef}
    >
      <div
        className={`chatgpt-messages ${shouldAnimateMessages ? 'messages-fade-in' : ''}`}
        style={{
          opacity: messagesVisible || messages.length === 0 ? undefined : 0
        }}
      >
        {/* Empty state - Agent sélectionné mais pas de messages */}
        {!isLoading && 
         messages.length === 0 && 
         selectedAgent && 
         messagesVisible && (
          <ChatEmptyState agent={selectedAgent} />
        )}

        {/* Loader pour infinite scroll */}
        {isLoadingMore && hasMore && (
          <MessageLoader isLoadingMore />
        )}

        {/* Messages list - Virtualisée si > 100 messages */}
        {shouldVirtualize ? (
          <div
            ref={virtualizerRef}
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const message = messages[virtualItem.index];
              const index = virtualItem.index;
              
              const messageKey = getChatMessageReactKey(message, index);

              return (
                <div
                  key={messageKey}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`
                  }}
                >
                  <ChatMessage
                    message={message}
                    messageIndex={index}
                    onEdit={onEditMessage}
                    onRegenerate={onRegenerateResponse}
                    animateContent={false}
                    isStreaming={message.role === 'assistant' && Boolean(message.isStreaming)}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="chatgpt-messages-static-list">
            {messages.map((message, index) => {
            const messageKey = getChatMessageReactKey(message, index);
            const isNewlyLoaded = '_isNewlyLoaded' in message && message._isNewlyLoaded;

            return (
              <div
                key={messageKey}
                className={isNewlyLoaded ? 'chatgpt-message-row chatgpt-message-row--enter' : 'chatgpt-message-row'}
              >
                <ChatMessage
                  message={message}
                  messageIndex={index}
                  onEdit={onEditMessage}
                  onRegenerate={onRegenerateResponse}
                  animateContent={false}
                  isStreaming={message.role === 'assistant' && Boolean(message.isStreaming)}
                />
              </div>
            );
          })}
          </div>
        )}

        {/* Indicateur de saisie */}
        {loading && !hasStreamingAssistant && messages.length > 0 && (
          <div className="chatgpt-message chatgpt-message-assistant">
            <div className="chatgpt-message-bubble chatgpt-message-bubble-assistant">
              <div className="chatgpt-message-content">
                <div className="chat-typing-indicator">
                  <div className="chat-typing-dot"></div>
                  <div className="chat-typing-dot"></div>
                  <div className="chat-typing-dot"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ ERREUR DE STREAMING */}
        {streamError && (
          <div className="chatgpt-message chatgpt-message-assistant" style={{ width: '100%', maxWidth: '100%' }}>
            <div className="chatgpt-message-bubble chatgpt-message-bubble-assistant" style={{ background: 'transparent', border: 'none', padding: 0, width: '100%', maxWidth: '100%' }}>
              <StreamErrorDisplay
                error={streamError}
                onRetry={onRetryMessage}
                onDismiss={onDismissError}
              />
            </div>
          </div>
        )}

        {/* Message agent supprimé - Affiché sous le dernier message si agent introuvable */}
        {agentNotFound && messages.length > 0 && !isStreaming && (
          <AgentDeletedMessage />
        )}
      </div>

      {/* Anchor pour scroll */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessagesArea;

