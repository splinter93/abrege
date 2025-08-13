import { useState, useCallback } from 'react';

interface UseChatResponseOptions {
  onComplete?: (fullContent: string, fullReasoning: string) => void;
  onError?: (error: string) => void;
  onToolCalls?: (toolCalls: any[], toolName: string) => void;
  onToolResult?: (toolName: string, result: any, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: any[]) => void;
}

interface UseChatResponseReturn {
  isProcessing: boolean;
  sendMessage: (message: string, sessionId: string, context?: any, history?: any[], token?: string) => Promise<void>;
  reset: () => void;
}

export function useChatResponse(options: UseChatResponseOptions = {}): UseChatResponseReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<Set<string>>(new Set());

  const { onComplete, onError, onToolCalls, onToolResult, onToolExecutionComplete } = options;

  const sendMessage = useCallback(async (message: string, sessionId: string, context?: any, history?: any[], token?: string) => {
    try {
      setIsProcessing(true);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      // Ajouter le token d'authentification si fourni
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          context: context || { sessionId }, 
          history: history || [],
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Gérer les tool calls si présents
        if (data.tool_calls && data.tool_calls.length > 0) {
          // Initialiser le tracking des tool calls en attente
          const toolCallIds = data.tool_calls.map(tc => tc.id);
          setPendingToolCalls(new Set(toolCallIds));
          
          onToolCalls?.(data.tool_calls, 'tool_chain');
          
          // Si on a des tool results, les traiter immédiatement
          if (data.tool_results && data.tool_results.length > 0) {
            for (const toolResult of data.tool_results) {
              onToolResult?.(
                toolResult.name,
                toolResult.result,
                toolResult.success,
                toolResult.tool_call_id
              );
              
              // Marquer ce tool call comme terminé
              setPendingToolCalls(prev => {
                const newSet = new Set(prev);
                newSet.delete(toolResult.tool_call_id);
                return newSet;
              });
            }

            // Si tous les tool calls sont terminés, déclencher la relance
            if (data.tool_results.length === data.tool_calls.length) {
              onToolExecutionComplete?.(data.tool_results);
            }
          }
        } else {
          // Pas de tool calls, appeler onComplete directement
          onComplete?.(data.content || '', data.reasoning || '');
        }
      } else {
        throw new Error(data.error || 'Erreur inconnue');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onComplete, onError, onToolCalls, onToolResult, onToolExecutionComplete]);

  const reset = useCallback(() => {
    setIsProcessing(false);
  }, []);

  return {
    isProcessing,
    sendMessage,
    reset
  };
} 