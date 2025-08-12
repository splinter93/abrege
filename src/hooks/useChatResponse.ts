import { useState, useCallback } from 'react';

interface UseChatResponseOptions {
  onComplete?: (fullContent: string, fullReasoning: string) => void;
  onError?: (error: string) => void;
  onToolCalls?: (toolCalls: any[], toolName: string) => void;
  onToolResult?: (toolName: string, result: any, success: boolean, toolCallId?: string) => void;
}

interface UseChatResponseReturn {
  isProcessing: boolean;
  content: string;
  reasoning: string;
  sendMessage: (message: string, sessionId: string) => Promise<void>;
  reset: () => void;
}

export function useChatResponse(options: UseChatResponseOptions = {}): UseChatResponseReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [content, setContent] = useState('');
  const [reasoning, setReasoning] = useState('');
  
  const { onComplete, onError, onToolCalls, onToolResult } = options;

  const sendMessage = useCallback(async (message: string, sessionId: string) => {
    try {
      setIsProcessing(true);
      setContent('');
      setReasoning('');

      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setContent(data.content || '');
        setReasoning(data.reasoning || '');
        
        // Gérer les tool calls si présents
        if (data.tool_calls && data.tool_calls.length > 0) {
          onToolCalls?.(data.tool_calls, 'tool_chain');
        }
        
        onComplete?.(data.content, data.reasoning);
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onComplete, onError, onToolCalls, onToolResult]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setContent('');
    setReasoning('');
  }, []);

  return {
    isProcessing,
    content,
    reasoning,
    sendMessage,
    reset
  };
} 