import { useState, useCallback } from 'react';
import { Message, getSynesiaResponse } from './chatService';
import { ChatLogger } from './chatLogger';

export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await getSynesiaResponse(content, messages);
      
      if (response.error) {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Erreur: ${response.error}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
        ChatLogger.warn('Message', 'Erreur reçue de l\'API', { error: response.error });
      } else if (response.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        ChatLogger.info('Message', 'Message envoyé avec succès');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erreur lors de la communication avec l\'IA',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      ChatLogger.error('Message', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    ChatLogger.info('Message', 'Messages effacés');
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    clearMessages,
  };
}; 