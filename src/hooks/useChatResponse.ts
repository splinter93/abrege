import { useState, useCallback, useRef } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { StreamOrchestrator, type StreamErrorDetails } from '@/services/streaming/StreamOrchestrator';
import { networkRetryService, type NetworkError } from '@/services/network/NetworkRetryService';
import type { ToolCall, ToolResult } from '@/hooks/useChatHandlers';
import type { ChatMessage } from '@/types/chat';
import type { MessageContent } from '@/types/image';
import type { StreamTimeline } from '@/types/streamTimeline';
import type { LLMContextForOrchestrator } from '@/services/chat/ChatContextBuilder';

interface UseChatResponseOptions {
  onComplete?: (
    fullContent: string, 
    fullReasoning: string, 
    toolCalls?: ToolCall[], 
    toolResults?: ToolResult[],
    streamTimeline?: StreamTimeline
  ) => void;
  onError?: (error: string | StreamErrorDetails) => void;
  onToolCalls?: (toolCalls: ToolCall[], toolName: string) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: ToolResult[]) => void;
  // Callbacks pour streaming
  onStreamChunk?: (content: string) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onToolExecution?: (toolCount: number, toolCalls: ToolCall[]) => void;
  onPlanUpdate?: (payload: {
    title?: string;
    steps: Array<{ id: string; content: string; status: string }>;
  }) => void;
  useStreaming?: boolean;
  onAssistantRoundComplete?: (content: string, toolCalls: ToolCall[]) => void;
  // ✅ NOUVEAU : Callback pour info modèle (debug)
  onModelInfo?: (modelInfo: {
    original: string;
    current: string;
    wasOverridden: boolean;
    reasons: string[];
  }) => void;
}

interface UseChatResponseReturn {
  isProcessing: boolean;
  sendMessage: (
    message: string | MessageContent,
    sessionId: string,
    context?: Record<string, unknown> | LLMContextForOrchestrator,
    history?: ChatMessage[],
    token?: string
  ) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

export function useChatResponse(options: UseChatResponseOptions = {}): UseChatResponseReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<Set<string>>(new Set());

  // AbortController for cancelling in-flight streaming requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // ✅ NOUVEAU: Service pour orchestrer le streaming
  const orchestratorRef = useRef<StreamOrchestrator | null>(null);
  
  // Initialiser l'orchestrator (singleton)
  if (!orchestratorRef.current) {
    orchestratorRef.current = new StreamOrchestrator();
  }

  const { 
    onComplete, 
    onError, 
    onToolCalls, 
    onToolResult, 
    onToolExecutionComplete,
    onStreamChunk,
    onStreamStart,
    onStreamEnd,
    onToolExecution,
    onPlanUpdate,
    useStreaming = false,
    onAssistantRoundComplete,
  } = options;

