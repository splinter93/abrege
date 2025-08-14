'use client';
import React, { useState, useEffect, memo } from 'react';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import ReasoningMessage from './ReasoningMessage';
import ToolCallMessage from './ToolCallMessage';
import MessageContainer from './MessageContainer';
import { useChatStore } from '@/store/useChatStore';
import { usePropsValidation, ChatMessageOptimizedPropsSchema } from './validators';

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
  animateContent?: boolean;
  isWaitingForResponse?: boolean;
}

/**
 * Composant ChatMessage optimisé avec React.memo
 * Évite les re-renders inutiles et améliore les performances
 */
const ChatMessageOptimized: React.FC<ChatMessageProps> = memo(({
  message,
  className,
  animateContent = false,
  isWaitingForResponse = false
}) => {
  // Validation des props en développement
  const validatedProps = usePropsValidation(
    ChatMessageOptimizedPropsSchema,
    { message, className, animateContent },
    'ChatMessageOptimized'
  );
  
  // Tous les hooks doivent être appelés au début, avant tout return conditionnel
  const [displayedContent, setDisplayedContent] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Vérification de sécurité
  if (!validatedProps.message) {
    console.warn('ChatMessage: message is undefined');
    return null;
  }
  
  const { role, content, reasoning } = validatedProps.message;

  // Masquer les observations internes de l'assistant
  if (role === 'assistant' && (validatedProps.message as any).name === 'observation') {
    return null;
  }

  // Ne pas afficher les messages 'tool' en tant que bulle dédiée
  if (role === 'tool') {
    return null;
  }
  
  // Fonction optimisée pour parser le succès
  const parseSuccessFromContent = React.useCallback((raw: string | null | undefined): boolean | undefined => {
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
  }, []);

  // Récupération optimisée des tool results
  const getToolResultsForAssistant = React.useCallback(() => {
    if (role === 'assistant' && validatedProps.message.tool_calls && validatedProps.message.tool_calls.length > 0) {
      // Utiliser d'abord les results attachés au message si présents
      if (validatedProps.message.tool_results && validatedProps.message.tool_results.length > 0) {
        return validatedProps.message.tool_results;
      }
      
      // Fallback: chercher les tool messages correspondants dans le thread courant
      const currentSession = useChatStore.getState().currentSession;
      if (currentSession) {
        return currentSession.thread
          .filter(msg => msg.role === 'tool' && validatedProps.message.tool_calls?.some(tc => tc.id === msg.tool_call_id))
          .map(msg => ({
            tool_call_id: msg.tool_call_id!,
            name: (msg as any).name || (msg as any).tool_name || 'unknown',
            content: msg.content || '',
            success: parseSuccessFromContent(msg.content)
          }));
      }
    }
    return [];
  }, [role, validatedProps.message.tool_calls, validatedProps.message.tool_results, parseSuccessFromContent]);

  // Animation du contenu optimisée
  useEffect(() => {
    if (animateContent && content && role === 'assistant') {
      setIsAnimating(true);
      setDisplayedContent('');
      
      let currentIndex = 0;
      const speed = 80; // 80 caractères/seconde pour une animation fluide
      
      const interval = setInterval(() => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsAnimating(false);
        }
      }, 1000 / speed);

      return () => clearInterval(interval);
    } else if (content) {
      setDisplayedContent(content);
    }
  }, [content, animateContent, role]);

  // Déterminer le contenu à afficher
  const contentToDisplay = isAnimating ? displayedContent : content;
  const toolResults = getToolResultsForAssistant();

    // Rendu conditionnel optimisé
  if (role === 'assistant' && validatedProps.message.tool_calls && validatedProps.message.tool_calls.length > 0) {
    return (
      <MessageContainer
        message={validatedProps.message}
        role={role as 'user' | 'assistant'}
        className={`tool-calls-message ${className || ''}`}
      >
        <div className={`chat-message-bubble chat-message-bubble-${role}`}>
          <div className="message-content">
            <ToolCallMessage 
              toolCalls={validatedProps.message.tool_calls}
              toolResults={toolResults}
            />
          </div>
          
          {reasoning && (
            <ReasoningMessage reasoning={reasoning} />
          )}
        </div>
      </MessageContainer>
    );
  }

  // Message normal
  return (
    <MessageContainer
      message={validatedProps.message}
      role={role as 'user' | 'assistant'}
      className={validatedProps.className || ''}
    >
      <div className={`chat-message-bubble chat-message-bubble-${role}`}>
        <div className="message-content">
          {contentToDisplay ? (
            <EnhancedMarkdownMessage 
              content={contentToDisplay}
            />
          ) : (
            <div className="no-content">Aucun contenu</div>
          )}
        </div>
        
        {reasoning && role === 'assistant' && (
          <ReasoningMessage reasoning={reasoning} />
        )}
        
        {/* Indicateur de frappe quand on attend une réponse */}
        {isWaitingForResponse && role === 'assistant' && !contentToDisplay && (
          <div className="chat-typing-indicator">
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
          </div>
        )}
      </div>
    </MessageContainer>
  );
});

// Ajouter un displayName pour le debugging
ChatMessageOptimized.displayName = 'ChatMessageOptimized';

export default ChatMessageOptimized; 