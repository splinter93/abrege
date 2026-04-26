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

import { useState, useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
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
  isFading: boolean; // ✅ NOUVEAU: Pour transition fluide streaming → DB
  streamingState: StreamingStateType;
  executingToolCount: number;
  currentToolName: string;
  currentRound: number;
  streamingTimeline: StreamTimelineItem[];
  streamStartTime: number;
  currentToolCalls: ToolCall[];

  // Refs miroirs (valeurs toujours à jour, sans déclencher de re-render)
  streamingContentRef: MutableRefObject<string>;
  streamingTimelineRef: MutableRefObject<StreamTimelineItem[]>;
  
  // Actions
  startStreaming: () => void;
  updateContent: (chunk: string) => void;
  setStreamingState: (state: StreamingStateType) => void;
  addToolExecution: (toolCalls: ToolCall[], toolCount: number) => void;
  updateToolResult: (toolCallId: string, result: unknown, success: boolean) => void;
  addPlanEvent: (payload: {
    title?: string;
    steps: Array<{ id: string; content: string; status: string }>;
    toolCallId?: string;
  }) => void;
  endStreaming: () => void;
  setFading: (fading: boolean) => void; // ✅ NOUVEAU
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
  const [isFading, setIsFading] = useState(false); // ✅ NOUVEAU: Transition fluide
  const [streamingState, setStreamingStateInternal] = useState<StreamingStateType>('idle');
  const [executingToolCount, setExecutingToolCount] = useState(0);
  const [currentToolName, setCurrentToolName] = useState('');
  const [streamingTimeline, setStreamingTimeline] = useState<StreamTimelineItem[]>([]);
  const [streamStartTime, setStreamStartTime] = useState(0);
  const streamStartTimeRef = useRef(0); // ✅ FIX: Ref pour éviter dépendances dans updateContent
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);

  // Refs miroirs : valeurs toujours à jour sans causer de re-render
  const streamingContentRef = useRef('');
  const streamingTimelineRef = useRef<StreamTimelineItem[]>([]);
  
  // ✅ FIX: useRef pour currentRound (éviter stale closure)
  const currentRoundRef = useRef(0);
  const [currentRound, setCurrentRound] = useState(0);

  /**
   * Démarre le streaming
   * Réinitialise tous les états
   */
  const startStreaming = useCallback(() => {
    const startTime = Date.now();
    setIsStreaming(true);
    setIsFading(false); // ✅ Reset fading
    setStreamingContent('');
    streamingContentRef.current = '';
    setCurrentRound(0);
    currentRoundRef.current = 0; // ✅ Réinitialiser le ref aussi
    setStreamingStateInternal('thinking');
    setStreamingTimeline([]);
    streamingTimelineRef.current = [];
    setStreamStartTime(startTime);
    streamStartTimeRef.current = startTime; // ✅ Mettre à jour le ref aussi
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
    // Mettre à jour la ref immédiatement (synchrone) avant le setState batché
    streamingContentRef.current = streamingContentRef.current + chunk;

    setStreamingContent(streamingContentRef.current);
    
    // Mettre à jour la timeline
    const lastItem = streamingTimelineRef.current[streamingTimelineRef.current.length - 1];
    const currentRoundValue = currentRoundRef.current;
    const startTime = streamStartTimeRef.current;

    let nextTimeline: StreamTimelineItem[];
    if (lastItem && lastItem.type === 'text' && lastItem.roundNumber === currentRoundValue) {
      nextTimeline = [
        ...streamingTimelineRef.current.slice(0, -1),
        {
          ...lastItem,
          content: (lastItem.content || '') + chunk
        }
      ];
    } else {
      nextTimeline = [
        ...streamingTimelineRef.current,
        {
          type: 'text' as const,
          content: chunk,
          roundNumber: currentRoundValue,
          timestamp: Date.now() - startTime
        }
      ];
    }

    // Mettre à jour la ref immédiatement (synchrone) puis le state
    streamingTimelineRef.current = nextTimeline;
    setStreamingTimeline(nextTimeline);
  }, []); // ✅ FIX: Plus de dépendances - utilise uniquement des refs

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
    // Le texte d'un round qui se termine par des tool calls est souvent un préambule.
    // On repart sur un buffer vide pour éviter les réponses "dupliquées" au round suivant.
    streamingContentRef.current = '';
    setStreamingContent('');
    
    const newRound = currentRoundRef.current + 1;
    currentRoundRef.current = newRound;
    setCurrentRound(newRound);
    
    // Stocker les tool calls pour affichage
    setCurrentToolCalls(toolCalls.map(tc => ({
      ...tc,
      success: undefined
    })));
    
    // Déduplication basée sur la ref (synchrone)
    const existingToolCallIds = new Set(
      streamingTimelineRef.current
        .filter(item => item.type === 'tool_execution')
        .flatMap(item => item.toolCalls.map(tc => tc.id))
    );
    const newToolCalls = toolCalls.filter(tc => !existingToolCallIds.has(tc.id));

    if (newToolCalls.length > 0) {
      const next = [
        ...streamingTimelineRef.current,
        {
          type: 'tool_execution' as const,
          toolCalls: newToolCalls.map(tc => ({
            ...tc,
            success: undefined,
            result: undefined
          })),
          toolCount: newToolCalls.length,
          roundNumber: newRound,
          timestamp: Date.now() - streamStartTimeRef.current
        }
      ];
      // Mettre à jour la ref synchronement, puis le state
      streamingTimelineRef.current = next;
      setStreamingTimeline(next);
    } else {
      logger.dev('[useStreamingState] 🔧 Tool calls déjà présents dans timeline, skip duplication');
    }
    
    logger.dev('[useStreamingState] 🔧 Tool execution ajoutée (avec déduplication):', {
      toolCount,
      round: newRound,
      toolNames: toolCalls.map(tc => tc.function.name)
    });
  }, []);

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
    const resultString = typeof result === 'string' ? result : JSON.stringify(result);
    
    // Mettre à jour dans currentToolCalls
    setCurrentToolCalls(prev => prev.map(tc =>
      tc.id === toolCallId
        ? { ...tc, success, result: resultString }
        : tc
    ));
    
    // Mettre à jour dans la timeline (ref synchrone d'abord, puis state)
    const updated = streamingTimelineRef.current.map(item => {
      if (item.type === 'tool_execution' && item.toolCalls) {
        return {
          ...item,
          toolCalls: item.toolCalls.map(tc =>
            tc.id === toolCallId ? { ...tc, success, result: resultString } : tc
          )
        };
      }
      return item;
    });

    streamingTimelineRef.current = updated;
    setStreamingTimeline(updated);

    logger.dev('[useStreamingState] ✅ Tool result mis à jour dans timeline:', {
      toolCallId,
      success,
      resultPreview: resultString.substring(0, 100),
      timelineItemsCount: updated.length,
      toolExecutionBlocks: updated.filter(i => i.type === 'tool_execution').length,
      toolCallsWithSuccess: updated
        .filter(i => i.type === 'tool_execution')
        .flatMap(i => i.toolCalls)
        .filter(tc => tc.success !== undefined).length
    });
  }, []);

  /**
   * Met à jour le dernier bloc plan en live (Cursor-like) ou en ajoute un.
   */
  const addPlanEvent = useCallback(
    (payload: {
      title?: string;
      steps: Array<{ id: string; content: string; status: string }>;
      toolCallId?: string;
    }) => {
      if (!payload.steps?.length) return;

      const incomingTitle =
        typeof payload.title === 'string' && payload.title.trim() !== ''
          ? payload.title.trim()
          : undefined;

      const replaceLastPlan = (items: StreamTimelineItem[]): StreamTimelineItem[] => {
        for (let i = items.length - 1; i >= 0; i--) {
          if (items[i].type === 'plan') {
            const prev = items[i];
            const mergedTitle =
              incomingTitle ?? (prev.type === 'plan' ? prev.title : undefined);
            const planItem: StreamTimelineItem = {
              type: 'plan',
              title: mergedTitle,
              steps: payload.steps.map(s => ({
                id: s.id,
                content: s.content,
                status: s.status as 'pending' | 'in_progress' | 'completed'
              })),
              timestamp: Date.now(),
              ...(payload.toolCallId !== undefined && { toolCallId: payload.toolCallId })
            };
            const next = [...items];
            next[i] = planItem;
            return next;
          }
        }
        const planItem: StreamTimelineItem = {
          type: 'plan',
          title: incomingTitle,
          steps: payload.steps.map(s => ({
            id: s.id,
            content: s.content,
            status: s.status as 'pending' | 'in_progress' | 'completed'
          })),
          timestamp: Date.now(),
          ...(payload.toolCallId !== undefined && { toolCallId: payload.toolCallId })
        };
        return [...items, planItem];
      };

      setStreamingTimeline(prev => {
        const next = replaceLastPlan(prev);
        streamingTimelineRef.current = next;
        return next;
      });
    },
    []
  );

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
   * ✅ NOUVEAU: Active le fade out pour transition fluide
   */
  const setFading = useCallback((fading: boolean) => {
    setIsFading(fading);
    logger.dev(`[useStreamingState] ${fading ? '🌅' : '🌄'} Fading: ${fading}`);
  }, []);

  /**
   * Réinitialise complètement l'état
   */
  const reset = useCallback(() => {
    setStreamingContent('');
    streamingContentRef.current = '';
    setIsStreaming(false);
    setIsFading(false); // ✅ Reset fading aussi
    setStreamingStateInternal('idle');
    setExecutingToolCount(0);
    setCurrentToolName('');
    setCurrentRound(0);
    currentRoundRef.current = 0; // ✅ Réinitialiser le ref aussi
    setStreamingTimeline([]);
    streamingTimelineRef.current = [];
    setStreamStartTime(0);
    setCurrentToolCalls([]);
    
    logger.dev('[useStreamingState] 🔄 État réinitialisé');
  }, []);

  return {
    // États
    streamingContent,
    isStreaming,
    isFading, // ✅ NOUVEAU
    streamingState,
    executingToolCount,
    currentToolName,
    currentRound,
    streamingTimeline,
    streamStartTime,
    currentToolCalls,

    // Refs miroirs
    streamingContentRef,
    streamingTimelineRef,
    
    // Actions
    startStreaming,
    updateContent,
    setStreamingState,
    addToolExecution,
    updateToolResult,
    addPlanEvent,
    endStreaming,
    setFading, // ✅ NOUVEAU
    reset
  };
}

