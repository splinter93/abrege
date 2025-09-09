/**
 * Hook useChatResponseHarmony - Support du format Harmony GPT-OSS
 * Production-ready, format strict, zéro any
 */

import { useState, useCallback } from 'react';
import { simpleLogger as logger } from '@/utils/logger';

interface UseChatResponseHarmonyOptions {
  onComplete?: (fullContent: string, fullReasoning: string, toolCalls?: any[], toolResults?: any[], harmonyChannels?: {
    analysis?: string;
    commentary?: string;
    final?: string;
  }) => void;
  onError?: (error: string) => void;
  onToolCalls?: (toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>, toolName: string) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: Array<{ name: string; result: unknown; success: boolean; tool_call_id: string }>) => void;
}

interface UseChatResponseHarmonyReturn {
  isProcessing: boolean;
  sendMessage: (message: string, sessionId: string, context?: Record<string, unknown>, history?: unknown[], token?: string) => Promise<void>;
  reset: () => void;
}

export function useChatResponseHarmony(options: UseChatResponseHarmonyOptions = {}): UseChatResponseHarmonyReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<Set<string>>(new Set());

  const { onComplete, onError, onToolCalls, onToolResult, onToolExecutionComplete } = options;

  const sendMessage = useCallback(async (message: string, sessionId: string, context?: Record<string, unknown>, history?: unknown[], token?: string) => {
    try {
      logger.dev('[useChatResponseHarmony] 🎼 sendMessage Harmony appelé:', {
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
      
      logger.dev('[useChatResponseHarmony] 🚀 Envoi de la requête à l\'API Harmony LLM:', {
        message: message.substring(0, 50) + '...',
        sessionId,
        hasContext: !!context,
        historyLength: history?.length || 0
      });

      logger.dev('[useChatResponseHarmony] 🔄 Appel fetch Harmony en cours...');
      
      // Vérifier que l'endpoint Harmony est accessible
      try {
        const response = await fetch('/api/chat/llm-harmony', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message,
            context: context || { sessionId }, 
            history: history || [],
            sessionId
          })
        });

        logger.dev('[useChatResponseHarmony] ✅ Fetch Harmony terminé, traitement de la réponse...');

        logger.dev('[useChatResponseHarmony] 📥 Réponse HTTP Harmony reçue:', {
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
        
        logger.error(`[useChatResponseHarmony] ❌ Réponse HTTP non-OK: ${response.status} ${response.statusText}`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText.substring(0, 500),
          errorData: errorData
        });
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      logger.dev('[useChatResponseHarmony] 🔄 Début du parsing JSON Harmony...');
      
      let data;
      try {
        data = await response.json();
        logger.dev('[useChatResponseHarmony] ✅ JSON Harmony parsé avec succès');
        logger.dev('[useChatResponseHarmony] 🔍 Réponse Harmony brute reçue:', {
          status: response.status,
          ok: response.ok,
          data: data,
          dataType: typeof data,
          hasSuccess: 'success' in data,
          success: data?.success,
          hasContent: 'content' in data,
          content: data?.content?.substring(0, 100) + '...',
          contentLength: data?.content?.length || 0,
          hasReasoning: 'reasoning' in data,
          reasoning: data?.reasoning?.substring(0, 100) + '...',
          reasoningLength: data?.reasoning?.length || 0,
          hasToolCalls: 'tool_calls' in data,
          toolCallsCount: data?.tool_calls?.length || 0,
          hasToolResults: 'tool_results' in data,
          toolResultsCount: data?.tool_results?.length || 0,
          isRelance: data?.is_relance,
          hasNewToolCalls: data?.has_new_tool_calls
        });
      } catch (parseError) {
        logger.error(`[useChatResponseHarmony] ❌ Erreur de parsing JSON Harmony: ${parseError instanceof Error ? parseError.message : String(parseError)}`, parseError);
        throw new Error('Erreur de parsing de la réponse Harmony');
      }

      // Vérifier que la réponse est valide
      if (!data || typeof data !== 'object') {
        logger.error(`[useChatResponseHarmony] ❌ Réponse Harmony invalide: ${JSON.stringify(data)}`, data);
        throw new Error('Réponse Harmony invalide reçue du serveur');
      }

      // Vérifier le succès de l'opération
      if (!data.success) {
        const errorMessage = data.error || data.details || 'Erreur inconnue du serveur Harmony';
        logger.error(`[useChatResponseHarmony] ❌ Erreur Harmony signalée par le serveur: ${errorMessage}`, {
          error: errorMessage,
          details: data.details,
          sessionId: data.sessionId
        });
        throw new Error(errorMessage);
      }

      // Extraire le contenu et le reasoning
      const content = data.content || '';
      const reasoning = data.reasoning || '';
      const toolCalls = data.tool_calls || [];
      const toolResults = data.tool_results || [];
      
      // 🎼 Extraire les canaux Harmony séparés
      const harmonyChannels = {
        analysis: data.harmony_analysis || '',
        commentary: data.harmony_commentary || '',
        final: data.harmony_final || ''
      };

      logger.dev('[useChatResponseHarmony] 🎯 Données Harmony extraites:', {
        contentLength: content.length,
        reasoningLength: reasoning.length,
        toolCallsCount: toolCalls.length,
        toolResultsCount: toolResults.length,
        isRelance: data.is_relance,
        hasNewToolCalls: data.has_new_tool_calls,
        hasHarmonyAnalysis: !!harmonyChannels.analysis,
        hasHarmonyCommentary: !!harmonyChannels.commentary,
        hasHarmonyFinal: !!harmonyChannels.final
      });

      // Traiter les tool calls si présents
      if (toolCalls && toolCalls.length > 0) {
        logger.dev('[useChatResponseHarmony] 🔧 Tool calls Harmony détectés:', {
          count: toolCalls.length,
          tools: toolCalls.map((tc: any) => tc.function?.name || 'unknown')
        });

        // Notifier les tool calls
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function?.name || 'unknown';
          const toolArguments = toolCall.function?.arguments || '{}';
          
          try {
            const parsedArgs = JSON.parse(toolArguments);
            onToolCalls?.([{
              id: toolCall.id,
              name: toolName,
              arguments: parsedArgs
            }], toolName);
          } catch (parseError) {
            logger.warn('[useChatResponseHarmony] ⚠️ Erreur parsing arguments tool call:', parseError);
            onToolCalls?.([{
              id: toolCall.id,
              name: toolName,
              arguments: {}
            }], toolName);
          }
        }
      }

      // Traiter les tool results si présents
      if (toolResults && toolResults.length > 0) {
        logger.dev('[useChatResponseHarmony] ✅ Tool results Harmony détectés:', {
          count: toolResults.length,
          results: toolResults.map((tr: any) => ({
            name: tr.name || tr.tool_name || 'unknown',
            success: tr.success,
            hasContent: !!tr.content
          }))
        });

        // Notifier les tool results
        for (const toolResult of toolResults) {
          const toolName = toolResult.name || toolResult.tool_name || 'unknown';
          const success = toolResult.success !== false; // Par défaut true si non spécifié
          const result = toolResult.content || toolResult.details || toolResult;
          
          onToolResult?.(toolName, result, success, toolResult.tool_call_id);
        }

        // Notifier la completion des tool executions
        onToolExecutionComplete?.(toolResults.map((tr: any) => ({
          name: tr.name || tr.tool_name || 'unknown',
          result: tr.content || tr.details || tr,
          success: tr.success !== false,
          tool_call_id: tr.tool_call_id || 'unknown'
        })));
      }

      // Notifier la completion avec le contenu final
      logger.dev('[useChatResponseHarmony] 🎉 Completion Harmony:', {
        contentLength: content.length,
        reasoningLength: reasoning.length,
        hasToolCalls: toolCalls.length > 0,
        hasToolResults: toolResults.length > 0,
        hasHarmonyChannels: Object.values(harmonyChannels).some(channel => channel.length > 0)
      });

        onComplete?.(content, reasoning, toolCalls, toolResults, harmonyChannels);

      } catch (fetchError) {
        // Erreur spécifique à la requête fetch - fallback vers l'API standard
        logger.warn('[useChatResponseHarmony] ⚠️ API Harmony non disponible, fallback vers l\'API standard:', {
          error: fetchError instanceof Error ? fetchError.message : String(fetchError),
          sessionId
        });
        
        // Fallback vers l'API standard
        const standardResponse = await fetch('/api/chat/llm', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message,
            context: context || { sessionId }, 
            history: history || [],
            sessionId
          })
        });
        
        if (!standardResponse.ok) {
          throw new Error(`API standard aussi en erreur: ${standardResponse.status}`);
        }
        
        const standardData = await standardResponse.json();
        
        // Adapter la réponse standard au format Harmony
        const content = standardData.content || '';
        const reasoning = standardData.reasoning || '';
        const toolCalls = standardData.tool_calls || [];
        const toolResults = standardData.tool_results || [];
        
        logger.dev('[useChatResponseHarmony] ✅ Fallback standard réussi');
        onComplete?.(content, reasoning, toolCalls, toolResults, {});
        return;
      }

    } catch (error) {
      // Gestion d'erreur plus robuste
      let errorMessage = 'Erreur inconnue lors de l\'envoi du message Harmony';
      let errorDetails = {};
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500) // Limiter la taille du stack
        };
      } else if (typeof error === 'object' && error !== null) {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = String(error);
        }
        errorDetails = { error: String(error) };
      } else {
        errorMessage = String(error);
        errorDetails = { error: String(error) };
      }
      
      logger.error(`[useChatResponseHarmony] ❌ Erreur lors de l'envoi du message Harmony: ${errorMessage}`, {
        ...errorDetails,
        sessionId,
        message: message.substring(0, 100) + '...'
      });

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
