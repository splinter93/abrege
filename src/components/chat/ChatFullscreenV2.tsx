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
import type { Agent } from '@/types/chat';
import type { MessageContent, ImageAttachment } from '@/types/image';

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
import SidebarUltraClean from './SidebarUltraClean';
import ChatCanvaPane from './ChatCanvaPane';
import ModelDebug, { type ModelDebugInfo } from './ModelDebug';
import { useCanvaStore } from '@/store/useCanvaStore';
import { useCanvaContextPayload } from '@/hooks/chat/useCanvaContextPayload';
import type { CanvaSession as CanvaSessionDB, ListCanvasResponse } from '@/types/canva';

import { simpleLogger as logger } from '@/utils/logger';
import { getSupabaseClient } from '@/utils/supabaseClientSingleton';

import '@/styles/chat-clean.css';
import '@/styles/sidebar-collapsible.css';

const ChatFullscreenV2: React.FC = () => {
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
      canva_context: canvaContextPayload
    };
  }, [llmContext, canvaContextPayload]);

  // 🎯 INFINITE MESSAGES (lazy loading)
  const {
    messages: infiniteMessages,
    isLoading: isLoadingMessages,
    isLoadingMore,
    hasMore,
    loadInitialMessages,
    loadMoreMessages,
    addMessage: addInfiniteMessage,
    replaceMessages,
    clearMessages: clearInfiniteMessages
  } = useInfiniteMessages({
    sessionId: currentSession?.id || null,
    initialLimit: INITIAL_MESSAGES_LIMIT,
    loadMoreLimit: 20,
    enabled: !!currentSession?.id
  });

  // 🎯 SCROLL AUTOMATION (centralisé dans useChatScroll)
  const { messagesEndRef } = useChatScroll({
    autoScroll: true, // ✅ Scroll auto pour messages user uniquement
    messages: infiniteMessages,
    watchLayoutChanges: isDesktop, // ✅ Détecter changements de layout (canva)
    layoutTrigger: isCanvaOpen // ✅ Trigger quand canva s'ouvre/ferme
  });

  // 🎯 EFFECTS (extrait dans useChatFullscreenEffects)

  // 🎯 NOUVEAUX HOOKS CUSTOM (logique extraite)
  const streamingState = useStreamingState();
  
  // 🎯 GESTION ERREURS STREAMING (utilise uiState)
  
  const animations = useChatAnimations({
    currentSessionId: currentSession?.id || null,
    isLoadingMessages
  });

  // 🎯 HANDLERS CENTRALISÉS
  const { handleComplete, handleError, handleToolResult, handleToolExecutionComplete } = useChatHandlers({
    onComplete: async (fullContent, fullReasoning, toolCalls, toolResults, streamTimeline) => {
      // ✅ Simple et propre : juste ajouter le message et reset le streaming
      const assistantMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant' as const,
        content: fullContent,
        reasoning: fullReasoning,
        tool_results: toolResults || [],
        stream_timeline: streamTimeline,
        timestamp: new Date().toISOString()
      };
      
      addInfiniteMessage(assistantMessage);
      streamingState.endStreaming();
      
      // ✅ Clear l'erreur si succès
      uiState.setStreamError(null);
      
      // ✅ Reset padding UNIQUEMENT si le message assistant dépasse (évite saccade si court)
      requestAnimationFrame(() => {
        const container = uiState.messagesContainerRef.current;
        if (!container) return;
        
        // Trouver le dernier message assistant dans le DOM
        const assistantMessages = container.querySelectorAll('.chatgpt-message-assistant');
        const lastAssistant = assistantMessages[assistantMessages.length - 1] as HTMLElement;
        
        if (lastAssistant) {
          const messageHeight = lastAssistant.offsetHeight;
          const viewportHeight = window.innerHeight;
          const threshold = viewportHeight * 0.6; // Si dépasse 50% du viewport
          
          // Reset padding seulement si le message est long
          if (messageHeight > threshold) {
            container.style.paddingBottom = '';
            logger.dev('[ChatFullscreenV2] ✅ Message long → padding reset');
          } else {
            logger.dev('[ChatFullscreenV2] ✅ Message court → padding gardé');
          }
        }
      });
    },
    onError: (error) => {
      // ✅ Stocker l'erreur structurée pour affichage
      const errorDetails = typeof error === 'string' 
        ? { error, timestamp: Date.now() }
        : error;
      
      uiState.setStreamError(errorDetails);
      streamingState.endStreaming();
      
      logger.error('[ChatFullscreenV2] ❌ Erreur streaming reçue:', errorDetails);
      
      // ✅ Pas de toast : le log d'erreur dans l'UI suffit
    }
  });

  // 🎯 CHAT RESPONSE (streaming)
  // ✅ FIX: Extraire les callbacks pour éviter les re-renders
  const { updateContent, startStreaming, endStreaming } = streamingState;
  
  // ✅ NOUVEAU : État pour info modèle (debug)
  const [modelInfo, setModelInfo] = useState<ModelDebugInfo | null>(null);
  
  const { sendMessage } = useChatResponse({
    useStreaming: true,
    onStreamChunk: updateContent,
    onStreamStart: startStreaming,
    onStreamEnd: endStreaming,
    onModelInfo: (info) => {
      // ✅ NOUVEAU : Capturer l'info du modèle depuis le stream
      setModelInfo(info);
    },
    onToolExecution: (toolCount, toolCalls) => {
      // ✅ FIX TypeScript : Garantir type: 'function'
      const typedToolCalls = toolCalls.map(tc => ({
        ...tc,
        type: 'function' as const
      }));
      streamingState.addToolExecution(typedToolCalls, toolCount);
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
      // ✅ SOLUTION SIMPLE: Juste reset la timeline
      // Le message assistant est déjà dans infiniteMessages (ajouté par handleComplete)
      // Donc pas besoin de reload !
      streamingState.reset();
      
      // ✅ Clear l'erreur quand un nouveau message est envoyé
      uiState.setStreamError(null);
      
      logger.dev('[ChatFullscreenV2] ✅ Timeline reset, historique complet dans infiniteMessages');
    }
  });
  
  // 🎯 UI ACTIONS (extrait dans hook)
  const allowSidebarHover = isDesktop && !isCanvaOpen;
  
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
  }, [currentSession?.id, uiState.setStreamError]);

  // 🎯 HANDLERS UI (extrait dans useChatFullscreenUIActions)
  useEffect(() => {
    if (!allowSidebarHover) {
      uiState.setSidebarHovered(false);
    }
  }, [allowSidebarHover, uiState.setSidebarHovered]);

  // ✅ SUPPRIMÉ : Plus d'auto-sélection de session
  // L'utilisateur choisit explicitement (via agent favori ou clic sidebar)

  // 🎯 Layout (utilise uiState)

  // 🎯 RENDU (100% déclaratif avec composants extraits)
  return (
      <div className={`chatgpt-container ${(isDesktop && isCanvaOpen) ? 'canva-active' : ''}`}>
      <ChatHeader
        sidebarOpen={uiState.sidebarOpen}
        onToggleSidebar={uiActions.handleSidebarToggle}
        selectedAgent={selectedAgent}
        agentNotFound={agentNotFound}
        agentDropdownOpen={uiState.agentDropdownOpen}
        onToggleAgentDropdown={() => uiState.setAgentDropdownOpen(!uiState.agentDropdownOpen)}
        isAuthenticated={isAuthenticated}
        authLoading={authLoading}
        chatSessionId={currentSession?.id || null}
        activeCanvaId={activeCanvaId}
        isCanvaOpen={isCanvaOpen}
        onOpenNewCanva={isDesktop ? uiActions.handleOpenCanva : undefined}
        onSelectCanva={uiActions.handleSelectCanva}
        onCloseCanva={uiActions.handleCloseCanva}
        canOpenCanva={isDesktop}
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
                <ChatMessagesArea
                  messages={effects.displayMessages}
                  isLoading={isLoadingMessages}
                  isLoadingMore={isLoadingMore}
                  hasMore={hasMore}
                  isStreaming={streamingState.isStreaming}
                  isFading={streamingState.isFading}
                  streamingTimeline={streamingState.streamingTimeline}
                  streamStartTime={streamingState.streamStartTime}
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
                  containerRef={uiState.messagesContainerRef}
                  messagesEndRef={messagesEndRef}
                  keyboardInset={uiState.keyboardInset}
                />

                <ChatInputContainer
                  onSend={uiActions.handleSendMessage}
                  loading={messageActions.isLoading}
                  sessionId={currentSession?.id || 'temp'}
                  currentAgentModel={selectedAgent?.model}
                  editingMessageId={editingMessage?.messageId || null}
                  editingContent={uiState.editingContent}
                  onCancelEdit={uiActions.handleCancelEdit}
                  textareaRef={uiState.textareaRef}
                  renderAuthStatus={uiActions.renderAuthStatus}
                  selectedAgent={selectedAgent}
                  keyboardInset={uiState.keyboardInset}
                />
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
        
        {/* ✅ NOUVEAU : Debug modèle (bas à droite) */}
        <ModelDebug modelInfo={modelInfo} />
      </div>
  );
};

export default ChatFullscreenV2;
