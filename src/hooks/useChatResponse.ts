import { useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

interface UseChatResponseOptions {
  onComplete?: (fullContent: string, fullReasoning: string, toolCalls?: any[], toolResults?: any[]) => void;
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
      logger.dev('[useChatResponse] 🎯 sendMessage appelé:', {
        message: message.substring(0, 50) + '...',
        sessionId,
        hasContext: !!context,
        historyLength: history?.length || 0,
        hasToken: !!token
      });

      setIsProcessing(true);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      // Ajouter le token d'authentification si fourni
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      logger.dev('[useChatResponse] 🚀 Envoi de la requête à l\'API LLM:', {
        message: message.substring(0, 50) + '...',
        sessionId,
        hasContext: !!context,
        historyLength: history?.length || 0
      });

      logger.dev('[useChatResponse] 🔄 Appel fetch en cours...');
      
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

      logger.dev('[useChatResponse] ✅ Fetch terminé, traitement de la réponse...');

      logger.dev('[useChatResponse] 📥 Réponse HTTP reçue:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        // 🔧 Logging amélioré avec sérialisation JSON sécurisée
        let safeErrorData: string;
        try {
          safeErrorData = JSON.stringify(errorData, null, 2);
        } catch (e) {
          safeErrorData = `[Error serializing data: ${e instanceof Error ? e.message : 'Unknown error'}]`;
        }
        
        logger.error('[useChatResponse] ❌ Réponse HTTP non-OK:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          errorData: safeErrorData
        });
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      logger.dev('[useChatResponse] 🔄 Début du parsing JSON...');
      
      let data;
      try {
        data = await response.json();
        logger.dev('[useChatResponse] ✅ JSON parsé avec succès');
        logger.dev('[useChatResponse] 🔍 Réponse brute reçue:', {
          status: response.status,
          ok: response.ok,
          data: data,
          dataType: typeof data,
          hasSuccess: 'success' in data,
          success: data?.success,
          hasContent: 'content' in data,
          content: data?.content?.substring(0, 100) + '...',
          contentLength: data?.content?.length || 0
        });
      } catch (parseError) {
        logger.error('[useChatResponse] ❌ Erreur parsing JSON:', parseError instanceof Error ? parseError.message : String(parseError));
        const textResponse = await response.text();
        logger.error('[useChatResponse] ❌ Réponse texte brute:', textResponse.substring(0, 500));
        throw new Error('Erreur parsing JSON de la réponse');
      }

      // 🔧 AMÉLIORATION: Validation de base de la réponse
      if (!data) {
        throw new Error('Réponse vide du serveur');
      }

      // ✅ NOUVELLE LOGIQUE CLAIRE ET ROBUSTE
      if (data.success) {
        logger.dev('[useChatResponse] 🔍 Structure de la réponse:', {
          success: data.success,
          is_relance: data.is_relance,
          tool_calls_length: data.tool_calls?.length || 0,
          tool_results_length: data.tool_results?.length || 0,
          content_length: data.content?.length || 0
        });

        // 🎯 PRIORITÉ 1 : Réponse finale (is_relance = true)
        // Le LLM a terminé son traitement après avoir utilisé des tools
        if (data.is_relance) {
          logger.dev('[useChatResponse] ✅ Réponse finale après tool calls reçue');
          logger.tool('[useChatResponse] ✅ Réponse finale reçue');
          
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
          
          // Informer si des tools ont échoué
          if (data.has_failed_tools) {
            logger.dev('[useChatResponse] ⚠️ Des tools ont échoué mais le LLM a géré intelligemment');
          }
          
          // ✅ Toujours appeler onComplete pour une réponse finale
          logger.dev('[useChatResponse] 🎯 Appel onComplete (réponse finale)');
          onComplete?.(
            data.content || '', 
            data.reasoning || '', 
            data.tool_calls || [], 
            data.tool_results || []
          );
          return;
        }
        
        // 🎯 PRIORITÉ 2 : Tool calls en cours (is_relance = false)
        if (data.tool_calls && data.tool_calls.length > 0) {
          const toolCallIds = data.tool_calls.map((tc: { id: string }) => tc.id);
          setPendingToolCalls(new Set(toolCallIds));
          
          if (data.tool_calls.length > 10) {
            logger.tool(`[useChatResponse] ⚡ ${data.tool_calls.length} tool calls détectés`);
          } else {
            logger.tool(`[useChatResponse] 🔧 ${data.tool_calls.length} tool call(s) détecté(s)`);
          }
          
          onToolCalls?.(data.tool_calls, 'tool_chain');
          
          // Traiter les tool results s'ils sont déjà disponibles
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

            // Logger la progression
            const completedCount = data.tool_results.length;
            const totalCount = data.tool_calls.length;
            
            if (completedCount === totalCount) {
              logger.dev(`[useChatResponse] ✅ Tous les ${totalCount} tool calls terminés`);
              onToolExecutionComplete?.(data.tool_results);
            } else {
              logger.dev(`[useChatResponse] ⏳ ${completedCount}/${totalCount} tool calls terminés`);
            }
          }
          
          // ❌ NE PAS appeler onComplete ici - attendre la réponse finale
          return;
        }
        
        // 🎯 PRIORITÉ 3 : Réponse simple sans tool calls
        logger.dev('[useChatResponse] ✅ Réponse simple sans tool calls');
        logger.dev('[useChatResponse] 🎯 Appel onComplete (réponse simple)');
        onComplete?.(
          data.content || '', 
          data.reasoning || '', 
          [], 
          []
        );
        return;
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