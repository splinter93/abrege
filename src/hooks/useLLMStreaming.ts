import { useState, useEffect, useCallback } from 'react';
import { subscribeToTable, unsubscribeFromTable } from '@/services/websocketService';

interface LLMStreamingOptions {
  sessionId: string;
  onToken?: (token: string) => void;
  onComplete?: () => void;
  onError?: (error: any) => void;
}

interface LLMStreamingState {
  isStreaming: boolean;
  currentText: string;
  error: string | null;
}

/**
 * Hook pour le streaming LLM via WebSocket
 * Permet de recevoir les tokens en temps réel
 */
export function useLLMStreaming(options: LLMStreamingOptions) {
  const [state, setState] = useState<LLMStreamingState>({
    isStreaming: false,
    currentText: '',
    error: null
  });

  const handleStreamEvent = useCallback((event: any) => {
    if (event.sessionId !== options.sessionId) return;

    if (event.type === 'LLM_STREAM') {
      setState(prev => ({
        ...prev,
        isStreaming: true,
        currentText: prev.currentText + event.token,
        error: null
      }));

      // Callback pour chaque token
      if (options.onToken) {
        options.onToken(event.token);
      }
    } else if (event.type === 'LLM_COMPLETE') {
      setState(prev => ({
        ...prev,
        isStreaming: false
      }));

      // Callback de fin
      if (options.onComplete) {
        options.onComplete();
      }
    }
  }, [options.sessionId, options.onToken, options.onComplete]);

  useEffect(() => {
    // S'abonner au streaming LLM
    subscribeToTable('llm_stream', handleStreamEvent);

    return () => {
      // Se désabonner
      unsubscribeFromTable('llm_stream', handleStreamEvent);
    };
  }, [handleStreamEvent]);

  const startStreaming = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStreaming: true,
      currentText: '',
      error: null
    }));
  }, []);

  const stopStreaming = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStreaming: false
    }));
  }, []);

  return {
    ...state,
    startStreaming,
    stopStreaming
  };
} 