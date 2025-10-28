/**
 * Hook pour gérer l'état du streaming de messages
 * Extrait de ChatFullscreenV2.tsx (états lignes 153-196)
 * 
 * Responsabilités:
 * - Grouper TOUS les états streaming
 * - Fournir actions atomiques
 * - Gérer la timeline progressive
 * - Tracker les tool calls du round actuel
 */

import { useState, useCallback } from 'react';
import type { StreamTimelineItem } from '@/types/streamTimeline';
import { simpleLogger as logger } from '@/utils/logger';

/**
 * Type pour un tool call
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
  success?: boolean;
  result?: string;
}

/**
 * État du streaming
 */
export type StreamingStateType = 'idle' | 'thinking' | 'executing';

/**
 * Interface du hook
 */
export interface UseStreamingStateReturn {
  // États
  streamingContent: string;
  isStreaming: boolean;
  streamingState: StreamingStateType;
  executingToolCount: number;
  currentToolName: string;
  currentRound: number;
  streamingTimeline: StreamTimelineItem[];
  streamStartTime: number;
  currentToolCalls: ToolCall[];
  
  // Actions
  startStreaming: () => void;
  updateContent: (chunk: string) => void;
  setStreamingState: (state: StreamingStateType) => void;
  addToolExecution: (toolCalls: ToolCall[], toolCount: number) => void;
  updateToolResult: (toolCallId: string, result: unknown, success: boolean) => void;
  endStreaming: () => void;
  reset: () => void;
}

/**
 * Hook pour gérer l'état du streaming
 * 
 * Groupe tous les états liés au streaming dans un seul hook
 * pour éviter la duplication et garantir la cohérence.
 * 
 * @returns État et actions du streaming
 */
export function useStreamingState(): UseStreamingStateReturn {
  // 🎯 États streaming
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingState, setStreamingStateInternal] = useState<StreamingStateType>('idle');
  const [executingToolCount, setExecutingToolCount] = useState(0);
  const [currentToolName, setCurrentToolName] = useState('');
  const [currentRound, setCurrentRound] = useState(0);
  const [streamingTimeline, setStreamingTimeline] = useState<StreamTimelineItem[]>([]);
  const [streamStartTime, setStreamStartTime] = useState(0);
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);

  /**
   * Démarre le streaming
   * Réinitialise tous les états
   */
  const startStreaming = useCallback(() => {
    setIsStreaming(true);
    setStreamingContent('');
    setCurrentRound(0);
    setStreamingStateInternal('thinking');
    setStreamingTimeline([]);
    setStreamStartTime(Date.now());
    setCurrentToolCalls([]);
    setExecutingToolCount(0);
    setCurrentToolName('');
    
    logger.dev('[useStreamingState] 🚀 Streaming démarré');
  }, []);

  /**
   * Met à jour le contenu streamé (chunk par chunk)
   * 
   * @param chunk - Nouveau chunk de texte
   */
  const updateContent = useCallback((chunk: string) => {
    setStreamingContent(prev => prev + chunk);
    
    // Mettre à jour la timeline
    setStreamingTimeline(prev => {
      const lastItem = prev[prev.length - 1];
      
      // Si le dernier élément est un texte du même round, fusionner
      if (lastItem && lastItem.type === 'text' && lastItem.roundNumber === currentRound) {
        return [
          ...prev.slice(0, -1),
          {
            ...lastItem,
            content: (lastItem.content || '') + chunk
          }
        ];
      }
      
      // Nouveau bloc de texte
      return [
        ...prev,
        {
          type: 'text' as const,
          content: chunk,
          roundNumber: currentRound,
          timestamp: Date.now() - streamStartTime
        }
      ];
    });
  }, [currentRound, streamStartTime]);

  /**
   * Change l'état du streaming
   * 
   * @param state - Nouvel état
   */
  const setStreamingState = useCallback((state: StreamingStateType) => {
    setStreamingStateInternal(state);
  }, []);

  /**
   * Ajoute une exécution de tools à la timeline
   * 
   * @param toolCalls - Tool calls à exécuter
   * @param toolCount - Nombre de tools
   */
  const addToolExecution = useCallback((toolCalls: ToolCall[], toolCount: number) => {
    setStreamingStateInternal('executing');
    setExecutingToolCount(toolCount);
    setCurrentRound(prev => prev + 1);
    
    // Stocker les tool calls pour affichage
    setCurrentToolCalls(toolCalls.map(tc => ({
      ...tc,
      success: undefined
    })));
    
    // Ajouter à la timeline
    setStreamingTimeline(prev => [
      ...prev,
      {
        type: 'tool_execution' as const,
        toolCalls: toolCalls.map(tc => ({
          ...tc,
          success: undefined,
          result: undefined
        })),
        toolCount,
        roundNumber: currentRound,
        timestamp: Date.now() - streamStartTime
      }
    ]);
    
    logger.dev('[useStreamingState] 🔧 Tool execution ajoutée:', {
      toolCount,
      currentRound,
      toolNames: toolCalls.map(tc => tc.function.name)
    });
  }, [currentRound, streamStartTime]);

  /**
   * Met à jour le résultat d'un tool call
   * 
   * @param toolCallId - ID du tool call
   * @param result - Résultat
   * @param success - Succès ou échec
   */
  const updateToolResult = useCallback((
    toolCallId: string,
    result: unknown,
    success: boolean
  ) => {
    // Mettre à jour dans currentToolCalls
    setCurrentToolCalls(prev => prev.map(tc =>
      tc.id === toolCallId
        ? {
            ...tc,
            success,
            result: typeof result === 'string' ? result : JSON.stringify(result)
          }
        : tc
    ));
    
    // Mettre à jour dans la timeline
    setStreamingTimeline(prev => prev.map(item => {
      if (item.type === 'tool_execution' && item.toolCalls) {
        return {
          ...item,
          toolCalls: item.toolCalls.map(tc => {
            if (tc.id === toolCallId) {
              return {
                ...tc,
                success,
                result: typeof result === 'string' ? result : JSON.stringify(result)
              };
            }
            return tc;
          })
        };
      }
      return item;
    }));
    
    logger.dev('[useStreamingState] ✅ Tool result mis à jour:', {
      toolCallId,
      success
    });
  }, []);

  /**
   * Termine le streaming
   */
  const endStreaming = useCallback(() => {
    setIsStreaming(false);
    setStreamingStateInternal('idle');
    
    logger.dev('[useStreamingState] 🏁 Streaming terminé:', {
      contentLength: streamingContent.length,
      timelineEvents: streamingTimeline.length,
      rounds: currentRound
    });
  }, [streamingContent.length, streamingTimeline.length, currentRound]);

  /**
   * Réinitialise complètement l'état
   */
  const reset = useCallback(() => {
    setStreamingContent('');
    setIsStreaming(false);
    setStreamingStateInternal('idle');
    setExecutingToolCount(0);
    setCurrentToolName('');
    setCurrentRound(0);
    setStreamingTimeline([]);
    setStreamStartTime(0);
    setCurrentToolCalls([]);
    
    logger.dev('[useStreamingState] 🔄 État réinitialisé');
  }, []);

  return {
    // États
    streamingContent,
    isStreaming,
    streamingState,
    executingToolCount,
    currentToolName,
    currentRound,
    streamingTimeline,
    streamStartTime,
    currentToolCalls,
    
    // Actions
    startStreaming,
    updateContent,
    setStreamingState,
    addToolExecution,
    updateToolResult,
    endStreaming,
    reset
  };
}

