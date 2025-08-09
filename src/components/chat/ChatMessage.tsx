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

  // Pour les messages tool (résultats d'outils), créer un faux tool call pour l'affichage
  const getToolCallForToolMessage = () => {
    if (role === 'tool' && message.tool_call_id && message.name) {
      return [{
        id: message.tool_call_id,
        type: 'function' as const,
        function: {
          name: message.name,
          arguments: '{}'
        }
      }];
    }
    return message.tool_calls;
  };

  const getToolResultsForToolMessage = () => {
    if (role === 'tool' && message.tool_call_id && message.name && content) {
      return [{
        tool_call_id: message.tool_call_id,
        name: message.name,
        content: content,
        success: true // Par défaut, on considère que c'est un succès
      }];
    }
    return message.tool_results;
  };

  // Pour les messages assistant avec tool_calls, créer les tool_results
  const getToolResultsForAssistant = () => {
    if (role === 'assistant' && message.tool_calls && message.tool_calls.length > 0) {
      // Chercher les messages tool correspondants dans le thread
      const currentSession = useChatStore.getState().currentSession;
      if (currentSession) {
        return currentSession.thread
          .filter(msg => msg.role === 'tool' && message.tool_calls?.some(tc => tc.id === msg.tool_call_id))
          .map(msg => ({
            tool_call_id: msg.tool_call_id!,
            name: msg.name!,
            content: msg.content!,
            success: true // Par défaut
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

        {/* Contenu markdown normal (pas pour les messages tool) */}
        {content && role !== 'tool' && (
          <EnhancedMarkdownMessage content={content} />
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
