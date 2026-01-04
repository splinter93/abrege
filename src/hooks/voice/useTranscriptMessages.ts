/**
 * Hook pour gérer les messages de transcription (user/assistant)
 * Extrait de XAIVoiceChat.tsx pour réduire la taille du composant
 */

import { useState, useRef, useCallback } from 'react';

/**
 * Message de transcription
 */
export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

/**
 * Return type du hook useTranscriptMessages
 */
export interface UseTranscriptMessagesReturn {
  /**
   * Messages de transcription (user + assistant)
   */
  messages: TranscriptMessage[];
  
  /**
   * Ajouter un message user (transcription complète)
   */
  addUserMessage: (text: string) => void;
  
  /**
   * Mettre à jour le dernier message assistant (streaming delta)
   */
  updateAssistantMessage: (delta: string) => void;
  
  /**
   * Réinitialiser tous les messages
   */
  reset: () => void;
}

/**
 * Hook pour gérer les messages de transcription
 * 
 * Gère l'état des messages user/assistant avec support du streaming pour l'assistant
 */
export function useTranscriptMessages(): UseTranscriptMessagesReturn {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const currentAssistantMessageRef = useRef<string>('');

  /**
   * Ajouter un message user (transcription complète reçue)
   */
  const addUserMessage = useCallback((text: string) => {
    currentAssistantMessageRef.current = ''; // Reset pour le prochain message assistant
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages.push({
        id: `user-${Date.now()}`,
        role: 'user',
        text: text
      });
      return newMessages;
    });
  }, []);

  /**
   * Mettre à jour le dernier message assistant (streaming delta)
   */
  const updateAssistantMessage = useCallback((delta: string) => {
    currentAssistantMessageRef.current += delta;
    setMessages(prev => {
      const newMessages = [...prev];
      // Trouver ou créer le dernier message assistant
      const lastIndex = newMessages.length - 1;
      if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          text: currentAssistantMessageRef.current
        };
      } else {
        newMessages.push({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: currentAssistantMessageRef.current
        });
      }
      return newMessages;
    });
  }, []);

  /**
   * Réinitialiser tous les messages
   */
  const reset = useCallback(() => {
    currentAssistantMessageRef.current = '';
    setMessages([]);
  }, []);

  return {
    messages,
    addUserMessage,
    updateAssistantMessage,
    reset
  };
}

