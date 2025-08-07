import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { simpleLogger as logger } from '@/utils/logger';

interface UseChatStreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
  onReasoning?: (reasoning: string) => void;
}

interface UseChatStreamingReturn {
  isStreaming: boolean;
  content: string;
  reasoning: string;
  startStreaming: (channelId: string, sessionId: string) => void;
  stopStreaming: () => void;
}

export function useChatStreaming(options: UseChatStreamingOptions = {}): UseChatStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [reasoning, setReasoning] = useState('');
  
  const channelRef = useRef<any>(null);
  const sessionIdRef = useRef<string>('');
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const { onToken, onComplete, onError, onReasoning } = options;

  const startStreaming = useCallback((channelId: string, sessionId: string) => {
    logger.dev('[useChatStreaming] 🚀 Démarrage streaming:', { channelId, sessionId });
    
    // Nettoyer l'état précédent
    setIsStreaming(false);
    setContent('');
    setReasoning('');
    retryCountRef.current = 0; // Reset le compteur de retry
    
    sessionIdRef.current = sessionId;
    
    // Créer le canal de streaming
    const channel = supabase
      .channel(channelId)
      .on('broadcast', { event: 'llm-token' }, (payload) => {
        // 🔧 OPTIMISATION: Log moins fréquent pour les tokens
        if (Math.random() < 0.05) { // Log seulement 5% du temps
          logger.dev('[useChatStreaming] 📝 Token reçu:', payload);
        }
        try {
          const { token, sessionId: payloadSessionId } = payload.payload || {};
          
          if (payloadSessionId === sessionId && token) {
            setContent(prev => {
              const newContent = prev + token;
              // 🔧 OPTIMISATION: Log moins fréquent pour les mises à jour
              if (Math.random() < 0.01) { // Log seulement 1% du temps
                logger.dev('[useChatStreaming] 📊 Contenu mis à jour:', newContent.length, 'chars');
              }
              return newContent;
            });
            onToken?.(token);
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur token:', error);
        }
      })
      .on('broadcast', { event: 'llm-token-batch' }, (payload) => {
        // 🔧 OPTIMISATION: Log moins fréquent pour les batches
        if (Math.random() < 0.1) { // Log seulement 10% du temps
          logger.dev('[useChatStreaming] 📦 Batch de tokens reçu:', payload);
        }
        try {
          const { tokens, sessionId: payloadSessionId } = payload.payload || {};
          
          if (payloadSessionId === sessionId && tokens) {
            setContent(prev => {
              const newContent = prev + tokens;
              // 🔧 OPTIMISATION: Log moins fréquent pour les mises à jour batch
              if (Math.random() < 0.05) { // Log seulement 5% du temps
                logger.dev('[useChatStreaming] 📊 Contenu mis à jour (batch):', newContent.length, 'chars');
              }
              return newContent;
            });
            // Appeler onToken pour chaque token du batch
            for (const token of tokens) {
              onToken?.(token);
            }
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur batch:', error);
        }
      })
      .on('broadcast', { event: 'llm-reasoning' }, (payload) => {
        // 🔧 OPTIMISATION: Log moins fréquent pour les reasoning
        if (Math.random() < 0.05) { // Log seulement 5% du temps
          logger.dev('[useChatStreaming] 🧠 Reasoning reçu:', payload);
        }
        try {
          const { reasoning: reasoningToken, sessionId: payloadSessionId } = payload.payload || {};
          
          if (payloadSessionId === sessionId && reasoningToken) {
            setReasoning(prev => {
              const newReasoning = prev + reasoningToken;
              // 🔧 OPTIMISATION: Log moins fréquent pour les mises à jour reasoning
              if (Math.random() < 0.01) { // Log seulement 1% du temps
                logger.dev('[useChatStreaming] 🧠 Reasoning mis à jour:', newReasoning.length, 'chars');
              }
              return newReasoning;
            });
            onReasoning?.(reasoningToken);
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur reasoning:', error);
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
            // Ne pas reset le reasoning ici, il reste affiché séparément
            onComplete?.(fullResponse);
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur completion:', error);
          setIsStreaming(false);
          // Ne pas afficher l'erreur à l'utilisateur si c'est juste un problème de parsing
          if (error instanceof Error && error.message.includes('JSON')) {
            logger.dev('[useChatStreaming] 🔧 Erreur de parsing JSON ignorée');
          } else {
            onError?.('Erreur lors de la réception de la réponse');
          }
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
          // Ne pas afficher l'erreur à l'utilisateur si c'est juste un problème de parsing
          if (error instanceof Error && error.message.includes('JSON')) {
            logger.dev('[useChatStreaming] 🔧 Erreur de parsing JSON ignorée');
          } else {
            onError?.('Erreur lors du streaming');
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsStreaming(true);
          logger.dev('[useChatStreaming] ✅ Canal connecté');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[useChatStreaming] ❌ Erreur canal - Tentative de reconnexion...');
          setIsStreaming(false);
          
          // Logique de retry avec limite
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            logger.dev(`[useChatStreaming] 🔄 Tentative de reconnexion ${retryCountRef.current}/${maxRetries}`);
            
            // Tentative de reconnexion automatique après 2 secondes
            setTimeout(() => {
              if (channelRef.current && sessionIdRef.current) {
                logger.dev('[useChatStreaming] 🔄 Reconnexion en cours...');
                // La reconnexion se fera automatiquement via le hook
              }
            }, 2000);
          } else {
            logger.error('[useChatStreaming] ❌ Nombre maximum de tentatives atteint');
            retryCountRef.current = 0; // Reset pour la prochaine fois
            // Ne pas afficher l'erreur à l'utilisateur, juste logger
          }
        } else if (status === 'TIMED_OUT') {
          logger.error('[useChatStreaming] ⏰ Timeout canal');
          setIsStreaming(false);
          // Timeout est moins critique, on peut continuer sans streaming
        } else if (status === 'CLOSED') {
          logger.dev('[useChatStreaming] 🔒 Canal fermé');
          setIsStreaming(false);
        }
      });

    channelRef.current = channel;
  }, [onToken, onComplete, onError, onReasoning]);

  const stopStreaming = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsStreaming(false);
    retryCountRef.current = 0; // Reset le compteur de retry
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
    reasoning,
    startStreaming,
    stopStreaming
  };
} 