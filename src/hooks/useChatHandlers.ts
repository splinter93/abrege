/**
 * Hook centralisé pour tous les handlers du chat
 * Extrait la logique complexe de ChatFullscreenV2
 */

import { useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthGuard } from './useAuthGuard';
import { simpleLogger as logger } from '@/utils/logger';
import type { StreamTimeline } from '@/types/streamTimeline';
import type { StreamErrorDetails } from '@/services/streaming/StreamOrchestrator';

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
  onComplete?: (fullContent: string, fullReasoning: string, toolCalls?: ToolCall[], toolResults?: ToolResult[], streamTimeline?: StreamTimeline) => void;
  onError?: (error: string | StreamErrorDetails) => void;
  onToolCalls?: (toolCalls: ToolCall[], toolName: string) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: ToolResult[]) => void;
}

interface ChatHandlersReturn {
  handleComplete: (fullContent: string, fullReasoning: string, toolCalls?: ToolCall[], toolResults?: ToolResult[], streamTimeline?: StreamTimeline) => Promise<void>;
  handleError: (error: string | StreamErrorDetails) => void;
  handleToolCalls: (toolCalls: ToolCall[], toolName: string, roundContent?: string) => Promise<void>;
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
    toolResults?: ToolResult[],
    streamTimeline?: StreamTimeline
  ) => {
    if (!requireAuth()) return;

    // ✅ DEBUG : Logger l'état de la timeline
    logger.dev('[useChatHandlers] 📥 handleComplete appelé:', {
      contentLength: fullContent?.length || 0,
      hasTimeline: !!streamTimeline,
      timelineItemsCount: streamTimeline?.items?.length || 0,
      toolCallsCount: toolCalls?.length || 0,
      toolResultsCount: toolResults?.length || 0
    });

    // ✅ NOUVEAU : Reconstituer le contenu complet depuis la timeline
    let finalContent = fullContent?.trim();
    
    if (streamTimeline && streamTimeline.items.length > 0) {
      // ✅ CORRECTION : Ne prendre QUE le dernier event "text" (après tous les tools)
      // pour éviter les hallucinations du LLM avant l'exécution des tools
      const textEvents = streamTimeline.items.filter(item => item.type === 'text');
      
      if (textEvents.length > 0) {
        // ✅ STRATÉGIE : Si plusieurs events text, prendre SEULEMENT le dernier
        // (celui qui suit les tool_results et qui utilise les vrais résultats)
        const hasToolExecution = streamTimeline.items.some(item => item.type === 'tool_execution');
        
        if (hasToolExecution && textEvents.length > 1) {
          // Il y a des tools ET plusieurs rounds de texte
          // → Prendre UNIQUEMENT le dernier round (après tools)
          finalContent = textEvents[textEvents.length - 1].content;
          logger.info('[useChatHandlers] 🎯 Contenu du DERNIER round utilisé (évite hallucinations):', {
            totalRounds: textEvents.length,
            lastRoundLength: finalContent.length
          });
        } else {
          // Pas de tools ou un seul round → utiliser tout
          finalContent = textEvents.map(event => event.content).join('');
          logger.dev('[useChatHandlers] 🔄 Contenu complet reconstitué:', {
            textEventsCount: textEvents.length,
            reconstructedLength: finalContent.length
          });
        }
      }
    }
    
    if (!finalContent) {
      logger.warn('[useChatHandlers] ⚠️ Contenu vide, pas de message à ajouter');
      return;
    }
      
    // ✅ NETTOYER + ENRICHIR la timeline
    const cleanedTimeline = streamTimeline ? {
      ...streamTimeline,
      items: streamTimeline.items
        .filter(item => item.type !== 'tool_result') // Virer tool_result individuels
        .map(item => {
          // ✅ ENRICHIR tool_execution avec les résultats
          if (item.type === 'tool_execution' && toolResults && toolResults.length > 0) {
            return {
              ...item,
              toolCalls: item.toolCalls.map(tc => {
                // Chercher le résultat correspondant
                const result = toolResults.find(tr => tr.tool_call_id === tc.id);
                if (result) {
                  return {
                    ...tc,
                    success: result.success,
                    result: result.content
                  };
                }
                return tc;
              })
            };
          }
          return item;
        })
    } : undefined;
    
    // ✅ FIX BUG RÉPÉTITION: Ne PAS persister tool_calls sur message final
    // Les tool_calls ont déjà été exécutés et leurs résultats sont dans tool_results
    // Si on persiste tool_calls, le LLM les voit au prochain message et les ré-exécute
    const messageToAdd = {
      role: 'assistant' as const,
      content: finalContent,
      reasoning: fullReasoning,
      // tool_calls: undefined, // ❌ Ne pas persister (déjà résolus)
      tool_results: toolResults || [], // ✅ Garder seulement les résultats
      stream_timeline: cleanedTimeline, // ✅ Timeline nettoyée (sans tool_result individuels)
      timestamp: new Date().toISOString()
    };

    logger.dev('[useChatHandlers] 📝 Ajout du message final complet avec timeline enrichie:', {
      hasTimeline: !!cleanedTimeline,
      originalTimelineEvents: streamTimeline?.items.length || 0,
      cleanedTimelineEvents: cleanedTimeline?.items.length || 0,
      removedToolResults: (streamTimeline?.items.length || 0) - (cleanedTimeline?.items.length || 0),
      itemTypes: cleanedTimeline?.items.map(i => i.type) || [],
      toolExecutionBlocks: cleanedTimeline?.items.filter(i => i.type === 'tool_execution').length || 0,
      toolCallsWithResults: cleanedTimeline?.items
        .filter(i => i.type === 'tool_execution')
        .flatMap(i => i.toolCalls)
        .filter(tc => tc.success !== undefined).length || 0,
      hasToolCalls: !!(toolCalls && toolCalls.length > 0),
      hasToolResults: !!(toolResults && toolResults.length > 0),
      contentLength: finalContent.length
    });
    
    await addMessage(messageToAdd, { 
      persist: true, 
      updateExisting: true
    });
    
    // ✅ CRITIQUE: Passer la cleanedTimeline enrichie (pas l'originale)
    options.onComplete?.(fullContent, fullReasoning, toolCalls, toolResults, cleanedTimeline);
  }, [requireAuth, addMessage, options]);

  const handleError = useCallback((error: string | StreamErrorDetails) => {
    if (!requireAuth()) return;

    // ✅ Extraire le message d'erreur (string ou object)
    const errorMessage = typeof error === 'string' ? error : error.error;

    // ✅ Ne PAS ajouter de message automatiquement
    // L'erreur sera affichée par StreamErrorDisplay dans l'UI
    logger.error('[useChatHandlers] ❌ Erreur stream reçue:', error);

    // ✅ Passer l'erreur complète au callback parent
    options.onError?.(error);
  }, [requireAuth, options.onError]);

  const handleToolCalls = useCallback(async (toolCalls: ToolCall[], toolName: string, roundContent?: string) => {
    if (!requireAuth()) {
      await addMessage({
        role: 'assistant',
        content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
        timestamp: new Date().toISOString()
      }, { persist: false });
      return;
    }

    logger.tool('[useChatHandlers] 🔧 Tool calls persistés pour le round:', { toolCalls, toolName, roundContent });
    
    const toolCallMessage = {
      role: 'assistant' as const,
      content: roundContent || 'Exécution des outils...', // Utilise le contenu du round s'il existe
      tool_calls: toolCalls,
      timestamp: new Date().toISOString(),
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

