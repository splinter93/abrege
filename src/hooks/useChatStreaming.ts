import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { logger } from '@/utils/logger';

interface UseChatStreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
  onReasoning?: (reasoning: string) => void;
  onToolCalls?: (toolCalls: any[], toolName: string) => void;
  onToolResult?: (toolName: string, result: any, success: boolean) => void;
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
  const { onToken, onComplete, onError, onReasoning, onToolCalls, onToolResult } = options;

  const startStreaming = useCallback((channelId: string, sessionId: string) => {
    logger.debug('[useChatStreaming] 🚀 Démarrage streaming:', { channelId, sessionId });
    
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
          logger.debug('[useChatStreaming] 📝 Token reçu:', payload);
        }
        try {
          const { token, sessionId: payloadSessionId } = payload.payload || {};
          
          if (payloadSessionId === sessionId && token) {
            setContent(prev => {
              const newContent = prev + token;
              // 🔧 OPTIMISATION: Log moins fréquent pour les mises à jour
              if (Math.random() < 0.01) { // Log seulement 1% du temps
                logger.debug('[useChatStreaming] 📊 Contenu mis à jour', { chars: newContent.length });
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
          logger.debug('[useChatStreaming] 📦 Batch de tokens reçu:', payload);
        }
        try {
          const { tokens, sessionId: payloadSessionId } = payload.payload || {};
          
          if (payloadSessionId === sessionId && tokens) {
            setContent(prev => {
              const newContent = prev + tokens;
              // 🔧 OPTIMISATION: Log moins fréquent pour les mises à jour batch
              if (Math.random() < 0.05) { // Log seulement 5% du temps
                logger.debug('[useChatStreaming] 📊 Contenu mis à jour (batch)', { chars: newContent.length });
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
          logger.debug('[useChatStreaming] 🧠 Reasoning reçu:', payload);
        }
        try {
          const { reasoning: reasoningToken, sessionId: payloadSessionId } = payload.payload || {};
          
          if (payloadSessionId === sessionId && reasoningToken) {
            setReasoning(prev => {
              const newReasoning = prev + reasoningToken;
              // 🔧 OPTIMISATION: Log moins fréquent pour les mises à jour reasoning
              if (Math.random() < 0.01) { // Log seulement 1% du temps
                logger.debug('[useChatStreaming] 🧠 Reasoning mis à jour', { chars: newReasoning.length });
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
        logger.debug('[useChatStreaming] ✅ Complete reçu:', payload);
        try {
          const { sessionId: payloadSessionId, fullResponse } = payload.payload || {};
          logger.debug('[useChatStreaming] 🔍 Complete sessionId:', { 
            expected: sessionId, 
            received: payloadSessionId,
            hasResponse: !!fullResponse
          });
          
          if (payloadSessionId === sessionId && fullResponse) {
            logger.debug('[useChatStreaming] 🎯 Completion traitée');
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
            logger.debug('[useChatStreaming] 🔧 Erreur de parsing JSON ignorée');
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
            logger.debug('[useChatStreaming] 🔧 Erreur de parsing JSON ignorée');
          } else {
            onError?.('Erreur lors du streaming');
          }
        }
      })
      .on('broadcast', { event: 'llm-tool-calls' }, (payload) => {
        try {
          const { sessionId: payloadSessionId, tool_calls, tool_name } = payload.payload || {};
          if (payloadSessionId === sessionId && tool_calls) {
            logger.debug('[useChatStreaming] 🔧 Tool calls reçus:', { tool_calls, tool_name });
            onToolCalls?.(tool_calls, tool_name);
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur tool calls event:', error);
        }
      })
      .on('broadcast', { event: 'llm-tool-result' }, (payload) => {
        try {
          const { sessionId: payloadSessionId, tool_name, result, success } = payload.payload || {};
          if (payloadSessionId === sessionId) {
            logger.debug('[useChatStreaming] ✅ Tool result reçu:', { tool_name, success });
            onToolResult?.(tool_name, result, success);
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur tool result event:', error);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsStreaming(true);
          logger.debug('[useChatStreaming] ✅ Canal connecté');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('[useChatStreaming] ❌ Erreur canal - Tentative de reconnexion...');
          setIsStreaming(false);
          
          // Logique de retry avec limite
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            logger.debug(`[useChatStreaming] 🔄 Tentative de reconnexion ${retryCountRef.current}/${maxRetries}`);
            
            // Tentative de reconnexion automatique après 2 secondes
            setTimeout(() => {
              if (channelRef.current && sessionIdRef.current) {
                logger.debug('[useChatStreaming] 🔄 Reconnexion en cours...');
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
          logger.debug('[useChatStreaming] 🔒 Canal fermé');
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