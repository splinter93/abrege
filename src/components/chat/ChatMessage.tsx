'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import ToolCallMessage from './ToolCallMessage';
import BubbleButtons from './BubbleButtons';
import ReasoningDropdown from './ReasoningDropdown';
import { useChatStore } from '@/store/useChatStore';
import { useStreamingPreferences } from '@/hooks/useStreamingPreferences';
// import StreamingLineByLine from './StreamingLineByLine'; // Supprimé - faux streaming
import './ReasoningDropdown.css';
import './ToolCallMessage.css';

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
  isStreaming?: boolean;
  animateContent?: boolean; // Nouveau prop pour contrôler l'animation
  isWaitingForResponse?: boolean; // ✅ Ajout de la prop manquante
}

const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  className, 
  isStreaming = false,
  animateContent = false 
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [isStreamingComplete, setIsStreamingComplete] = useState(false);
  
  // Hook pour les préférences de streaming - SUPPRIMÉ (faux streaming)
  // const { preferences, getAdjustedDelay } = useStreamingPreferences();
  
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

  // ✅ SUPPRIMÉ: Animation du contenu (faux streaming)
  // Le vrai streaming est géré par useChatStreaming et les canaux Supabase
  useEffect(() => {
    if (content) {
      setDisplayedContent(content);
    }
  }, [content]);

  // ✅ SUPPRIMÉ: Gestion du faux streaming
  // Le vrai streaming est géré par useChatStreaming et les canaux Supabase

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
    <div className={`chatgpt-message chatgpt-message-${role} ${className || ''}`}>
      <div className={`chatgpt-message-bubble chatgpt-message-bubble-${role}`}>
        {/* Tool calls - only for assistant messages to avoid duplicates */}
        {role === 'assistant' && message.tool_calls && message.tool_calls.length > 0 && (
          <ToolCallMessage
            toolCalls={message.tool_calls}
            toolResults={getToolResultsForAssistant() || []}
          />
        )}

        {/* Reasoning dropdown - affiché AVANT le contenu */}
        {reasoning && (
          <ReasoningDropdown 
            reasoning={reasoning}
            className="chatgpt-message-reasoning"
          />
        )}

        {/* Contenu markdown - affiché APRÈS le reasoning */}
        {content && (
          <div className="chatgpt-message-content">
            <EnhancedMarkdownMessage content={content} />
          </div>
        )}
        
        {/* Indicateur de frappe pour le vrai streaming */}
        {isStreaming && !displayedContent && (
          <div className="chatgpt-message-loading">
            <div className="chatgpt-message-loading-dots">
              <div className="chatgpt-message-loading-dot"></div>
              <div className="chatgpt-message-loading-dot"></div>
              <div className="chatgpt-message-loading-dot"></div>
            </div>
            <span>En cours de frappe...</span>
          </div>
        )}
      </div>
      
      {/* Boutons d'action sous la bulle (comme ChatGPT) - UNIQUEMENT */}
      {content && (
        <div className="chatgpt-message-actions">
          <BubbleButtons
            content={content}
            messageId={message.id}
            onCopy={async () => {
              try {
                await navigator.clipboard.writeText(content);
                // Optionnel: feedback visuel
              } catch (err) {
                console.error('Failed to copy text: ', err);
              }
            }}
            onEdit={() => console.log('Édition du message')}
            className={role === 'user' ? 'bubble-buttons-user' : ''}
          />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
