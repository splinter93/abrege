import { useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

interface UseChatResponseOptions {
  onComplete?: (fullContent: string, fullReasoning: string) => void;
  onError?: (error: string) => void;
  onToolCalls?: (toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>, toolName: string) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: Array<{ name: string; result: unknown; success: boolean; tool_call_id: string }>) => void;
}

interface UseChatResponseReturn {
  isProcessing: boolean;
  sendMessage: (message: string, sessionId: string, context?: Record<string, unknown>, history?: unknown[], token?: string) => Promise<void>;
  reset: () => void;
}

export function useChatResponse(options: UseChatResponseOptions = {}): UseChatResponseReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<Set<string>>(new Set());

  const { onComplete, onError, onToolCalls, onToolResult, onToolExecutionComplete } = options;

  const sendMessage = useCallback(async (message: string, sessionId: string, context?: Record<string, unknown>, history?: unknown[], token?: string) => {
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
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 🔧 AMÉLIORATION: Validation de base de la réponse
      if (!data) {
        throw new Error('Réponse vide du serveur');
      }

      // ✅ RESTAURATION: Logique originale qui fonctionnait
      if (data.success) {
        // 🎯 Gérer le cas des nouveaux tool calls (continuation du cycle)
        if (data.has_new_tool_calls && data.tool_calls && data.tool_calls.length > 0) {
          logger.dev('[useChatResponse] 🔄 Nouveaux tool calls détectés, continuation du cycle');
          logger.tool('[useChatResponse] 🔄 Nouveaux tool calls détectés, continuation du cycle');
          
          // Traiter les nouveaux tool calls
          const toolCallIds = data.tool_calls.map((tc: { id: string }) => tc.id);
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
          }
          
          // 🎯 IMPORTANT: Ne pas appeler onComplete ici car le cycle continue
          // L'utilisateur doit attendre la réponse finale
          return;
        }
        
        // 🎯 Gérer le cas de la relance automatique (LLM a répondu après tool calls)
        // PRIORITÉ: Vérifier is_relance AVANT de vérifier tool_calls
        if (data.is_relance && !data.has_new_tool_calls) {
          logger.dev('[useChatResponse] ✅ Relance automatique terminée, réponse finale reçue');
          logger.tool('[useChatResponse] ✅ Relance automatique terminée, réponse finale reçue');
          
          // Traiter les tool results si présents
          if (data.tool_results && data.tool_results.length > 0) {
            for (const toolResult of data.tool_results) {
              onToolResult?.(
                toolResult.name,
                toolResult.result,
                toolResult.success,
                toolResult.tool_call_id
              );
            }
          }
          
          // 🎯 NOUVEAU: Informer si des tools ont échoué mais ont été gérés intelligemment
          if (data.has_failed_tools) {
            logger.dev('[useChatResponse] ⚠️ Des tools ont échoué mais le LLM a géré intelligemment');
            // Optionnel: Ajouter un indicateur visuel pour l'utilisateur
          }
          
          // Appeler onComplete avec la réponse finale
          onComplete?.(data.content || '', data.reasoning || '');
          return;
        }
        
        // Gérer les tool calls normaux si présents (premier appel)
        if (data.tool_calls && data.tool_calls.length > 0 && !data.is_relance) {
          // 🔧 AMÉLIORATION: Gestion des multiples tool calls
          const toolCallIds = data.tool_calls.map((tc: { id: string }) => tc.id);
          setPendingToolCalls(new Set(toolCallIds));
          
          // 🔧 NOUVEAU: Log spécial pour les multiples tool calls
          if (data.tool_calls.length > 10) {
            logger.dev(`[useChatResponse] ⚡ Multiple tool calls détectés: ${data.tool_calls.length} tools`);
            logger.tool(`[useChatResponse] ⚡ Multiple tool calls détectés: ${data.tool_calls.length} tools`);
          }
          
          logger.tool(`[useChatResponse] 🔧 Tool calls détectés: ${data.tool_calls.length} tools`);
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

            // 🔧 AMÉLIORATION: Gestion intelligente de la relance pour multiples tools
            if (data.tool_results.length === data.tool_calls.length) {
              logger.dev(`[useChatResponse] ✅ Tous les ${data.tool_calls.length} tool calls sont terminés`);
              onToolExecutionComplete?.(data.tool_results);
            } else {
              logger.dev(`[useChatResponse] ⏳ ${data.tool_results.length}/${data.tool_calls.length} tool calls terminés`);
            }
          }
        } else {
          // Pas de tool calls ou réponse finale, appeler onComplete directement
          logger.dev('[useChatResponse] ✅ Réponse simple sans tool calls, appel onComplete');
          logger.dev('[useChatResponse] 📄 Contenu:', { content: data.content, contentLength: data.content?.length || 0 });
          onComplete?.(data.content || '', data.reasoning || '');
        }
      } else {
        // 🔧 AMÉLIORATION: Gestion des erreurs serveur
        if (data.error) {
          const errorMessage = data.error || data.details || 'Erreur inconnue du serveur';
          logger.warn('[useChatResponse] ⚠️ Réponse d\'erreur du serveur:', { error: errorMessage, data });
          throw new Error(errorMessage);
        } else {
          // Fallback pour les réponses invalides
          logger.warn('[useChatResponse] ⚠️ Réponse invalide du serveur:', data);
          throw new Error('Format de réponse invalide');
        }
      }
    } catch (error) {
      // 🔧 AMÉLIORATION: Gestion d'erreur plus robuste
      let errorMessage: string;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        logger.error('[useChatResponse] ❌ Erreur Error:', error);
      } else if (typeof error === 'string') {
        errorMessage = error;
        logger.error('[useChatResponse] ❌ Erreur string:', error);
      } else {
        errorMessage = 'Erreur inconnue';
        logger.error('[useChatResponse] ❌ Erreur inconnue:', error);
      }
      
      // Appeler le callback d'erreur si disponible
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onComplete, onError, onToolCalls, onToolResult, onToolExecutionComplete]);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setPendingToolCalls(new Set());
  }, []);

  return {
    isProcessing,
    sendMessage,
    reset
  };
} 