  const sendMessage = useCallback(async (message: string | MessageContent, sessionId: string, context?: Record<string, unknown> | LLMContextForOrchestrator, history?: ChatMessage[], token?: string) => {
    try {
      // Extraire un aperçu du message pour le logging
      const messagePreview = typeof message === 'string' 
        ? message.substring(0, 50) + '...'
        : `[Multi-modal: ${message.length} parts]`;
      
      logger.dev('[useChatResponse] 🎯 sendMessage appelé:', {
        message: messagePreview,
        isMultiModal: typeof message !== 'string',
        sessionId,
        hasContext: !!context,
        historyLength: history?.length || 0,
        hasToken: !!token,
        useStreaming
      });

      setIsProcessing(true);

      // Cancel any previous in-flight request
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      // Ajouter le token d'authentification si fourni
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // ✅ REFACTORÉ : Mode streaming délégué au StreamOrchestrator
      if (useStreaming) {
        logger.dev('[useChatResponse] 🌊 Mode streaming activé');

        const skipAddingUserMessage =
          context && typeof context === 'object' && 'skipAddingUserMessage' in context
            ? Boolean((context as { skipAddingUserMessage?: unknown }).skipAddingUserMessage)
            : false;
        
        // ✅ RETRY AUTOMATIQUE : Exécuter le fetch avec retry pour erreurs réseau récupérables
        const response = await networkRetryService.executeWithRetry(
          async () => {
            const fetchResponse = await fetch('/api/chat/llm/stream', {
              method: 'POST',
              headers,
              signal: abortController.signal,
              body: JSON.stringify({
                message,
                context: {
                  ...(context || { sessionId }),
                  reasoningOverride: (context && typeof context === 'object' && 'reasoningOverride' in context)
                    ? (context as { reasoningOverride?: 'advanced' | 'general' | 'fast' | null }).reasoningOverride
                    : null
                }, 
                history: history || [],
                sessionId,
                skipAddingUserMessage
              })
            });

            if (!fetchResponse.ok) {
              const errorData = (await fetchResponse.json().catch(() => ({}))) as { error?: string };
              const message =
                typeof errorData?.error === 'string'
                  ? errorData.error
                  : `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`;
              const error = networkRetryService.createNetworkError(
                fetchResponse,
                new Error(message)
              );
              throw error;
            }

            return fetchResponse;
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
            backoffMultiplier: 2,
            maxDelay: 10000,
            operationName: 'stream-llm-request'
          }
        );

        // ✅ Déléguer au StreamOrchestrator
        const orchestrator = orchestratorRef.current!;
        orchestrator.reset(); // Reset pour nouveau stream
        
        const streamResult = await orchestrator.processStream(response, {
          onStreamStart,
          onStreamChunk,
          onStreamEnd,
          onToolCalls,
          onToolExecution,
          onToolResult,
          onComplete,
          onError,
          onModelInfo: options.onModelInfo,
          onPlanUpdate
        }, abortController.signal);

        // User-initiated abort: don't trigger error callbacks
        if (streamResult.aborted) {
          logger.dev('[useChatResponse] ⏹️ Stream aborted by user');
          return;
        }

        if (!streamResult.success && streamResult.errorAlreadyHandled) {
          return;
        }

        if (!streamResult.success && streamResult.error) {
          onError?.(streamResult.error);
          return;
        }

        return;
      }
      
      // ✅ MODE CLASSIQUE (sans streaming)
      logger.dev('[useChatResponse] 🚀 Envoi de la requête à l\'API LLM (mode classique)');
      
      // ✅ RETRY AUTOMATIQUE : Exécuter le fetch avec retry pour erreurs réseau récupérables
      const response = await networkRetryService.executeWithRetry(
        async () => {
          const fetchResponse = await fetch('/api/chat/llm', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              message,
              context: context || { sessionId }, 
              history: history || [],
              sessionId
            })
          });

          if (!fetchResponse.ok) {
            const errorData = (await fetchResponse.json().catch(() => ({}))) as { error?: string };
            const message =
              typeof errorData?.error === 'string'
                ? errorData.error
                : `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`;
            const error = networkRetryService.createNetworkError(
              fetchResponse,
              new Error(message)
            );
            throw error;
          }

          return fetchResponse;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          backoffMultiplier: 2,
          maxDelay: 10000,
          operationName: 'llm-request'
        }
      );

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
            data.tool_results || [],
            undefined // Pas de timeline en mode classique (non-streaming)
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
      // User-initiated abort: silently swallow
      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.dev('[useChatResponse] ⏹️ Fetch aborted by user');
        return;
      }

      let errorMessage: string;
      let errorDetails: string | StreamErrorDetails | undefined;
      
      if (error instanceof Error) {
        const networkError = error as NetworkError;
        
        if (networkError.isRecoverable !== undefined) {
          errorMessage = networkError.isRecoverable
            ? `Erreur réseau après plusieurs tentatives : ${networkError.message}`
            : networkError.message;
          
          if (networkError.statusCode) {
            errorDetails = {
              error: errorMessage,
              statusCode: networkError.statusCode,
              errorCode: networkError.errorType,
              timestamp: Date.now(),
              recoverable: networkError.isRecoverable
            };
          }
        } else {
          errorMessage = error.message;
        }
        
        logger.error('[useChatResponse] ❌ Erreur:', {
          message: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          isNetworkError: networkError.isRecoverable !== undefined,
          recoverable: networkError.isRecoverable
        });
      } else if (typeof error === 'string') {
        errorMessage = error;
        logger.error('[useChatResponse] ❌ Erreur:', { error });
      } else {
        errorMessage = 'Erreur inconnue';
        logger.error('[useChatResponse] ❌ Erreur:', { error: String(error) });
      }
      
      if (errorDetails) {
        onError?.(errorDetails);
      } else {
        onError?.(errorMessage);
      }
    } finally {
      abortControllerRef.current = null;
      setIsProcessing(false);
    }
  }, [onComplete, onError, onToolCalls, onToolResult, onToolExecutionComplete, onStreamChunk, onStreamStart, onStreamEnd, onToolExecution, onPlanUpdate, useStreaming, onAssistantRoundComplete]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      logger.dev('[useChatResponse] ⏹️ User abort requested');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setPendingToolCalls(new Set());
  }, []);

  return {
    isProcessing,
    sendMessage,
    abort,
    reset
  };
} 