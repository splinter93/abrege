/**
 * Hook centralisé pour tous les handlers du chat
 * Extrait la logique complexe de ChatFullscreenV2
 */

import { useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthGuard } from './useAuthGuard';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Représente un appel de fonction/outil par le LLM
 */
export interface ToolCall {
  id: string;
  type?: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Représente le résultat de l'exécution d'un outil
 */
export interface ToolResult {
  tool_call_id: string;
  name: string;
  content: string;
  success: boolean;
  error?: string;
}

interface ChatHandlersOptions {
  onComplete?: (fullContent: string, fullReasoning: string, toolCalls?: ToolCall[], toolResults?: ToolResult[]) => void;
  onError?: (errorMessage: string) => void;
  onToolCalls?: (toolCalls: ToolCall[], toolName: string) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: ToolResult[]) => void;
}

interface ChatHandlersReturn {
  handleComplete: (fullContent: string, fullReasoning: string, toolCalls?: ToolCall[], toolResults?: ToolResult[]) => Promise<void>;
  handleError: (errorMessage: string) => void;
  handleToolCalls: (toolCalls: ToolCall[], toolName: string) => Promise<void>;
  handleToolResult: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => Promise<void>;
  handleToolExecutionComplete: (toolResults: ToolResult[]) => Promise<void>;
}

/**
 * Hook pour gérer tous les callbacks du chat de manière centralisée
 */
export function useChatHandlers(options: ChatHandlersOptions = {}): ChatHandlersReturn {
  const { requireAuth } = useAuthGuard();
  const { addMessage } = useChatStore();

  const handleComplete = useCallback(async (
    fullContent: string, 
    fullReasoning: string, 
    toolCalls?: ToolCall[], 
    toolResults?: ToolResult[]
  ) => {
    if (!requireAuth()) return;

    const safeContent = fullContent?.trim();
    
    if (!safeContent) {
      logger.warn('[useChatHandlers] ⚠️ Contenu vide, pas de message à ajouter');
      return;
    }
      
    const messageToAdd = {
      role: 'assistant' as const,
      content: safeContent,
      reasoning: fullReasoning,
      tool_calls: toolCalls || [],
      tool_results: toolResults || [],
      timestamp: new Date().toISOString()
    };

    logger.dev('[useChatHandlers] 📝 Ajout du message final complet');
    
    await addMessage(messageToAdd, { 
      persist: true, 
      updateExisting: true
    });
    
    options.onComplete?.(fullContent, fullReasoning, toolCalls, toolResults);
  }, [requireAuth, addMessage, options.onComplete]);

  const handleError = useCallback((errorMessage: string) => {
    if (!requireAuth()) return;

    addMessage({
      role: 'assistant',
      content: `Erreur: ${errorMessage}`,
      timestamp: new Date().toISOString()
    });

    options.onError?.(errorMessage);
  }, [requireAuth, addMessage, options.onError]);

  const handleToolCalls = useCallback(async (toolCalls: ToolCall[], toolName: string) => {
    if (!requireAuth()) {
      await addMessage({
        role: 'assistant',
        content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
        timestamp: new Date().toISOString()
      }, { persist: false });
      return;
    }

    logger.tool('[useChatHandlers] 🔧 Tool calls détectés:', { toolCalls, toolName });
    
    const toolCallMessage = {
      role: 'assistant' as const,
      content: '🔧 Exécution des outils en cours...',
      tool_calls: toolCalls,
      timestamp: new Date().toISOString(),
      channel: 'analysis' as const
    };
      
    await addMessage(toolCallMessage, { persist: true });
    
    options.onToolCalls?.(toolCalls, toolName);
  }, [requireAuth, addMessage, options.onToolCalls]);

  const handleToolResult = useCallback(async (
    toolName: string, 
    result: unknown, 
    success: boolean, 
    toolCallId?: string
  ) => {
    if (!requireAuth()) return;

    logger.tool('[useChatHandlers] ✅ Tool result reçu:', { toolName, success });
    
    // Normaliser le résultat
    const normalizeResult = (res: unknown, ok: boolean): string => {
      try {
        if (typeof res === 'string') {
          try {
            const parsed = JSON.parse(res);
            if (parsed && typeof parsed === 'object' && !('success' in parsed)) {
              return JSON.stringify({ success: !!ok, ...parsed });
            }
            return JSON.stringify(parsed);
          } catch {
            return JSON.stringify({ success: !!ok, message: res });
          }
        }
        if (res && typeof res === 'object') {
          const obj = res as Record<string, unknown>;
          if (!('success' in obj)) {
            return JSON.stringify({ success: !!ok, ...obj });
          }
          return JSON.stringify(obj);
        }
        return JSON.stringify({ success: !!ok, value: res });
      } catch {
        return JSON.stringify({ success: !!ok, error: 'tool_result_serialization_error' });
      }
    };

    const normalizedToolResult = {
      tool_call_id: toolCallId || `call_${Date.now()}`,
      name: toolName || 'unknown_tool',
      content: normalizeResult(result, !!success),
      success: !!success
    };

    const toolResultMessage = {
      role: 'tool' as const,
      ...normalizedToolResult,
      timestamp: new Date().toISOString()
    };

    await addMessage(toolResultMessage, { persist: true });
    
    options.onToolResult?.(toolName, result, success, toolCallId);
  }, [requireAuth, addMessage, options.onToolResult]);

  const handleToolExecutionComplete = useCallback(async (toolResults: ToolResult[]) => {
    logger.dev('[useChatHandlers] ✅ Exécution des tools terminée');
    
    if (toolResults && toolResults.length > 0) {
      for (const result of toolResults) {
        if (result.success) {
          logger.dev(`[useChatHandlers] ✅ Tool ${result.name} exécuté avec succès`);
        } else {
          logger.warn(`[useChatHandlers] ⚠️ Tool ${result.name} a échoué`);
        }
      }
    }
    
    options.onToolExecutionComplete?.(toolResults);
  }, [options.onToolExecutionComplete]);

  return {
    handleComplete,
    handleError,
    handleToolCalls,
    handleToolResult,
    handleToolExecutionComplete
  };
}

