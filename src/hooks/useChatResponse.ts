import { useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

interface UseChatResponseOptions {
  onComplete?: (
    fullContent: string, 
    fullReasoning: string, 
    toolCalls?: unknown[], 
    toolResults?: unknown[]
  ) => void;
  onError?: (error: string) => void;
  onToolCalls?: (toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>, toolName: string) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: Array<{ name: string; result: unknown; success: boolean; tool_call_id: string }>) => void;
  // ✅ NOUVEAU : Callbacks pour streaming
  onStreamChunk?: (content: string) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  useStreaming?: boolean; // Activer/désactiver le streaming
}

interface UseChatResponseReturn {
  isProcessing: boolean;
  sendMessage: (message: string, sessionId: string, context?: Record<string, unknown>, history?: unknown[], token?: string) => Promise<void>;
  reset: () => void;
}

export function useChatResponse(options: UseChatResponseOptions = {}): UseChatResponseReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<Set<string>>(new Set());

  const { 
    onComplete, 
    onError, 
    onToolCalls, 
    onToolResult, 
    onToolExecutionComplete,
    onStreamChunk,
    onStreamStart,
    onStreamEnd,
    useStreaming = false // ✅ Désactivé par défaut pour compatibilité
  } = options;

  const sendMessage = useCallback(async (message: string, sessionId: string, context?: Record<string, unknown>, history?: unknown[], token?: string) => {
    try {
      logger.dev('[useChatResponse] 🎯 sendMessage appelé:', {
        message: message.substring(0, 50) + '...',
        sessionId,
        hasContext: !!context,
        historyLength: history?.length || 0,
        hasToken: !!token,
        useStreaming
      });

      setIsProcessing(true);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      // Ajouter le token d'authentification si fourni
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // ✅ NOUVEAU : Router vers l'endpoint streaming si activé
      if (useStreaming) {
        logger.dev('[useChatResponse] 🌊 Mode streaming activé');
        onStreamStart?.();
        
        const response = await fetch('/api/chat/llm/stream', {
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
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        // Consommer le stream SSE
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let fullReasoning = '';
        const toolCallsMap = new Map<string, any>(); // ✅ Déduplication par ID

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            logger.dev('[useChatResponse] ✅ Stream terminé');
            break;
          }

          // Décoder le chunk
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            
            if (!trimmed || !trimmed.startsWith('data: ')) {
              continue;
            }

            const data = trimmed.slice(6);
            
            try {
              const chunk = JSON.parse(data);
              
              // Gérer les différents types de chunks
              if (chunk.type === 'start') {
                logger.dev('[useChatResponse] 🚀 Stream démarré');
                continue;
              }

              if (chunk.type === 'delta') {
                // Content progressif
                if (chunk.content) {
                  fullContent += chunk.content;
                  onStreamChunk?.(chunk.content);
                }

                // Reasoning
                if (chunk.reasoning) {
                  fullReasoning += chunk.reasoning;
                }

                // ✅ Tool calls avec déduplication par ID (ne notifie PAS pendant streaming)
                if (chunk.tool_calls && Array.isArray(chunk.tool_calls)) {
                  for (const tc of chunk.tool_calls) {
                    if (!toolCallsMap.has(tc.id)) {
                      // Nouveau tool call
                      toolCallsMap.set(tc.id, {
                        id: tc.id,
                        type: tc.type || 'function',
                        function: {
                          name: tc.function?.name || '',
                          arguments: tc.function?.arguments || ''
                        }
                      });
                    } else {
                      // Accumuler arguments progressifs (streaming)
                      const existing = toolCallsMap.get(tc.id);
                      if (tc.function?.name) existing.function.name = tc.function.name;
                      if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                    }
                  }
                }
              }
              
              // ✅ Gérer tool_execution et tool_result du backend
              if (chunk.type === 'tool_execution') {
                logger.dev(`[useChatResponse] 🔧 Exécution de ${chunk.toolCount || 0} tools...`);
                // Notifier onToolCalls UNE FOIS avec tous les tool calls finaux
                const finalToolCalls = Array.from(toolCallsMap.values());
                if (finalToolCalls.length > 0) {
                  onToolCalls?.(finalToolCalls, 'stream');
                }
              }
              
              if (chunk.type === 'tool_result') {
                logger.dev(`[useChatResponse] ✅ Tool result: ${chunk.toolName}`);
                onToolResult?.(chunk.toolName || '', chunk, chunk.success || false, chunk.toolCallId);
              }

              if (chunk.type === 'done') {
                logger.dev('[useChatResponse] 🏁 Stream [DONE]');
                const finalToolCalls = Array.from(toolCallsMap.values());
                onStreamEnd?.();
                onComplete?.(fullContent, fullReasoning, finalToolCalls, []);
              }

              if (chunk.type === 'error') {
                throw new Error(chunk.error || 'Erreur stream');
              }

            } catch (parseError) {
              logger.warn('[useChatResponse] ⚠️ Erreur parsing chunk:', parseError);
              continue;
            }
          }
        }

        return;
      }
      
      // ✅ MODE CLASSIQUE (sans streaming)
      logger.dev('[useChatResponse] 🚀 Envoi de la requête à l\'API LLM (mode classique)');
      
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
        
        logger.dev('[useChatResponse] ❌ Réponse HTTP non-OK:', {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          errorData: errorData
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
        logger.dev('[useChatResponse] ❌ Erreur parsing JSON:', {
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        const textResponse = await response.text();
        logger.dev('[useChatResponse] ❌ Réponse texte brute:', {
          response: textResponse.substring(0, 500)
        });
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
      // Gestion d'erreur
      let errorMessage: string;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        logger.dev('[useChatResponse] ❌ Erreur:', {
          message: error.message,
          stack: error.stack
        });
      } else if (typeof error === 'string') {
        errorMessage = error;
        logger.dev('[useChatResponse] ❌ Erreur:', { error });
      } else {
        errorMessage = 'Erreur inconnue';
        logger.dev('[useChatResponse] ❌ Erreur:', { error: String(error) });
      }
      
      // Appeler le callback d'erreur si disponible
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onComplete, onError, onToolCalls, onToolResult, onToolExecutionComplete, onStreamChunk, onStreamStart, onStreamEnd, useStreaming]);

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