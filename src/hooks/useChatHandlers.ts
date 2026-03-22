/**
 * Hook centralisé pour tous les handlers du chat
 * Extrait la logique complexe de ChatFullscreenV2
 */

import { useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuthGuard } from './useAuthGuard';
import { simpleLogger as logger } from '@/utils/logger';
import type { StreamTimeline } from '@/types/streamTimeline';
import type { ChatMessage } from '@/types/chat';
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
  /**
   * Extension custom pour MCP tools exécutés par x.ai
   * Indique si le tool call a déjà été exécuté côté MCP
   */
  alreadyExecuted?: boolean;
  /**
   * Extension custom pour MCP tools exécutés par x.ai
   * Résultat de l'exécution si déjà exécuté
   */
  result?: string;
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
  onComplete?: (
    fullContent: string,
    fullReasoning: string,
    toolCalls?: ToolCall[],
    toolResults?: ToolResult[],
    streamTimeline?: StreamTimeline,
    persistedMessage?: ChatMessage | null
  ) => void | Promise<void>;
  /** Appelé avec le contenu final (texte lu) après persistance — ex. pour TTS mode vocal */
  onMessageFinalContent?: (content: string) => void;
  onError?: (error: string | StreamErrorDetails) => void;
  onToolCalls?: (toolCalls: ToolCall[], toolName: string) => void;
  onToolResult?: (toolName: string, result: unknown, success: boolean, toolCallId?: string) => void;
  onToolExecutionComplete?: (toolResults: ToolResult[]) => void;
  /** Retourne l'operation_id de la bulle assistant en cours — pour déduplication Realtime echo */
  getAssistantOperationId?: () => string | null;
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

    // ✅ Mode vocal : déclencher le TTS immédiatement (avant persist) pour éviter tout blocage
    options.onMessageFinalContent?.(finalContent);
      
    // ✅ NETTOYER + ENRICHIR la timeline
    const cleanedTimeline = streamTimeline ? {
      ...streamTimeline,
      items: (() => {
        // ✅ DÉDUPLICATION: Supprimer les tool_execution en double (basé sur les IDs des tool calls)
        const seenToolCallIds = new Set<string>();
        const deduplicatedItems: typeof streamTimeline.items = [];
        
        for (const item of streamTimeline.items) {
          if (item.type === 'tool_result') {
            // Virer tool_result individuels (déjà géré par le filter)
            continue;
          }
          
          if (item.type === 'tool_execution') {
            // Vérifier si les tool calls de cet item sont déjà présents
            const itemToolCallIds = item.toolCalls.map(tc => tc.id);
            const hasDuplicates = itemToolCallIds.some(id => seenToolCallIds.has(id));
            
            if (hasDuplicates) {
              // Filtrer les tool calls déjà vus
              const newToolCalls = item.toolCalls.filter(tc => !seenToolCallIds.has(tc.id));
              
              if (newToolCalls.length === 0) {
                // Tous les tool calls sont déjà présents, skip cet item
                logger.dev('[useChatHandlers] 🔧 Tool execution en double détecté et supprimé:', {
                  toolCallIds: itemToolCallIds,
                  roundNumber: item.roundNumber
                });
                continue;
              }
              
              // Ajouter seulement les nouveaux tool calls
              itemToolCallIds.forEach(id => seenToolCallIds.add(id));
              deduplicatedItems.push({
                ...item,
                toolCalls: newToolCalls,
                toolCount: newToolCalls.length
              });
            } else {
              // Aucun doublon, ajouter l'item complet
              itemToolCallIds.forEach(id => seenToolCallIds.add(id));
              deduplicatedItems.push(item);
            }
          } else {
            // Items non tool_execution (text, etc.) - pas de déduplication nécessaire
            deduplicatedItems.push(item);
          }
        }
        
        // ✅ ENRICHIR tool_execution avec les résultats
        return deduplicatedItems.map(item => {
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
        });
      })()
    } : undefined;
    
    // ✅ FIX BUG RÉPÉTITION: Ne PAS persister tool_calls sur message final
    // Les tool_calls ont déjà été exécutés et leurs résultats sont dans tool_results
    // Si on persiste tool_calls, le LLM les voit au prochain message et les ré-exécute
    const assistantOperationId = options.getAssistantOperationId?.() ?? undefined;
    const messageToAdd = {
      role: 'assistant' as const,
      content: finalContent,
      reasoning: fullReasoning,
      // tool_calls: undefined, // ❌ Ne pas persister (déjà résolus)
      tool_results: toolResults || [], // ✅ Garder seulement les résultats
      stream_timeline: cleanedTimeline, // ✅ Timeline nettoyée (sans tool_result individuels)
      timestamp: new Date().toISOString(),
      ...(assistantOperationId ? { operation_id: assistantOperationId } : {})
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
    
    const persistedMessage = await addMessage(messageToAdd, {
      persist: true, 
      updateExisting: true
    });

    // ✅ CRITIQUE: Passer la cleanedTimeline enrichie (pas l'originale)
    await options.onComplete?.(
      fullContent,
      fullReasoning,
      toolCalls,
      toolResults,
      cleanedTimeline,
      persistedMessage
    );
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
    
    // ✅ SOLUTION SIMPLE : Mettre à jour le store Zustand après applyContentOperations
    if (toolName === 'scrivia__applyContentOperations' && success && result) {
      try {
        // ✅ INTERFACE EXPLICITE : Type strict pour le résultat du tool
        interface ApplyContentOperationsResult {
          data?: {
            note_id?: string;
          };
          note_id?: string;
        }
        
        // ✅ VALIDATION STRICTE : Parser avec type guard
        let parsedResult: ApplyContentOperationsResult | null = null;
        
        if (typeof result === 'string') {
          try {
            const parsed = JSON.parse(result);
            // Type guard : vérifier structure minimale
            if (parsed && typeof parsed === 'object') {
              parsedResult = parsed as ApplyContentOperationsResult;
            }
          } catch (parseError) {
            logger.warn('[useChatHandlers] ⚠️ Erreur parsing JSON tool result', {
              error: parseError instanceof Error ? parseError.message : String(parseError),
              resultPreview: result.substring(0, 100)
            });
            return; // Sortir si JSON invalide
          }
        } else if (result && typeof result === 'object') {
          parsedResult = result as ApplyContentOperationsResult;
        }
        
        if (!parsedResult) {
          logger.warn('[useChatHandlers] ⚠️ Tool result invalide (pas un objet)', {
            resultType: typeof result
          });
          return;
        }
        
        // ✅ ACCÈS SÉCURISÉ : Type safety garantie
        const noteId = parsedResult.data?.note_id || parsedResult.note_id;
        if (noteId) {
          // ✅ Récupérer directement la note mise à jour au lieu du polling
          // Le polling récupère toutes les notes récentes et peut écraser avec des données incomplètes
          try {
            // Récupérer le token depuis localStorage (même méthode que useEditorStreamListener)
            let token: string | null = null;
            try {
              const supabaseAuth = localStorage.getItem('sb-localhost-auth-token');
              if (supabaseAuth) {
                const parsed = JSON.parse(supabaseAuth);
                if (parsed.access_token) {
                  token = parsed.access_token;
                }
              }
              if (!token) {
                const keys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
                for (const key of keys) {
                  const data = JSON.parse(localStorage.getItem(key) || '{}');
                  if (data.access_token) {
                    token = data.access_token;
                    break;
                  }
                }
              }
            } catch (tokenError) {
              logger.warn('[useChatHandlers] ⚠️ Erreur récupération token', { noteId, error: tokenError });
            }
            
            if (!token) {
              logger.warn('[useChatHandlers] ⚠️ Pas de token pour récupérer la note', { noteId });
              return;
            }
            
            // Attendre un peu pour que la DB soit mise à jour (100ms)
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Récupérer la note mise à jour directement
            const response = await fetch(`/api/v2/note/${noteId}?fields=content`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.note) {
                // Mettre à jour le store directement
                const { useFileSystemStore } = await import('@/store/useFileSystemStore');
                const store = useFileSystemStore.getState();
                store.updateNote(noteId, {
                  markdown_content: data.note.markdown_content || data.note.content || ''
                });
                
                logger.info('[useChatHandlers] ✅ Store mis à jour directement après applyContentOperations', { 
                  noteId,
                  contentLength: data.note.markdown_content?.length || 0
                });
              }
            } else {
              logger.warn('[useChatHandlers] ⚠️ Erreur récupération note après applyContentOperations', {
                noteId,
                status: response.status
              });
            }
          } catch (fetchError) {
            logger.warn('[useChatHandlers] ⚠️ Erreur fetch note après applyContentOperations', {
              noteId,
              error: fetchError instanceof Error ? fetchError.message : 'Unknown error'
            });
          }
        }
      } catch (error) {
        logger.warn('[useChatHandlers] ⚠️ Erreur mise à jour store après applyContentOperations', error);
      }
    }
    
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

