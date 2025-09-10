'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage as ChatMessageType } from '@/types/chat';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import ToolCallMessage from './ToolCallMessage';
import BubbleButtons from './BubbleButtons';
import { useChatStore } from '@/store/useChatStore';
import { useStreamingPreferences } from '@/hooks/useStreamingPreferences';
import StreamingLineByLine from './StreamingLineByLine';

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
  
  // Hook pour les préférences de streaming
  const { preferences, getAdjustedDelay } = useStreamingPreferences();
  
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

  // ✅ MÉMOIRE: Animation du contenu avec cleanup garanti
  useEffect(() => {
    if (animateContent && content && role === 'assistant' && !preferences.enabled) {
      setIsAnimating(true);
      setDisplayedContent('');
      
      let currentIndex = 0;
      const speed = 80; // Plus rapide : 80 caractères/seconde
      let intervalId: NodeJS.Timeout | null = null;
      
      intervalId = setInterval(() => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          setIsAnimating(false);
        }
      }, 1000 / speed);

      // ✅ MÉMOIRE: Cleanup garanti
      return () => {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        setIsAnimating(false);
      };
    } else if (content && !preferences.enabled) {
      setDisplayedContent(content);
    }
  }, [content, animateContent, role, preferences.enabled]);

  // Gestion du streaming ligne par ligne
  const handleStreamingComplete = () => {
    setIsStreamingComplete(true);
  };

  // Déterminer si le streaming doit être utilisé
  const shouldUseStreaming = preferences.enabled && role === 'assistant' && content && !isStreamingComplete;
  const wordDelay = getAdjustedDelay(content || '');

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
    <motion.div 
      className={`chat-message chat-message-${role} ${className || ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`chat-message-bubble chat-message-bubble-${role}`}>
        {/* 🧠 Raisonnement affiché EN PREMIER pour les messages assistant */}
        {reasoning && role === 'assistant' && (
          <div className="reasoning-content">
            <pre>{reasoning}</pre>
          </div>
        )}

        {/* Tool calls - only for assistant messages to avoid duplicates */}
        {role === 'assistant' && message.tool_calls && message.tool_calls.length > 0 && (
          <ToolCallMessage
            toolCalls={message.tool_calls}
            toolResults={getToolResultsForAssistant() || []}
          />
        )}

        {/* Contenu markdown avec streaming ligne par ligne ou animation optionnelle - affiché APRÈS le reasoning */}
        {content && (
          <div className="chat-message-content">
            {shouldUseStreaming ? (
              <StreamingLineByLine
                content={content}
                wordDelay={wordDelay}
                onComplete={handleStreamingComplete}
                className="chat-streaming-content"
              />
            ) : (
              <EnhancedMarkdownMessage content={content} />
            )}
            
            {/* Curseur de frappe pour l'animation caractère par caractère (seulement si streaming désactivé) */}
            {isAnimating && !shouldUseStreaming && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="typing-cursor"
                style={{ 
                  display: 'inline-block',
                  marginLeft: '2px',
                  fontWeight: 'bold',
                  color: 'var(--accent-primary)'
                }}
              >
                |
              </motion.span>
            )}
          </div>
        )}
        
        {/* Indicateur de frappe pour le streaming */}
        {isStreaming && !displayedContent && (
          <div className="chat-typing-indicator">
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
            <div className="chat-typing-dot"></div>
          </div>
        )}
      </div>
      
                    {/* Boutons d'action sous la bulle (comme ChatGPT) */}
      {content && (
        <BubbleButtons
          content={content}
          messageId={message.id}
          onCopy={() => console.log('Message copié')}
          onEdit={() => console.log('Édition du message')}
          className={role === 'user' ? 'bubble-buttons-user' : ''}
        />
      )}
    </motion.div>
  );
};

export default ChatMessage;
