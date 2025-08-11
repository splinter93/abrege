import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/supabaseClient';
import { logger } from '@/utils/logger';

interface UseChatStreamingOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullContent: string, fullReasoning: string) => void;
  onError?: (error: string) => void;
  onReasoning?: (reasoning: string) => void;
  onToolCalls?: (toolCalls: any[], toolName: string) => void;
  onToolResult?: (toolName: string, result: any, success: boolean, toolCallId?: string) => void;
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
  const channelIdRef = useRef<string>('');
  const retryCountRef = useRef(0);
  const maxRetries = 4;
  const { onToken, onComplete, onError, onReasoning, onToolCalls, onToolResult } = options;

  const attachAndSubscribe = useCallback((channelId: string, sessionId: string, opts?: { preserveBuffers?: boolean }) => {
    const preserve = !!opts?.preserveBuffers;

    logger.debug('[useChatStreaming] 🔌 (Re)abonnement canal:', { channelId, sessionId, preserveBuffers: preserve });

    // Optionnellement réinitialiser l'état uniquement au premier démarrage
    if (!preserve) {
      setIsStreaming(false);
      setContent('');
      setReasoning('');
      retryCountRef.current = 0;
    }

    sessionIdRef.current = sessionId;
    channelIdRef.current = channelId;

    // Nettoyer l'ancien canal
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }

    const channel = supabase
      .channel(channelId)
      .on('broadcast', { event: 'llm-token' }, (payload) => {
        if (Math.random() < 0.05) {
          logger.debug('[useChatStreaming] 📝 Token reçu:', payload);
        }
        try {
          const { token, sessionId: payloadSessionId } = payload.payload || {};
          if (payloadSessionId === sessionId && token) {
            setContent(prev => {
              const newContent = prev + token;
              if (Math.random() < 0.01) {
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
        if (Math.random() < 0.1) {
          logger.debug('[useChatStreaming] 📦 Batch de tokens reçu:', payload);
        }
        try {
          const { tokens, sessionId: payloadSessionId } = payload.payload || {};
          if (payloadSessionId === sessionId && tokens) {
            setContent(prev => {
              const newContent = prev + tokens;
              if (Math.random() < 0.05) {
                logger.debug('[useChatStreaming] 📊 Contenu mis à jour (batch)', { chars: newContent.length });
              }
              return newContent;
            });
            for (const token of tokens) {
              onToken?.(token);
            }
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur batch:', error);
        }
      })
      .on('broadcast', { event: 'llm-reasoning' }, (payload) => {
        if (Math.random() < 0.05) {
          logger.debug('[useChatStreaming] 🧠 Reasoning reçu:', payload);
        }
        try {
          const { reasoning: reasoningToken, sessionId: payloadSessionId } = payload.payload || {};
          if (payloadSessionId === sessionId && reasoningToken) {
            setReasoning(prev => {
              const newReasoning = prev + reasoningToken;
              if (Math.random() < 0.01) {
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
          logger.debug('[useChatStreaming] 🔍 Complete sessionId:', { expected: sessionId, received: payloadSessionId, hasResponse: typeof fullResponse === 'string' });
          if (payloadSessionId === sessionId) {
            // Toujours stopper le streaming, même si le texte est vide
            setIsStreaming(false);
            if (channelRef.current) {
              try { supabase.removeChannel(channelRef.current); } catch {}
              channelRef.current = null;
            }
            const finalText = typeof fullResponse === 'string' ? fullResponse : '';
            // Use current reasoning then clear it to avoid stale reasoning
            const finalReasoning = reasoning;
            onComplete?.(finalText, finalReasoning);
            setReasoning('');
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur completion:', error);
          setIsStreaming(false);
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
          const { sessionId: payloadSessionId, tool_name, tool_call_id, result, success } = payload.payload || {};
          if (payloadSessionId === sessionId) {
            logger.debug('[useChatStreaming] ✅ Tool result reçu:', { tool_name, success, tool_call_id });
            onToolResult?.(tool_name, result, success, tool_call_id);
          }
        } catch (error) {
          logger.error('[useChatStreaming] ❌ Erreur tool result event:', error);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsStreaming(true);
          retryCountRef.current = 0; // reset retries on success
          logger.debug('[useChatStreaming] ✅ Canal connecté');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Backoff exponentiel avec jitter
          const attempt = retryCountRef.current + 1;
          if (attempt > maxRetries) {
            logger.error('[useChatStreaming] ❌ Nombre maximum de tentatives atteint');
            setIsStreaming(false);
            return;
          }
          retryCountRef.current = attempt;
          const baseDelay = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
          const jitter = Math.floor(baseDelay * (0.2 * Math.random()));
          const delay = baseDelay + jitter;
          logger.error('[useChatStreaming] ❌ Erreur canal - Tentative de reconnexion...', { attempt, delay });

          setIsStreaming(false);
          setTimeout(() => {
            // Re-subscribe without clearing buffers
            attachAndSubscribe(channelIdRef.current, sessionIdRef.current, { preserveBuffers: true });
          }, delay);
        } else if (status === 'CLOSED') {
          logger.debug('[useChatStreaming] 🔒 Canal fermé');
          setIsStreaming(false);
        }
      });

    channelRef.current = channel;
  }, [onToken, onComplete, onError, onReasoning, onToolCalls, onToolResult, reasoning]);

  const startStreaming = useCallback((channelId: string, sessionId: string) => {
    logger.debug('[useChatStreaming] 🚀 Démarrage streaming:', { channelId, sessionId });
    attachAndSubscribe(channelId, sessionId, { preserveBuffers: false });
  }, [attachAndSubscribe]);

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