import { useState, useCallback } from 'react';
import { useLLMStreaming } from '@/hooks/useLLMStreaming';
import { useChatStore } from '@/store/useChatStore';

interface UseStreamingChatOptions {
  sessionId: string;
}

/**
 * Hook pour le chat avec streaming LLM
 * Combine le store Zustand avec le streaming WebSocket
 */
export function useStreamingChat(options: UseStreamingChatOptions) {
  const { addMessage, currentSession } = useChatStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Hook de streaming LLM
  const { startStreaming, stopStreaming } = useLLMStreaming({
    sessionId: options.sessionId,
    onToken: (token: string) => {
      setStreamingText(prev => prev + token);
    },
    onComplete: () => {
      // Sauvegarder le message complet
      if (streamingText.trim()) {
        addMessage({
          role: 'assistant',
          content: streamingText,
          timestamp: new Date().toISOString()
        });
      }
      setStreamingText('');
      setIsStreaming(false);
    },
    onError: (error) => {
      console.error('Erreur streaming LLM:', error);
      setIsStreaming(false);
      setStreamingText('');
    }
  });

  const sendMessageWithStreaming = useCallback(async (message: string) => {
    if (!message.trim() || !currentSession) return;

    // Ajouter le message utilisateur
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString()
    };
    await addMessage(userMessage);

    // Démarrer le streaming
    setIsStreaming(true);
    setStreamingText('');
    startStreaming();

    try {
      // Appeler l'API Synesia avec streaming
      const response = await fetch('/api/chat/synesia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          messages: currentSession.thread,
          streaming: true,
          sessionId: options.sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      // Le streaming se fait via Server-Sent Events
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Pas de body de réponse');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'LLM_STREAM' && data.token) {
                setStreamingText(prev => prev + data.token);
              } else if (data.type === 'LLM_COMPLETE') {
                // Message déjà géré par le WebSocket
                break;
              } else if (data.type === 'ERROR') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.warn('Erreur parsing SSE:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur streaming:', error);
      setIsStreaming(false);
      setStreamingText('');
      
      // Ajouter un message d'erreur
      await addMessage({
        role: 'assistant',
        content: 'Désolé, une erreur est survenue lors du traitement de votre message.',
        timestamp: new Date().toISOString()
      });
    }
  }, [currentSession, addMessage, startStreaming, options.sessionId]);

  return {
    sendMessageWithStreaming,
    isStreaming,
    streamingText,
    stopStreaming
  };
} 