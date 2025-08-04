import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

interface UseChatStreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
}

interface UseChatStreamingReturn {
  isStreaming: boolean;
  content: string;
  startStreaming: (channelId: string, sessionId: string) => void;
  stopStreaming: () => void;
}

export function useChatStreaming(options: UseChatStreamingOptions = {}): UseChatStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  
  const channelRef = useRef<any>(null);
  const sessionIdRef = useRef<string>('');
  const { onToken, onComplete, onError } = options;

  const startStreaming = useCallback((channelId: string, sessionId: string) => {
    logger.dev('[useChatStreaming] 🚀 Démarrage streaming:', { channelId, sessionId });
    
    // Nettoyer l'état précédent
    setIsStreaming(false);
    setContent('');
    
    sessionIdRef.current = sessionId;
    
    // Créer le canal de streaming
    const channel = supabase
      .channel(channelId)
      .on('broadcast', { event: 'llm-token' }, (payload) => {
        logger.dev('[useChatStreaming] 📝 Token reçu:', payload);
        try {
          const { token, sessionId: payloadSessionId } = payload.payload || {};
          logger.dev('[useChatStreaming] 🔍 Comparaison sessionId:', { 
            expected: sessionId, 
            received: payloadSessionId,
            token: token?.substring(0, 20) + '...'
          });
          
          if (payloadSessionId === sessionId && token) {
            setContent(prev => {
              const newContent = prev + token;
              logger.dev('[useChatStreaming] 📊 Contenu mis à jour:', newContent.length, 'chars');
              return newContent;
            });
            onToken?.(token);
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur token:', error);
        }
      })
      .on('broadcast', { event: 'llm-complete' }, (payload) => {
        logger.dev('[useChatStreaming] ✅ Complete reçu:', payload);
        try {
          const { sessionId: payloadSessionId, fullResponse } = payload.payload || {};
          logger.dev('[useChatStreaming] 🔍 Complete sessionId:', { 
            expected: sessionId, 
            received: payloadSessionId,
            hasResponse: !!fullResponse
          });
          
          if (payloadSessionId === sessionId && fullResponse) {
            logger.dev('[useChatStreaming] 🎯 Completion traitée');
            setIsStreaming(false);
            setContent(fullResponse);
            onComplete?.(fullResponse);
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur completion:', error);
          setIsStreaming(false);
          onError?.('Erreur lors de la réception de la réponse');
        }
      })
      .on('broadcast', { event: 'llm-error' }, (payload) => {
        try {
          const { sessionId: payloadSessionId, error: errorMessage } = payload.payload || {};
          if (payloadSessionId === sessionId) {
            setIsStreaming(false);
            onError?.(errorMessage || 'Erreur lors du streaming');
          }
        } catch (error) {
          logger.error('[useChatStreaming] Erreur error event:', error);
          setIsStreaming(false);
          onError?.('Erreur lors du streaming');
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsStreaming(true);
          logger.dev('[useChatStreaming] ✅ Canal connecté');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[useChatStreaming] ❌ Erreur canal');
          setIsStreaming(false);
          onError?.('Erreur de connexion au canal de streaming');
        }
      });

    channelRef.current = channel;
  }, [onToken, onComplete, onError]);

  const stopStreaming = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    isStreaming,
    content,
    startStreaming,
    stopStreaming
  };
} 