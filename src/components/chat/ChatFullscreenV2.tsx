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
import { isEmptyAnalysisMessage } from '@/types/chat';
import type { Agent } from '@/types/chat';

// 🎯 NOUVEAUX HOOKS (Phase 2)
import { useStreamingState } from '@/hooks/chat/useStreamingState';
import { useChatAnimations } from '@/hooks/chat/useChatAnimations';
import { useChatMessageActions } from '@/hooks/chat/useChatMessageActions';
import { useSyncAgentWithSession } from '@/hooks/chat/useSyncAgentWithSession';
import { useFavoriteAgent } from '@/hooks/useFavoriteAgent';
import { useAgents } from '@/hooks/useAgents';

// 🎯 NOUVEAUX COMPOSANTS (Phase 3)
import ChatHeader from './ChatHeader';
import ChatMessagesArea from './ChatMessagesArea';
import ChatInputContainer from './ChatInputContainer';
import SidebarUltraClean from './SidebarUltraClean';

import { simpleLogger as logger } from '@/utils/logger';

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
    syncSessions,
    createSession,
    startEditingMessage,
    cancelEditing
  } = useChatStore();

  // 🎯 INFINITE MESSAGES (lazy loading)
  const {
    messages: infiniteMessages,
    isLoading: isLoadingMessages,
    isLoadingMore,
    hasMore,
    loadInitialMessages,
    loadMoreMessages,
    addMessage: addInfiniteMessage,
    clearMessages: clearInfiniteMessages
  } = useInfiniteMessages({
    sessionId: currentSession?.id || null,
    initialLimit: 10,
    loadMoreLimit: 20,
    enabled: !!currentSession?.id
  });

  // 🎯 SCROLL AUTOMATION
  const { messagesEndRef } = useChatScroll({
    autoScroll: true, // ✅ Scroll auto pour messages user uniquement
    messages: infiniteMessages
  });

  // 🎯 ÉTAT INITIALISATION (éviter race condition au premier chargement)
  const [isInitializing, setIsInitializing] = useState(true);

  // 🎯 NOUVEAUX HOOKS CUSTOM (logique extraite)
  const streamingState = useStreamingState();
  
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
      
      // ✅ Reset padding UNIQUEMENT si le message assistant dépasse (évite saccade si court)
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        
        // Trouver le dernier message assistant dans le DOM
        const assistantMessages = container.querySelectorAll('.chatgpt-message-assistant');
        const lastAssistant = assistantMessages[assistantMessages.length - 1] as HTMLElement;
        
        if (lastAssistant) {
          const messageHeight = lastAssistant.offsetHeight;
          const viewportHeight = window.innerHeight;
          const threshold = viewportHeight * 0.5; // Si dépasse 50% du viewport
          
          // Reset padding seulement si le message est long
          if (messageHeight > threshold) {
            container.style.paddingBottom = '';
            logger.dev('[ChatFullscreenV2] ✅ Message long → padding reset');
          } else {
            logger.dev('[ChatFullscreenV2] ✅ Message court → padding gardé');
          }
        }
      });
    }
  });

  // 🎯 CHAT RESPONSE (streaming)
  const { sendMessage } = useChatResponse({
    useStreaming: true,
    onStreamChunk: streamingState.updateContent,
    onStreamStart: streamingState.startStreaming,
    onStreamEnd: streamingState.endStreaming,
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
    llmContext,
    sendMessageFn: sendMessage,
    addInfiniteMessage,
    clearInfiniteMessages,
    loadInitialMessages,
    onEditingChange: (editing: boolean) => {
      if (!editing) cancelEditing();
    },
    requireAuth,
    onBeforeSend: async () => {
      // ✅ SOLUTION SIMPLE: Juste reset la timeline
      // Le message assistant est déjà dans infiniteMessages (ajouté par handleComplete)
      // Donc pas besoin de reload !
      streamingState.reset();
      logger.dev('[ChatFullscreenV2] ✅ Timeline reset, historique complet dans infiniteMessages');
    }
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

  // 🎯 LOAD AGENT FAVORI au mount (responsabilité unique : charger l'agent)
  useFavoriteAgent({
    user: user ? { id: user.id } : null,
    agents,
    agentsLoading,
    onAgentLoaded: (agent: Agent | null) => {
      // ✅ FIX RACE CONDITION : Charger l'agent favori TOUJOURS si aucun agent n'est sélectionné
      // Peu importe le nombre de sessions existantes
      if (!selectedAgent && agent) {
        setSelectedAgent(agent);
        logger.dev('[ChatFullscreenV2] 🌟 Agent favori chargé au mount:', agent.name);
      }
      // ✅ NOUVEAU : Marquer initialisation terminée (agent chargé ou non)
      setIsInitializing(false);
      logger.dev('[ChatFullscreenV2] ✅ Initialisation agent terminée', {
        hasAgent: !!agent,
        agentName: agent?.name || 'none'
      });
    }
  });

  // 🎯 AUTO-CRÉER SESSION VIDE (responsabilité séparée)
  useEffect(() => {
    // ✅ FIX RACE CONDITION : Attendre fin initialisation agent favori
    if (!user || authLoading || isInitializing) {
      logger.dev('[ChatFullscreenV2] ⏭️ Skip création session:', {
        hasUser: !!user,
        authLoading,
        isInitializing
      });
      return;
    }
    
    // ✅ Créer session vide si AUCUNE session ET agent sélectionné
    // Note: async IIFE pour éviter warning useEffect avec async
    const createInitialSession = async () => {
      if (sessions.length === 0 && selectedAgent && !currentSession) {
        logger.dev('[ChatFullscreenV2] 🆕 Création session vide avec agent:', selectedAgent.name);
        const newSession = await createSession('Nouvelle conversation', selectedAgent.id);
        if (newSession) {
          logger.dev('[ChatFullscreenV2] ✅ Session vide créée (is_empty: true)');
        }
      }
    };
    
    createInitialSession();
  }, [sessions.length, selectedAgent?.id, currentSession?.id, user, authLoading, isInitializing, createSession]);

  // 🎯 UI STATE LOCAL (minimal - sidebar uniquement)
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [wideMode] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [editingContent, setEditingContent] = useState('');

  // 🎯 REFS
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousSessionIdRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 🎯 HANDLERS UI (simples, pas de logique métier)
  const handleSidebarToggle = useCallback(() => {
    if (!requireAuth()) return;
    setSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar-interacted', 'true');
      localStorage.setItem('sidebar-preference', newState ? 'open' : 'closed');
      return newState;
    });
  }, [requireAuth]);

  const handleSidebarMouseEnter = useCallback(() => {
    if (!isDesktop) return;
    setSidebarHovered(true);
  }, [isDesktop]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!isDesktop) return;
      setSidebarHovered(false);
  }, [isDesktop]);

  const handleEditMessage = useCallback((messageId: string, content: string, index: number) => {
    if (!requireAuth()) return;
    
    const realIndex = infiniteMessages.findIndex(msg => {
      if (msg.id === messageId) return true;
      if (msg.timestamp && messageId.match(/^msg-(\d+)-/)) {
        const timestampMatch = messageId.match(/^msg-(\d+)-/);
        if (timestampMatch) {
          const targetTimestamp = parseInt(timestampMatch[1]);
          const msgTimestamp = new Date(msg.timestamp).getTime();
          return Math.abs(msgTimestamp - targetTimestamp) < 1000 && msg.role === 'user';
        }
      }
      return false;
    });

    if (realIndex === -1) {
      logger.error('[ChatFullscreenV2] ❌ Message non trouvé:', { messageId });
      return;
    }

    startEditingMessage(messageId, content, realIndex);
    setEditingContent(content);
  }, [startEditingMessage, requireAuth, infiniteMessages]);

  const handleCancelEdit = useCallback(() => {
    cancelEditing();
    setEditingContent('');
  }, [cancelEditing]);

  // 🎯 WRAPPER send/edit avec routing édition
  // ✅ NOUVEAU : Support mentions légères
  const handleSendMessage = useCallback(async (
    message: string | import('@/types/image').MessageContent,
    images?: import('@/types/image').ImageAttachment[],
    notes?: Array<{ id: string; slug: string; title: string; markdown_content: string }>,
    mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number; created_at?: string }>
  ) => {
    // ✏️ Si en mode édition, router vers editMessage
    if (editingMessage) {
      let textContent = '';
      if (typeof message === 'string') {
        textContent = message;
      } else if (Array.isArray(message)) {
        const textPart = message.find(part => part.type === 'text');
        textContent = textPart && 'text' in textPart ? textPart.text : '';
      }
      await messageActions.editMessage(editingMessage.messageId, textContent, images);
      return;
    }

    // Mode normal (avec mentions légères)
    await messageActions.sendMessage(message, images, notes, mentions);
  }, [editingMessage, messageActions]);

  // 🎯 RENDER AUTH STATUS
  const renderAuthStatus = useCallback(() => {
    if (authLoading) return null;
    
    if (!user) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mx-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Authentification requise</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Vous devez être connecté pour utiliser le chat et les outils.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  }, [authLoading, user]);

  // 🎯 MESSAGES AFFICHÉS (calcul optimisé)
  const displayMessages = useMemo(() => {
    if (animations.displayedSessionId !== currentSession?.id) return [];
    if (infiniteMessages.length === 0) return [];
    
    // ✅ OPTIMISATION: Pas de sort, les messages sont déjà triés par sequence_number depuis DB
    let filtered = infiniteMessages.filter(msg => {
      if (msg.role === 'user') return true;
      if (msg.role === 'assistant' && msg.content) return true;
      if (msg.role === 'tool') return true;
      if (isEmptyAnalysisMessage(msg)) return false;
      return true;
    });
    
    // ✏️ Si en édition, masquer le message édité et ceux qui suivent
    if (editingMessage) {
      const editedMsgIndex = filtered.findIndex(msg =>
        msg.id === editingMessage.messageId ||
        (msg.timestamp && editingMessage.messageId.includes(new Date(msg.timestamp).getTime().toString()))
      );
      
      if (editedMsgIndex !== -1) {
        filtered = filtered.slice(0, editedMsgIndex);
      }
    }
    
    return filtered;
  }, [infiniteMessages, animations.displayedSessionId, currentSession?.id, editingMessage]);

  // 🎯 EFFECTS (minimalistes)

  // Sidebar fermée par défaut
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  // Fermer sidebar en passant mobile
  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false);
      setSidebarHovered(false);
    }
  }, [isDesktop]);

  // Fermer sidebar mobile après changement session
  useEffect(() => {
    if (!isDesktop && sidebarOpen && currentSession) {
      const currentId = currentSession.id;

      if (previousSessionIdRef.current !== null && previousSessionIdRef.current !== currentId) {
        const timer = setTimeout(() => setSidebarOpen(false), 300);
        previousSessionIdRef.current = currentId;
        return () => clearTimeout(timer);
      }

      previousSessionIdRef.current = currentId;
    }
  }, [currentSession?.id, isDesktop, sidebarOpen]);

  // Sync sessions on auth
  useEffect(() => {
    if (user && !authLoading) {
      syncSessions();
    }
  }, [syncSessions, user, authLoading]);

  // Détecter changement session et vider immédiatement
  useEffect(() => {
    if (currentSession?.id && currentSession.id !== previousSessionIdRef.current) {
      animations.setDisplayedSessionId(null);
      animations.resetAnimation();
      clearInfiniteMessages();
      streamingState.reset(); // ✅ Reset le streaming précédent aussi
      // ✅ Reset padding inline éventuel appliqué par useChatScroll (scroll padding temporaire)
      if (messagesContainerRef.current) {
        messagesContainerRef.current.style.paddingBottom = '';
      }
      previousSessionIdRef.current = currentSession.id;
    }

    if (!isLoadingMessages && !animations.displayedSessionId && currentSession?.id) {
      animations.setDisplayedSessionId(currentSession.id);
    }
  }, [currentSession?.id, animations, isLoadingMessages, infiniteMessages.length, clearInfiniteMessages, streamingState]);


  // Animation + scroll quand session chargée
  useEffect(() => {
    if (
      animations.displayedSessionId === currentSession?.id &&
      !isLoadingMessages &&
      !animations.messagesVisible
    ) {
      animations.triggerFadeIn(
        currentSession.id,
        infiniteMessages,
        messagesContainerRef
      );
    }
  }, [
    animations.displayedSessionId,
    currentSession?.id,
    infiniteMessages.length,
    animations.messagesVisible,
    isLoadingMessages,
    animations
  ]);

  // Infinite scroll detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore || isLoadingMore) return;

    const handleScroll = () => {
      if (container.scrollTop < 50) {
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  // ✅ SUPPRIMÉ : Plus d'auto-sélection de session
  // L'utilisateur choisit explicitement (via agent favori ou clic sidebar)

  // 🎯 RENDU (100% déclaratif avec composants extraits)
  return (
      <div className={`chatgpt-container ${wideMode ? 'wide-mode' : ''}`}>
      <ChatHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleSidebarToggle}
        selectedAgent={selectedAgent}
        agentNotFound={agentNotFound}
        agentDropdownOpen={agentDropdownOpen}
        onToggleAgentDropdown={() => setAgentDropdownOpen(!agentDropdownOpen)}
        isAuthenticated={isAuthenticated}
        authLoading={authLoading}
      />

      {/* Zone hover invisible sidebar */}
      {isDesktop && (
        <div 
          className="sidebar-hover-zone"
          onMouseEnter={handleSidebarMouseEnter}
        />
      )}

      <div className={`chatgpt-content ${(sidebarOpen || (isDesktop && sidebarHovered)) ? 'sidebar-open' : ''}`}>
        {/* Sidebar */}
        <div 
          {...(isDesktop ? {
            onMouseEnter: handleSidebarMouseEnter,
            onMouseLeave: handleSidebarMouseLeave
          } : {})}
        >
        <SidebarUltraClean
            isOpen={isDesktop ? (sidebarOpen || sidebarHovered) : sidebarOpen}
          isDesktop={isDesktop}
          onClose={() => {
            if (user && !authLoading) {
              setSidebarOpen(false);
            }
          }}
          onForceClose={() => {
            if (user && !authLoading) {
              setSidebarOpen(false);
              setSidebarHovered(false);
            }
          }}
        />
        </div>

        {/* Overlay mobile */}
        {!isDesktop && sidebarOpen && (
          <div 
            className="chatgpt-sidebar-overlay visible" 
            onClick={() => {
              if (user && !authLoading) {
                setSidebarOpen(false);
              }
            }} 
          />
        )}

        {/* Zone principale */}
          <div className="chatgpt-main">
          <ChatMessagesArea
            messages={displayMessages}
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
            onEditMessage={handleEditMessage}
            containerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
          />

          <ChatInputContainer
              onSend={handleSendMessage} 
            loading={messageActions.isLoading}
              sessionId={currentSession?.id || 'temp'}
              currentAgentModel={selectedAgent?.model}
              editingMessageId={editingMessage?.messageId || null}
              editingContent={editingContent}
              onCancelEdit={handleCancelEdit}
            textareaRef={textareaRef}
            renderAuthStatus={renderAuthStatus}
            selectedAgent={selectedAgent}
            />
          </div>
        </div>
      </div>
  );
};

export default ChatFullscreenV2;
