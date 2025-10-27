import { useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';
import { StreamTimeline, StreamTimelineItem } from '@/types/streamTimeline';
import type { ToolCall, ToolResult } from '@/hooks/useChatHandlers';
import type { ChatMessage } from '@/types/chat';
import type { MessageContent } from '@/types/image';

interface UseChatResponseOptions {
  onComplete?: (
    fullContent: string, 
    fullReasoning: string, 
    toolCalls?: ToolCall[], 
    toolResults?: ToolResult[],
    streamTimeline?: StreamTimeline // ✅ NOUVEAU: Timeline capturée du stream
  ) => void;
  onError?: (error: string) => void;
  onToolCalls?: (toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>, toolName: string) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: Array<{ name: string; result: unknown; success: boolean; tool_call_id: string }>) => void;
  // ✅ NOUVEAU : Callbacks pour streaming
  onStreamChunk?: (content: string) => void;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onToolExecution?: (toolCount: number, toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>) => void; // ✅ Quand les tools commencent à s'exécuter
  useStreaming?: boolean; // Activer/désactiver le streaming
  onAssistantRoundComplete?: (content: string, toolCalls: ToolCall[]) => void; // ✅ NOUVEAU
}

interface UseChatResponseReturn {
  isProcessing: boolean;
  sendMessage: (message: string | MessageContent, sessionId: string, context?: Record<string, unknown>, history?: ChatMessage[], token?: string) => Promise<void>;
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
    onToolExecution,
    useStreaming = false, // ✅ Désactivé par défaut pour compatibilité
    onAssistantRoundComplete, // ✅ NOUVEAU: Pour persister chaque round
  } = options;

  const sendMessage = useCallback(async (message: string | MessageContent, sessionId: string, context?: Record<string, unknown>, history?: ChatMessage[], token?: string) => {
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
            sessionId,
            // ✅ Passer skipAddingUserMessage si présent dans le contexte
            skipAddingUserMessage: context?.skipAddingUserMessage || false
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
        let currentRoundContent = ''; // ✅ Content du round actuel seulement
        let currentRoundReasoning = ''; // ✅ Reasoning du round actuel
        let currentRoundToolCalls = new Map<string, ToolCall>(); // ✅ Map pour le round actuel
        const allNotifiedToolCallIds = new Set<string>(); // ✅ Track pour éviter re-notifications
        const executionNotifiedToolCallIds = new Set<string>(); // ✅ Track des tool calls déjà notifiés pour exécution
        
        // ✅ NOUVEAU: Collections globales pour tous les tool calls/results du cycle complet
        const allToolCalls = new Map<string, ToolCall>(); // Tous les tool calls de tous les rounds
        const allToolResults: Array<{
          tool_call_id: string;
          name: string;
          content: string;
          success: boolean;
        }> = []; // Tous les tool results
        
        // ✅ NOUVEAU : Accumulateur global pour TOUT le contenu
        let allContent = '';
        
        // ✅ CORRECTION : Pour éviter les hallucinations, on va réinitialiser allContent
        // après chaque tool execution pour ne garder QUE le contenu post-tool
        
        // ✅ NOUVEAU: Timeline pour capturer l'ordre exact des événements
        const streamTimeline: StreamTimelineItem[] = [];
        const streamStartTime = Date.now();
        let currentRoundNumber = 0;

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
                  // Content progressif du round actuel
                  if (chunk.content) {
                    // ✅ Si on reçoit du content juste après tool_execution, c'est un nouveau round
                    // On doit REMPLACER le content au lieu d'accumuler
                    if (chunk.content && currentRoundToolCalls.size === 0) {
                      // Probablement un nouveau round après exécution tools
                      // Mais on garde l'accumulation pour le streaming normal
                    }
                    
                    currentRoundContent += chunk.content;
                    // ✅ NOUVEAU : Accumuler TOUT le contenu globalement
                    allContent += chunk.content;
                  onStreamChunk?.(chunk.content);
                  
                  // ✅ NOUVEAU: Ajouter/mettre à jour l'événement text dans la timeline
                  // On fusionne les chunks delta en un seul événement text par round
                  const lastEvent = streamTimeline[streamTimeline.length - 1];
                  if (lastEvent && lastEvent.type === 'text' && lastEvent.roundNumber === currentRoundNumber) {
                    // Fusionner avec l'événement text existant du même round
                    lastEvent.content += chunk.content;
                  } else {
                    // Créer un nouvel événement text
                    streamTimeline.push({
                      type: 'text',
                      content: chunk.content,
                      timestamp: Date.now() - streamStartTime,
                      roundNumber: currentRoundNumber
                    });
                  }
                }

                // Reasoning du round actuel
                if (chunk.reasoning) {
                  currentRoundReasoning += chunk.reasoning;
                }

                // ✅ Tool calls avec déduplication par ID
                if (chunk.tool_calls && Array.isArray(chunk.tool_calls)) {
                  for (const tc of chunk.tool_calls) {
                    if (!currentRoundToolCalls.has(tc.id)) {
                      // Nouveau tool call
                      const toolCall = {
                        id: tc.id,
                        type: tc.type || 'function',
                        function: {
                          name: tc.function?.name || '',
                          arguments: tc.function?.arguments || ''
                        }
                      };
                      currentRoundToolCalls.set(tc.id, toolCall);
                      allToolCalls.set(tc.id, toolCall); // ✅ NOUVEAU: Ajouter au Map global
                    } else {
                      // Accumuler arguments progressifs (streaming)
                      const existing = currentRoundToolCalls.get(tc.id);
                      if (tc.function?.name) existing.function.name = tc.function.name;
                      if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                      
                      // ✅ NOUVEAU: Mettre à jour aussi dans le Map global
                      const globalExisting = allToolCalls.get(tc.id);
                      if (globalExisting) {
                        if (tc.function?.name) globalExisting.function.name = tc.function.name;
                        if (tc.function?.arguments) globalExisting.function.arguments += tc.function.arguments;
                      }
                    }
                  }
                }
              }
              
              // ✅ Gérer tool_execution : notifier et réinitialiser pour le prochain round
              if (chunk.type === 'tool_execution') {
                logger.dev(`[useChatResponse] 🔧 Exécution de ${chunk.toolCount || 0} tools...`);
                
                // ✅ CORRIGÉ: Utiliser allToolCalls au lieu de currentRoundToolCalls
                // car les tool_calls arrivent peut-être dans des chunks après tool_execution
                const toolCallsToNotify = Array.from(allToolCalls.values()).filter(
                  tc => !allNotifiedToolCallIds.has(tc.id)
                );
                
                if (toolCallsToNotify.length > 0) {
                  onToolCalls?.(toolCallsToNotify, 'stream');
                  // Marquer comme notifiés
                  toolCallsToNotify.forEach(tc => allNotifiedToolCallIds.add(tc.id));
                }
                
                // ✅ CORRIGÉ : Prendre les nouveaux tool calls depuis allToolCalls
                // On filtre ceux qui n'ont pas encore été notifiés pour exécution
                const newToolCallsForExecution = Array.from(allToolCalls.values())
                  .filter(tc => !executionNotifiedToolCallIds.has(tc.id));
                
                const toolCallsSnapshot = newToolCallsForExecution.map(tc => ({
                  id: tc.id,
                  type: tc.type,
                  function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments
                  }
                }));
                
                // ✅ Marquer ces tool calls comme notifiés pour exécution
                newToolCallsForExecution.forEach(tc => executionNotifiedToolCallIds.add(tc.id));
                
                // ✅ Notifier début d'exécution avec les tool calls
                onToolExecution?.(chunk.toolCount || 0, toolCallsSnapshot);
                
                logger.dev(`[useChatResponse] 📋 Tool execution capturé pour timeline:`, {
                  toolCount: toolCallsSnapshot.length,
                  toolNames: toolCallsSnapshot.map(tc => tc.function.name),
                  allToolCallsSize: allToolCalls.size,
                  newToolCallsCount: newToolCallsForExecution.length,
                  executionNotifiedCount: executionNotifiedToolCallIds.size
                });
                
                streamTimeline.push({
                  type: 'tool_execution',
                  toolCalls: toolCallsSnapshot,
                  toolCount: chunk.toolCount || toolCallsSnapshot.length,
                  timestamp: Date.now() - streamStartTime,
                  roundNumber: currentRoundNumber
                });
                
                // Passer au prochain round
                currentRoundNumber++;
                
                // ✅ NE PAS réinitialiser ici - le prochain delta va écraser
                currentRoundToolCalls.clear();
              }
              
              if (chunk.type === 'tool_result') {
                logger.dev(`[useChatResponse] ✅ Tool result: ${chunk.toolName}`);
                
                // ✅ NOUVEAU: Collecter le tool result
                const toolResult = {
                  tool_call_id: chunk.toolCallId || `call_${Date.now()}`,
                  name: chunk.toolName || 'unknown_tool',
                  content: typeof chunk.result === 'string' ? chunk.result : JSON.stringify(chunk.result || {}),
                  success: chunk.success || false
                };
                allToolResults.push(toolResult);
                
                // ✅ NOUVEAU: Ajouter l'événement tool_result à la timeline
                streamTimeline.push({
                  type: 'tool_result',
                  toolCallId: chunk.toolCallId || `call_${Date.now()}`,
                  toolName: chunk.toolName || 'unknown_tool',
                  result: chunk.result,
                  success: chunk.success || false,
                  timestamp: Date.now() - streamStartTime
                });
                
                onToolResult?.(chunk.toolName || '', chunk, chunk.success || false, chunk.toolCallId);
              }

              // ✅ NOUVEAU: Gérer la fin d'un round assistant
              if (chunk.type === 'assistant_round_complete') {
                logger.dev(`[useChatResponse] 🔵 Round terminé: ${chunk.finishReason}`);
                if (onAssistantRoundComplete && (chunk.content || (chunk.tool_calls && chunk.tool_calls.length > 0))) {
                  onAssistantRoundComplete(chunk.content || '', chunk.tool_calls || []);
                }
                // Réinitialiser le contenu pour le prochain round potentiel
                currentRoundContent = '';
                currentRoundToolCalls.clear();
              }

              if (chunk.type === 'done') {
                logger.dev('[useChatResponse] 🏁 Stream [DONE]', {
                  contentLength: currentRoundContent.length,
                  toolCallsCount: allToolCalls.size,
                  toolResultsCount: allToolResults.length,
                  timelineEvents: streamTimeline.length
                });
                onStreamEnd?.();
                // ✅ CORRIGÉ: Passer TOUS les tool calls, results ET la timeline
                const finalTimeline: StreamTimeline = {
                  items: streamTimeline,
                  startTime: streamStartTime,
                  endTime: Date.now()
                };
                onComplete?.(
                  allContent, // ✅ CORRIGÉ: Utiliser TOUT le contenu au lieu du round actuel
                  currentRoundReasoning, 
                  Array.from(allToolCalls.values()), // Tous les tool calls du cycle
                  allToolResults, // Tous les résultats collectés
                  finalTimeline // ✅ NOUVEAU: Timeline complète
                );
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
  }, [onComplete, onError, onToolCalls, onToolResult, onToolExecutionComplete, onStreamChunk, onStreamStart, onStreamEnd, onToolExecution, useStreaming, onAssistantRoundComplete]);

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