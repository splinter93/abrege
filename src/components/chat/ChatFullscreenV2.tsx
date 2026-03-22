'use client';
/**
 * ChatFullscreenV2 - Composant principal du chat
 * REFACTORÉ : 1244 lignes → ~250 lignes
 * 
 * Architecture:
 * - Services: ChatMessageSendingService, ChatMessageEditService, ChatContextBuilder
 * - Hooks: useStreamingState, useChatAnimations, useChatMessageActions, useSyncAgentWithSession
 * - Composants: ChatHeader, ChatMessagesArea, ChatInputContainer
 * 
 * Responsabilité unique: Orchestration UI (pas de logique métier)
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useLLMContext } from '@/hooks/useLLMContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useChatHandlers } from '@/hooks/useChatHandlers';
import { useInfiniteMessages } from '@/hooks/useInfiniteMessages';
import { useChatMessagesRealtime } from '@/hooks/chat/useChatMessagesRealtime';
import type { Agent, ChatMessage } from '@/types/chat';
import type { MessageContent, ImageAttachment } from '@/types/image';
import type { StreamTimeline } from '@/types/streamTimeline';

// 🎯 NOUVEAUX HOOKS (Phase 2)
import { useStreamingState } from '@/hooks/chat/useStreamingState';
import { useChatAnimations } from '@/hooks/chat/useChatAnimations';
import { useChatMessageActions } from '@/hooks/chat/useChatMessageActions';
import { useSyncAgentWithSession } from '@/hooks/chat/useSyncAgentWithSession';
import { useChatFullscreenUIState } from '@/hooks/chat/useChatFullscreenUIState';
import { useChatFullscreenUIActions } from '@/hooks/chat/useChatFullscreenUIActions';
import { useChatFullscreenEffects } from '@/hooks/chat/useChatFullscreenEffects';
import { useAgents } from '@/hooks/useAgents';

// 🎯 NOUVEAUX COMPOSANTS (Phase 3)
import ChatHeader from './ChatHeader';
import ChatMessagesArea from './ChatMessagesArea';
import ChatInputContainer from './ChatInputContainer';
import TTSMiniPlayer from './TTSMiniPlayer';
import { TextToSpeechProvider } from '@/contexts/TextToSpeechContext';
import AuthRequiredModal from './AuthRequiredModal';
import SidebarUltraClean from './SidebarUltraClean';
import ChatCanvaPane from './ChatCanvaPane';
import ModelDebug, { type ModelDebugInfo } from './ModelDebug';
import { useCanvaStore } from '@/store/useCanvaStore';
import { useCanvaContextPayload } from '@/hooks/chat/useCanvaContextPayload';
import type { CanvaSession as CanvaSessionDB, ListCanvasResponse } from '@/types/canva';

import { simpleLogger as logger } from '@/utils/logger';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';
import { applyChatFontPreset } from '@/constants/chatFontPresets';
import { stripMarkdownForTTS } from '@/utils/stripMarkdownForTTS';

import '@/styles/chat-clean.css';
import '@/styles/chat-widget.css';
import '@/styles/sidebar-collapsible.css';

export interface ChatFullscreenV2Props {
  variant?: 'fullscreen' | 'widget';
  onClose?: () => void;
}

const ChatFullscreenV2: React.FC<ChatFullscreenV2Props> = ({ variant = 'fullscreen', onClose }) => {
  // 🎯 HOOKS EXISTANTS (groupés pour lisibilité)
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { requireAuth, user, loading: authLoading, isAuthenticated } = useAuthGuard();
  const { agents, loading: agentsLoading } = useAgents();
  const llmContext = useLLMContext({
    includeRecent: false,
    includeDevice: true,
    compactFormat: true
  });

  const {
    sessions,
    currentSession,
    selectedAgent,
    selectedAgentId,
    agentNotFound,
    editingMessage,
    setSelectedAgent,
    setAgentNotFound,
    setCurrentSession,
    syncSessions,
    createSession,
    startEditingMessage,
    cancelEditing
  } = useChatStore();

  const INITIAL_MESSAGES_LIMIT = 10;

  const {
    openCanva,
    switchCanva,
    closeCanva,
    isCanvaOpen,
    activeCanvaId,
    sessions: canvaSessions
  } = useCanvaStore();
  
  // 🎯 UI STATE (extrait dans hook)
  const uiState = useChatFullscreenUIState({
    isDesktop,
    isCanvaOpen
  });

  // Mode vocal : envoi direct après transcription + TTS incrémental (phrase par phrase)
  const [isVocalMode, setVocalMode] = useState(false);

  // Widget : sélection d'agent → création nouvelle conversation
  const handleWidgetSelectAgent = useCallback(async (agent: Agent) => {
    await createSession('Nouvelle conversation', agent.id);
  }, [createSession]);
  const isVocalModeRef = useRef(false);
  isVocalModeRef.current = isVocalMode;
  const ttsBufferRef = useRef('');

  const {
    payload: canvaContextPayload,
    isLoading: isCanvaContextLoading,
    error: canvaContextError
  } = useCanvaContextPayload({
    chatSessionId: currentSession?.id || null,
    activeCanvaId,
    isCanvaPaneOpen: isCanvaOpen
  });

  const llmContextWithCanva = useMemo(() => {
    return {
      ...llmContext,
      canva_context: canvaContextPayload,
      vocalMode: isVocalMode
    };
  }, [llmContext, canvaContextPayload, isVocalMode]);

  // 🎯 INFINITE MESSAGES (lazy loading)
  const {
    messages: infiniteMessages,
    isLoading: isLoadingMessages,
    isLoadingMore,
    hasMore,
    loadInitialMessages,
    loadMoreMessages,
    addMessage: addInfiniteMessage,
    upsertMessage: upsertInfiniteMessage,
    updateMessageByClientId: updateInfiniteMessageByClientId,
    removeMessageByClientId,
    removeMessageById: removeInfiniteMessageById,
    replaceMessages,
    clearMessages: clearInfiniteMessages
  } = useInfiniteMessages({
    sessionId: currentSession?.id || null,
    initialLimit: INITIAL_MESSAGES_LIMIT,
    loadMoreLimit: 20,
    enabled: !!currentSession?.id
  });

  // 🎯 SCROLL AUTOMATION (centralisé dans useChatScroll)
  const { messagesEndRef, scrollToFollowStream } = useChatScroll({
    autoScroll: true,
    messages: infiniteMessages,
    watchLayoutChanges: isDesktop,
    layoutTrigger: isCanvaOpen,
    sessionId: currentSession?.id ?? null,
  });

  // 🎯 EFFECTS (extrait dans useChatFullscreenEffects)

  // 🎯 NOUVEAUX HOOKS CUSTOM (logique extraite)
  const streamingState = useStreamingState();
  const pendingAssistantClientMessageIdRef = useRef<string | null>(null);
  const pendingAssistantOperationIdRef = useRef<string | null>(null);
  const pendingAssistantStartTimeRef = useRef<number>(0);
  const infiniteMessagesRef = useRef<ChatMessage[]>(infiniteMessages);

  useEffect(() => {
    infiniteMessagesRef.current = infiniteMessages;
  }, [infiniteMessages]);

  // Realtime sync messages — déclaré après infiniteMessagesRef pour pouvoir passer getLocalMessages
  useChatMessagesRealtime(
    currentSession?.id ?? null,
    upsertInfiniteMessage,
    removeInfiniteMessageById,
    () => infiniteMessagesRef.current
  );

  // Sync selectedAgent avec la liste agents (ex: voix ou langue mise à jour dans config agent)
  useEffect(() => {
    if (!selectedAgentId || agents.length === 0) return;
    const updated = agents.find((a) => a.id === selectedAgentId);
    if (!updated) return;
    if (
      !selectedAgent ||
      updated.voice !== selectedAgent.voice ||
      updated.tts_language !== selectedAgent.tts_language
    ) {
      setSelectedAgent(updated);
    }
  }, [agents, selectedAgentId, selectedAgent, setSelectedAgent]);

  const clearPendingAssistantTracking = useCallback(() => {
    pendingAssistantClientMessageIdRef.current = null;
    pendingAssistantOperationIdRef.current = null;
    pendingAssistantStartTimeRef.current = 0;
  }, []);

  const createPendingAssistantMessage = useCallback(() => {
    const clientMessageId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const operationId = crypto.randomUUID();
    const startedAt = Date.now();

    pendingAssistantClientMessageIdRef.current = clientMessageId;
    pendingAssistantOperationIdRef.current = operationId;
    pendingAssistantStartTimeRef.current = startedAt;

    upsertInfiniteMessage({
      id: `pending-${clientMessageId}`,
      clientMessageId,
      operation_id: operationId, // ✅ Clé de dédup : permet à upsertMessage de matcher le Realtime echo
      role: 'assistant',
      content: '',
      timestamp: new Date(startedAt).toISOString(),
      isStreaming: true
    });

    return clientMessageId;
  }, [upsertInfiniteMessage]);

  // Ref stable vers startTime (ne change pas entre les renders)
  const streamStartTimeForTimelineRef = useRef(0);

  // Helper pur (pas un hook) : construit la StreamTimeline à partir des items refs.
  // Appelé directement dans les callbacks — zéro setState, zéro useEffect.
  const buildLiveTimeline = useCallback((isStreamingNow: boolean): StreamTimeline | undefined => {
    const items = streamingState.streamingTimelineRef.current;
    if (items.length === 0) return undefined;
    const startTime = streamStartTimeForTimelineRef.current || pendingAssistantStartTimeRef.current || Date.now();
    return {
      items,
      startTime,
      ...(isStreamingNow ? {} : { endTime: Date.now() })
    };
  }, [streamingState.streamingTimelineRef]);

  // Ref stable vers buildLiveTimeline
  const buildLiveTimelineRef = useRef(buildLiveTimeline);
  buildLiveTimelineRef.current = buildLiveTimeline;

  // Met à jour le message optimiste directement depuis les callbacks (pas de useEffect).
  // Les valeurs sont lues depuis les refs miroirs, mises à jour de façon synchrone dans useStreamingState.
  const patchPendingAssistantMessage = useCallback((isStreamingNow: boolean) => {
    const clientMessageId = pendingAssistantClientMessageIdRef.current;
    if (!clientMessageId) return;
    const content = streamingState.streamingContentRef.current;
    const liveTimeline = buildLiveTimelineRef.current(isStreamingNow);
    updateInfiniteMessageByClientId(clientMessageId, (message) => {
      if (message.role !== 'assistant') return message;
      return {
        ...message,
        content,
        isStreaming: isStreamingNow,
        ...(liveTimeline ? { stream_timeline: liveTimeline } : {})
      };
    });
  }, [streamingState.streamingContentRef, updateInfiniteMessageByClientId]);
  
  // 🎯 GESTION ERREURS STREAMING (utilise uiState)
  
  const animations = useChatAnimations({
    currentSessionId: currentSession?.id || null,
    isLoadingMessages
  });

  // 🎯 HANDLERS CENTRALISÉS
  const { handleComplete, handleError, handleToolResult, handleToolExecutionComplete } = useChatHandlers({
    // TTS mode vocal : déclenché dans onStreamEnd (contenu depuis streamingContentRef), pas ici
    onMessageFinalContent: undefined,
    getAssistantOperationId: () => pendingAssistantOperationIdRef.current,
    onComplete: async (
      fullContent,
      fullReasoning,
      toolCalls,
      toolResults,
      streamTimeline,
      persistedMessage
    ) => {
      const clientMessageId = pendingAssistantClientMessageIdRef.current;

      if (clientMessageId) {
        const assistantOpId =
          persistedMessage?.operation_id ?? pendingAssistantOperationIdRef.current ?? undefined;
        const finalMessage: ChatMessage = {
          ...(persistedMessage ?? {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant' as const,
            timestamp: new Date().toISOString()
          }),
          clientMessageId,
          ...(assistantOpId ? { operation_id: assistantOpId } : {}),
          role: 'assistant',
          content: fullContent,
          reasoning: fullReasoning,
          tool_results: toolResults || [],
          ...(streamTimeline ? { stream_timeline: streamTimeline } : {}),
          isStreaming: false
        };

        const hasPendingBubble = infiniteMessagesRef.current.some(
          (message) => message.clientMessageId === clientMessageId
        );

        if (hasPendingBubble) {
          updateInfiniteMessageByClientId(clientMessageId, (message) => (
            message.role === 'assistant'
              ? { ...message, ...finalMessage, clientMessageId, isStreaming: false }
              : message
          ));
        } else {
          upsertInfiniteMessage(finalMessage);
        }
      }

      clearPendingAssistantTracking();
      streamingState.reset();

      // ✅ Clear l'erreur si succès
      uiState.setStreamError(null);
    },
    onError: (error) => {
      const clientMessageId = pendingAssistantClientMessageIdRef.current;
      const pendingAssistantMessage = clientMessageId
        ? infiniteMessagesRef.current.find(message => message.clientMessageId === clientMessageId)
        : null;

      if (clientMessageId) {
        const hasVisibleContent = pendingAssistantMessage?.content?.trim().length;
        const pendingTimeline = pendingAssistantMessage?.role === 'assistant'
          ? pendingAssistantMessage.stream_timeline || pendingAssistantMessage.streamTimeline
          : undefined;
        const hasTimeline = Boolean(pendingTimeline && pendingTimeline.items.length > 0);

        if (!hasVisibleContent && !hasTimeline) {
          removeMessageByClientId(clientMessageId);
        } else {
          updateInfiniteMessageByClientId(clientMessageId, (message) => (
            message.role === 'assistant'
              ? { ...message, isStreaming: false }
              : message
          ));
        }
      }

      clearPendingAssistantTracking();

      // ✅ Stocker l'erreur structurée pour affichage
      const errorDetails = typeof error === 'string' 
        ? { error, timestamp: Date.now() }
        : error;
      
      uiState.setStreamError(errorDetails);
      streamingState.reset();
      
      logger.error('[ChatFullscreenV2] ❌ Erreur streaming reçue:', errorDetails);
      
      // ✅ Pas de toast : le log d'erreur dans l'UI suffit
    }
  });

  // 🎯 CHAT RESPONSE (streaming)
  // ✅ FIX: Extraire les callbacks pour éviter les re-renders
  const { updateContent, startStreaming, endStreaming } = streamingState;
  
  // ✅ NOUVEAU : État pour info modèle (debug)
  const [modelInfo, setModelInfo] = useState<ModelDebugInfo | null>(null);
  
  const { sendMessage, abort: abortStream } = useChatResponse({
    useStreaming: true,
    onStreamChunk: (chunk) => {
      updateContent(chunk);
      scrollToFollowStream();
      patchPendingAssistantMessage(true);

      if (isVocalModeRef.current) {
        // Accumuler un petit buffer pour que stripMarkdownForTTS fonctionne
        // correctement (les ** / __ peuvent être coupés entre deux tokens).
        // On flush dès qu'on a un espace et >= 20 chars.
        ttsBufferRef.current += chunk;
        const MIN_FLUSH = 20;
        let buf = ttsBufferRef.current;
        if (buf.length >= MIN_FLUSH) {
          const lastSpace = buf.lastIndexOf(' ');
          if (lastSpace > 0) {
            const toSend = stripMarkdownForTTS(buf.slice(0, lastSpace + 1));
            buf = buf.slice(lastSpace + 1);
            if (toSend) {
              window.dispatchEvent(new CustomEvent('chat-vocal-tts-push', { detail: { text: toSend } }));
            }
          }
        }
        ttsBufferRef.current = buf;
      }
    },
    onStreamStart: () => {
      startStreaming();
      createPendingAssistantMessage();
      streamStartTimeForTimelineRef.current = Date.now();

      if (isVocalModeRef.current) {
        ttsBufferRef.current = '';
        window.dispatchEvent(new CustomEvent('chat-vocal-tts-start'));
      }
    },
    onStreamEnd: () => {
      if (isVocalModeRef.current) {
        const remaining = stripMarkdownForTTS(ttsBufferRef.current).trim();
        if (remaining) {
          window.dispatchEvent(new CustomEvent('chat-vocal-tts-push', { detail: { text: remaining } }));
        }
        ttsBufferRef.current = '';
        window.dispatchEvent(new CustomEvent('chat-vocal-tts-end'));
      }
      endStreaming();
    },
    onModelInfo: (info) => {
      // Déferrer pour éviter "state update on unmounted component" si le stream envoie l'info avant la fin du montage
      queueMicrotask(() => setModelInfo(info));
    },
    onToolExecution: (toolCount, toolCalls) => {
      // ✅ FIX TypeScript : Garantir type: 'function'
      const typedToolCalls = toolCalls.map(tc => ({
        ...tc,
        type: 'function' as const
      }));
      streamingState.addToolExecution(typedToolCalls, toolCount);
      // Patch immédiat via refs (pas de useEffect)
      patchPendingAssistantMessage(true);
    },
    onPlanUpdate: (payload) => {
      streamingState.addPlanEvent(payload);
      patchPendingAssistantMessage(true);
    },
    onToolResult: (toolName, result, success, toolCallId) => {
      logger.dev('[ChatFullscreenV2] 🔧 onToolResult callback appelé:', {
        toolName,
                  success, 
        toolCallId,
        hasResult: !!result
      });
      
      if (toolCallId) {
        streamingState.updateToolResult(toolCallId, result, success);
        patchPendingAssistantMessage(true);
      } else {
        logger.warn('[ChatFullscreenV2] ⚠️ toolCallId manquant pour updateToolResult');
      }
      
      handleToolResult(toolName, result, success, toolCallId);
    },
    onToolExecutionComplete: handleToolExecutionComplete,
    onComplete: handleComplete,
    onError: handleError
  });

  // 🎯 MESSAGE ACTIONS (send/edit avec services)
  const messageActions = useChatMessageActions({
    selectedAgent,
    infiniteMessages,
    llmContext: llmContextWithCanva,
    sendMessageFn: sendMessage,
    abortFn: abortStream,
    addInfiniteMessage,
    onEditingChange: (editing: boolean) => {
      if (!editing) {
        cancelEditing();
        uiState.setEditingContent('');
      }
    },
    requireAuth,
    replaceMessages,
    initialLoadLimit: INITIAL_MESSAGES_LIMIT,
    onBeforeSend: async () => {
      const pendingAssistantClientMessageId = pendingAssistantClientMessageIdRef.current;
      if (pendingAssistantClientMessageId) {
        removeMessageByClientId(pendingAssistantClientMessageId);
      }

      clearPendingAssistantTracking();
      streamingState.reset();
      
      // ✅ Clear l'erreur quand un nouveau message est envoyé
      uiState.setStreamError(null);
      
      logger.dev('[ChatFullscreenV2] ✅ Timeline reset, historique complet dans infiniteMessages');
    }
  });
  
  const handleStopGeneration = useCallback(() => {
    logger.dev('[ChatFullscreenV2] ⏹️ Stop generation requested');

    // Hard-stop TTS: kills WebSocket, clears sentence queue, stops audio playback immediately.
    // Also clear the text buffer so the async onStreamEnd callback won't push leftover text.
    if (isVocalModeRef.current) {
      ttsBufferRef.current = '';
      window.dispatchEvent(new CustomEvent('chat-vocal-tts-stop'));
    }

    messageActions.abortGeneration();

    const partialContent = streamingState.streamingContentRef.current;
    const clientMessageId = pendingAssistantClientMessageIdRef.current;

    if (clientMessageId) {
      if (partialContent.trim()) {
        updateInfiniteMessageByClientId(clientMessageId, (msg) =>
          msg.role === 'assistant'
            ? { ...msg, content: partialContent, isStreaming: false }
            : msg
        );
      } else {
        removeMessageByClientId(clientMessageId);
      }
    }

    clearPendingAssistantTracking();
    streamingState.endStreaming();
    streamingState.reset();
    uiState.setStreamError(null);
  }, [
    messageActions,
    streamingState,
    updateInfiniteMessageByClientId,
    removeMessageByClientId,
    clearPendingAssistantTracking,
    uiState
  ]);

  // 🎯 UI ACTIONS (extrait dans hook)
  const allowSidebarHover = isDesktop && !isCanvaOpen && variant !== 'widget';
  
  const uiActions = useChatFullscreenUIActions({
    requireAuth,
    user,
    authLoading,
    isDesktop,
    isCanvaOpen,
    allowSidebarHover,
    editingMessage,
    currentSession,
    infiniteMessages,
    messageActions,
    uiState,
    openCanva,
    closeCanva,
    switchCanva,
    startEditingMessage,
    cancelEditing,
    activeCanvaId
  });

  const handleToggleAgentDropdown = useCallback(() => {
    uiState.setAgentDropdownOpen(!uiState.agentDropdownOpen);
  }, [uiState.agentDropdownOpen, uiState.setAgentDropdownOpen]);

  // 🎯 SYNC AGENT avec session
  useSyncAgentWithSession({
    currentSession,
    selectedAgentId,
    user,
    authLoading,
    onAgentLoaded: setSelectedAgent,
    onAgentNotFound: () => setAgentNotFound(true) // ✅ Marquer agent comme introuvable
  });

  // 🎯 EFFECTS (extrait dans useChatFullscreenEffects)
  const effects = useChatFullscreenEffects({
    isDesktop,
    user,
    authLoading,
    agentsLoading,
    agents,
    currentSession,
    sidebarOpen: uiState.sidebarOpen,
    isCanvaOpen,
    activeCanvaId,
    canvaSessions,
    infiniteMessages,
    isLoadingMessages,
    hasMore,
    isLoadingMore,
    editingMessage,
    animations,
    streamingState,
    uiState,
    syncSessions,
    setCurrentSession,
    setSelectedAgent,
    setAgentNotFound,
    clearInfiniteMessages,
    loadMoreMessages,
    switchCanva,
    closeCanva
  });

  // 🎯 UI STATE (déjà extrait dans useChatFullscreenUIState)

  // ✅ Reset l'erreur quand la session change (sécurité supplémentaire)
  useEffect(() => {
    // Réinitialiser l'erreur quand currentSession change
    uiState.setStreamError(null);
    clearPendingAssistantTracking();
  }, [currentSession?.id, uiState.setStreamError]);

  // 🎯 HANDLERS UI (extrait dans useChatFullscreenUIActions)
  useEffect(() => {
    if (!allowSidebarHover) {
      uiState.setSidebarHovered(false);
    }
  }, [allowSidebarHover, uiState.setSidebarHovered]);

  // ✅ Police chat : variable --font-chat-base. On applique toujours Manrope (preset) au chargement.
  useEffect(() => {
    try {
      applyChatFontPreset('manrope');
      localStorage.setItem('chat-font-preference', 'manrope');
    } catch {
      applyChatFontPreset('manrope');
    }
  }, []);

  // Noir absolu sur mobile : classe sur <html> pour que le CSS puisse forcer html/body (variables + fond)
  // En mode widget, ne pas ajouter chat-page pour éviter d'affecter la page hôte
  useEffect(() => {
    if (variant === 'widget') return;
    document.documentElement.classList.add('chat-page');
    return () => document.documentElement.classList.remove('chat-page');
  }, [variant]);

  // 🎯 KEYBOARD SCROLL — géré directement dans useChatFullscreenUIState.ts
  // (handler synchrone keyboardWillShow / visualViewport, avant la CSS transition)

  // ✅ SUPPRIMÉ : Plus d'auto-sélection de session
  // L'utilisateur choisit explicitement (via agent favori ou clic sidebar)

  // 🎯 Layout (utilise uiState)

  // 🎯 RENDU (100% déclaratif avec composants extraits)
  // adjustResize gère le viewport → pas besoin d'injecter --keyboard-inset en CSS.
  // keyboardInset reste utile côté JS (scroll-to-bottom, etc.) mais pas pour le positionnement.

  return (
      <div
        className={`chatgpt-container ${(isDesktop && isCanvaOpen) ? 'canva-active' : ''} ${variant === 'widget' ? 'chatgpt-container--widget' : ''}`}
      >
      <ChatHeader
        sidebarOpen={uiState.sidebarOpen}
        onToggleSidebar={uiActions.handleSidebarToggle}
        selectedAgent={selectedAgent}
        agentNotFound={agentNotFound}
        agentDropdownOpen={uiState.agentDropdownOpen}
        onToggleAgentDropdown={handleToggleAgentDropdown}
        isAuthenticated={isAuthenticated}
        authLoading={authLoading}
        chatSessionId={currentSession?.id || null}
        activeCanvaId={activeCanvaId}
        isCanvaOpen={isCanvaOpen}
        onOpenNewCanva={isDesktop ? uiActions.handleOpenCanva : undefined}
        onSelectCanva={uiActions.handleSelectCanva}
        onCloseCanva={uiActions.handleCloseCanva}
        canOpenCanva={isDesktop}
        onCloseWidget={variant === 'widget' ? onClose : undefined}
        isWidget={variant === 'widget'}
        agents={variant === 'widget' ? agents : undefined}
        agentsLoading={variant === 'widget' ? agentsLoading : undefined}
        onSelectAgent={variant === 'widget' ? handleWidgetSelectAgent : undefined}
      />

      {/* Zone hover invisible sidebar */}
      {allowSidebarHover && (
        <div 
          className="sidebar-hover-zone"
          onMouseEnter={uiActions.handleSidebarMouseEnter}
        />
      )}

      <div className={`chatgpt-content ${ (uiState.sidebarOpen || (allowSidebarHover && uiState.sidebarHovered)) ? 'sidebar-open' : ''}`}>
        {/* Sidebar */}
        <div 
          {...(isDesktop ? {
            onMouseEnter: uiActions.handleSidebarMouseEnter,
            onMouseLeave: uiActions.handleSidebarMouseLeave
          } : {})}
        >
        <SidebarUltraClean
            isOpen={isDesktop ? (uiState.sidebarOpen || (allowSidebarHover && uiState.sidebarHovered)) : uiState.sidebarOpen}
          isDesktop={isDesktop}
          onClose={() => {
            if (user && !authLoading) {
              uiState.setSidebarOpen(false);
            }
          }}
          onForceClose={() => {
            if (user && !authLoading) {
              uiState.setSidebarOpen(false);
              uiState.setSidebarHovered(false);
            }
          }}
        />
        </div>

        {/* Overlay mobile */}
        {!isDesktop && uiState.sidebarOpen && (
          <div 
            className="chatgpt-sidebar-overlay visible" 
            onClick={() => {
              if (user && !authLoading) {
                uiState.setSidebarOpen(false);
              }
            }} 
          />
        )}

        {/* Zone principale */}
        <div className={uiState.mainClassNames.join(' ')}>
              <div className="chatgpt-main-chat">
                <TextToSpeechProvider defaultVoiceId={selectedAgent?.voice} defaultLanguage={selectedAgent?.tts_language} streamingMode={isVocalMode}>
                <ChatMessagesArea
                  messages={effects.displayMessages}
                  isLoading={isLoadingMessages}
                  isLoadingMore={isLoadingMore}
                  hasMore={hasMore}
                  isStreaming={streamingState.isStreaming}
                  loading={messageActions.isLoading}
                  shouldAnimateMessages={animations.shouldAnimateMessages}
                  messagesVisible={animations.messagesVisible}
                  displayedSessionId={animations.displayedSessionId}
                  currentSessionId={currentSession?.id || null}
                  selectedAgent={selectedAgent}
                  agentNotFound={agentNotFound}
                  streamError={uiState.streamError}
                  onRetryMessage={uiActions.handleRetryMessage}
                  onDismissError={uiActions.handleDismissError}
                  onEditMessage={uiActions.handleEditMessage}
                  onRegenerateResponse={uiActions.handleRegenerateResponse}
                  containerRef={uiState.messagesContainerRef}
                  messagesEndRef={messagesEndRef}
                  keyboardInset={uiState.keyboardInset}
                />

                <div className="chatgpt-chat-bottom">
                  <TTSMiniPlayer />
                  <ChatInputContainer
                    onSend={uiActions.handleSendMessage}
                    onStopGeneration={handleStopGeneration}
                    loading={messageActions.isLoading}
                    sessionId={currentSession?.id || 'temp'}
                    currentAgentModel={selectedAgent?.model}
                    editingMessageId={editingMessage?.messageId || null}
                    editingContent={uiState.editingContent}
                    onCancelEdit={uiActions.handleCancelEdit}
                    textareaRef={uiState.textareaRef}
                    selectedAgent={selectedAgent}
                    keyboardInset={uiState.keyboardInset}
                    isVocalMode={isVocalMode}
                    onToggleVocalMode={() => setVocalMode(v => !v)}
                  />
                  <footer className="chatgpt-chat-footer" aria-hidden="true" />
                </div>
                </TextToSpeechProvider>
              </div>

          {uiState.shouldRenderDesktopCanva && (
            <div
              className={`chatgpt-canva-pane-wrapper ${isCanvaOpen ? 'chatgpt-canva-pane-wrapper--open' : 'chatgpt-canva-pane-wrapper--closed'}`}
              style={uiState.canvaPaneStyle}
              aria-hidden={!isCanvaOpen}
            >
              <div
                className={`chatgpt-canva-pane-wrapper__inner ${isCanvaOpen ? 'chatgpt-canva-pane-wrapper__inner--open' : 'chatgpt-canva-pane-wrapper__inner--closed'}`}
              >
              <ChatCanvaPane 
                width={uiState.canvaWidth}
                onWidthChange={uiState.setCanvaWidth}
              />
              </div>
            </div>
          )}
          </div>
        </div>
        
        {/* Modale connexion requise (non connecté) */}
        <AuthRequiredModal isOpen={!authLoading && !user} />

        {/* Debug modèle (bas à droite) */}
        <ModelDebug modelInfo={modelInfo} />
      </div>
  );
};

export default ChatFullscreenV2;
