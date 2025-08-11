'use client';
import React from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import ReasoningMessage from './ReasoningMessage';
import ToolCallMessage from './ToolCallMessage';
import { useChatStore } from '@/store/useChatStore';

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
  isStreaming?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, className, isStreaming = false }) => {
  // Vérification de sécurité
  if (!message) {
    console.warn('ChatMessage: message is undefined');
    return null;
  }
  
  const { role, content, reasoning } = message;

  // Masquer les observations internes de l'assistant
  if (role === 'assistant' && (message as any).name === 'observation') {
    return null;
  }
  // Ne pas afficher les messages 'tool' en tant que bulle dédiée
  if (role === 'tool') {
    return null;
  }

  const parseSuccessFromContent = (raw: string | null | undefined): boolean | undefined => {
    if (!raw) return undefined;
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if ('success' in data) {
          return Boolean((data as any).success);
        }
        if ('error' in data && (data as any).error) {
          return false;
        }
      }
    } catch {
      // ignore non-JSON content
    }
    return undefined;
  };

  // Pour les messages assistant avec tool_calls, utiliser tool_results directement
  const getToolResultsForAssistant = () => {
    if (role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
      // Utiliser d'abord les results attachés au message si présents
      if (message.tool_results && message.tool_results.length > 0) {
        return message.tool_results;
      }
      // Fallback: chercher les tool messages correspondants dans le thread courant
      const currentSession = useChatStore.getState().currentSession;
      if (currentSession) {
        return currentSession.thread
          .filter(msg => msg.role === 'tool' && message.tool_calls?.some(tc => tc.id === msg.tool_call_id))
          .map(msg => ({
            tool_call_id: msg.tool_call_id!,
            name: msg.name!,
            content: msg.content!,
            success: parseSuccessFromContent(msg.content!)
          }));
      }
    }
    return message.tool_results;
  };


  return (
    <div className={`chat-message chat-message-${role} ${className || ''}`}>
      <div className={`chat-message-bubble chat-message-bubble-${role}`}>
        {/* Raisonnement (si présent) */}
        {reasoning && (
          <ReasoningMessage reasoning={reasoning} />
        )}

        {/* Tool calls - only for assistant messages to avoid duplicates */}
        {role === 'assistant' && message.tool_calls && message.tool_calls.length > 0 && (
          <ToolCallMessage
            toolCalls={message.tool_calls}
            toolResults={getToolResultsForAssistant() || []}
          />
        )}

        {/* Contenu markdown normal */}
        {content && (
          <EnhancedMarkdownMessage content={content || ''} />
        )}
        
        {/* Indicateur de frappe */}
        {isStreaming && (
          <div className="chat-typing-indicator">
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
          </div>
        )}
      </div>
    </div>
  );
};

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
