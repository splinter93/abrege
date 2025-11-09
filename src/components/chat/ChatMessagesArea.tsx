/**
 * Composant Zone des messages du chat
 * Extrait de ChatFullscreenV2.tsx (JSX lignes 1078-1219)
 * 
 * Contient:
 * - Empty state
 * - Loader infinite scroll
 * - Messages list avec AnimatePresence
 * - Typing indicator
 * - Streaming timeline
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage as ChatMessageType, Agent } from '@/types/chat';
import type { StreamTimelineItem } from '@/types/streamTimeline';
import ChatMessage from './ChatMessage';
import ChatEmptyState from './ChatEmptyState';
import MessageLoader from './MessageLoader';
import StreamTimelineRenderer from './StreamTimelineRenderer';
import AgentDeletedMessage from './AgentDeletedMessage';

/**
 * Props du composant
 */
export interface ChatMessagesAreaProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  isStreaming: boolean;
  isFading: boolean; // ✅ NOUVEAU: Pour transition fluide
  streamingTimeline: StreamTimelineItem[];
  streamStartTime: number;
  loading: boolean;
  shouldAnimateMessages: boolean;
  messagesVisible: boolean;
  displayedSessionId: string | null;
  currentSessionId: string | null;
  selectedAgent: Agent | null;
  agentNotFound: boolean; // ✅ Indicateur agent supprimé
  onEditMessage: (messageId: string, content: string, index: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
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
  isFading, // ✅ NOUVEAU
  streamingTimeline,
  streamStartTime,
  loading,
  shouldAnimateMessages,
  messagesVisible,
  displayedSessionId,
  currentSessionId,
  selectedAgent,
  agentNotFound,
  onEditMessage,
  containerRef,
  messagesEndRef
}) => {
  return (
    <div className="chatgpt-messages-container" ref={containerRef}>
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

        {/* Messages list */}
        <AnimatePresence mode="sync">
          {messages.map((message, index) => {
            // ✅ Clé unique garantie
            const fallbackKeyParts = [message.role, message.timestamp, index];
            if (message.role === 'tool' && 'tool_call_id' in message) {
              fallbackKeyParts.push(message.tool_call_id || 'unknown');
            }
            const fallbackKey = fallbackKeyParts.join('-');
            const messageKey = message.clientMessageId || message.id || fallbackKey;

            // ✅ Masquer le dernier message assistant si streaming OU timeline active
            // Évite doublon : streaming affiché via timeline, pas besoin du message DB
            const isLastAssistant = index === messages.length - 1 && message.role === 'assistant';
            const isBeingStreamed = isLastAssistant && (isStreaming || streamingTimeline.length > 0);

            if (isBeingStreamed) return null;

            // ✅ Détecter si c'est un message nouvellement chargé (infinite scroll)
            const isNewlyLoaded = '_isNewlyLoaded' in message && message._isNewlyLoaded;

            return (
              <motion.div
                key={messageKey}
                initial={isNewlyLoaded ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  duration: isNewlyLoaded ? 0.4 : 0.2,
                  ease: [0.16, 1, 0.3, 1]
                }}
              >
                <ChatMessage
                  message={message}
                  messageIndex={index}
                  onEdit={onEditMessage}
                  animateContent={false}
                  isStreaming={false}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Indicateur de saisie */}
        {loading && (!isStreaming || streamingTimeline.length === 0) && messages.length > 0 && (
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

        {/* PENDANT ET APRÈS LE STREAMING : StreamTimelineRenderer */}
        {/* ✅ Garde affiché tant que timeline non vide (pas de clignotement) */}
        {streamingTimeline.length > 0 && (
          <div className={`chatgpt-message chatgpt-message-assistant ${isFading ? 'streaming-fade-out' : ''}`}>
            <div className="chatgpt-message-bubble chatgpt-message-bubble-assistant">
              <StreamTimelineRenderer
                timeline={{
                  items: streamingTimeline
                    .filter((item): item is Extract<typeof item, { type: 'text' | 'tool_execution' }> => 
                      item.type !== 'tool_result'
                    ) // ✅ VIRER les tool_result avec type predicate
                    .map(item => {
                      if (item.type === 'text') {
                        return {
                          type: 'text' as const,
                          content: item.content || '',
                          timestamp: item.timestamp,
                          roundNumber: item.roundNumber
                        };
                      } else {
                        // item.type === 'tool_execution'
                        return {
                          type: 'tool_execution' as const,
                          toolCalls: item.toolCalls || [],
                          toolCount: item.toolCount || 0,
                          timestamp: item.timestamp,
                          roundNumber: item.roundNumber || 0
                        };
                      }
                    }),
                  startTime: streamStartTime,
                  endTime: Date.now()
                }}
                isActiveStreaming={isStreaming}
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

