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
import { supabase } from '@/supabaseClient';

// 🎯 NOUVEAUX HOOKS (Phase 2)
import { useStreamingState } from '@/hooks/chat/useStreamingState';
import { useChatAnimations } from '@/hooks/chat/useChatAnimations';
import { useChatMessageActions } from '@/hooks/chat/useChatMessageActions';
import { useSyncAgentWithSession } from '@/hooks/chat/useSyncAgentWithSession';
import { useAgents } from '@/hooks/useAgents';

// 🎯 NOUVEAUX COMPOSANTS (Phase 3)
import ChatHeader from './ChatHeader';
import ChatMessagesArea from './ChatMessagesArea';
import ChatInputContainer from './ChatInputContainer';
import SidebarUltraClean from './SidebarUltraClean';
import ChatCanvaPane from './ChatCanvaPane';
import dynamic from 'next/dynamic';
import { useCanvaStore } from '@/store/useCanvaStore';
import { useCanvaContextPayload } from '@/hooks/chat/useCanvaContextPayload';
import type { CanvaSession as CanvaSessionDB, ListCanvasResponse } from '@/types/canva';

import { simpleLogger as logger } from '@/utils/logger';
import toast from 'react-hot-toast';

import '@/styles/chat-clean.css';
import '@/styles/sidebar-collapsible.css';

const CanvaStatusIndicator = dynamic(
  () => import('./CanvaStatusIndicator'),
  { ssr: false }
);

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
  
  const [canvaWidth, setCanvaWidth] = useState(66); // 66% par défaut

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

  const handleOpenCanva = useCallback(async () => {
    if (!user?.id || !currentSession?.id) {
      return;
    }
    const previousCanvaId = activeCanvaId;

    try {
      const newSession = await openCanva(user.id, currentSession.id); // ✅ Passer chatSessionId
      logger.dev('[ChatFullscreenV2] Canva opened', {
        newCanvaId: newSession.id,
        noteId: newSession.noteId,
        previousCanvaId
      });

      if (previousCanvaId && previousCanvaId !== newSession.id) {
        try {
          await closeCanva(previousCanvaId);
          logger.dev('[ChatFullscreenV2] Previous canva closed', { previousCanvaId });
        } catch (closeError) {
          logger.error('[ChatFullscreenV2] Failed to close previous canva', closeError);
        }
      }
    } catch (error) {
      logger.error('[ChatFullscreenV2] Failed to open canva', error);
      toast.error('Impossible d\'ouvrir le canva');
    }
  }, [openCanva, closeCanva, user, currentSession, activeCanvaId]);

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

  // 🎯 SCROLL AUTOMATION
  const { messagesEndRef } = useChatScroll({
    autoScroll: true, // ✅ Scroll auto pour messages user uniquement
    messages: infiniteMessages
  });

  // 🎯 ÉTAT INITIALISATION (éviter race condition au premier chargement)
  const [isInitializing, setIsInitializing] = useState(true);
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined' || !('visualViewport' in window)) {
      return;
    }

    const handleViewportChange = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const heightDiff = window.innerHeight - viewport.height;
      const isKeyboardVisible = heightDiff > 120 && viewport.height < window.innerHeight;
      setKeyboardInset(isKeyboardVisible ? heightDiff : 0);
    };

    handleViewportChange();
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, []);

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
    llmContext: llmContextWithCanva,
    sendMessageFn: sendMessage,
    addInfiniteMessage,
    onEditingChange: (editing: boolean) => {
      if (!editing) {
        cancelEditing();
        setEditingContent('');
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

  // 🎯 SYNC SESSIONS + AUTO-SELECT DERNIÈRE CONVERSATION + AGENT (flow séquentiel optimal)
  useEffect(() => {
    // ✅ Attendre auth uniquement (pas isInitializing, car on gère l'init ici)
    if (!user || authLoading || agentsLoading) {
      return;
    }

    // ✅ FIX RACE CONDITION : Tout séquentiel (sessions → session → agent)
    let isMounted = true;

    const initializeChat = async () => {
      try {
        // 1️⃣ Sync sessions depuis DB
        await syncSessions();
        
        if (!isMounted) return;
        
        // 2️⃣ Lire l'état actuel du store (mis à jour par syncSessions)
        const storeState = useChatStore.getState();
        
        // 3️⃣ Auto-select dernière conversation si aucune session active
        if (!storeState.currentSession && storeState.sessions.length > 0) {
          // Sessions déjà triées par updated_at DESC (plus récente en premier)
          const lastSession = storeState.sessions[0];
          setCurrentSession(lastSession);
          logger.dev('[ChatFullscreenV2] 🎯 Auto-select dernière conversation:', {
            id: lastSession.id,
            name: lastSession.name,
            agentId: lastSession.agent_id
          });

          // 4️⃣ Charger l'agent de la session (si agent_id existe)
          if (lastSession.agent_id && agents.length > 0) {
            const sessionAgent = agents.find(a => a.id === lastSession.agent_id);
            if (sessionAgent) {
              setSelectedAgent(sessionAgent);
              logger.dev('[ChatFullscreenV2] ✅ Agent de la session chargé:', sessionAgent.name);
            }
          }
        } else if (storeState.sessions.length === 0 && agents.length > 0) {
          // 5️⃣ FALLBACK : Aucune session → charger agent favori
          const { data: userData } = await supabase
            .from('users')
            .select('favorite_agent_id')
            .eq('id', user.id)
            .single();

          const favoriteAgentId = userData?.favorite_agent_id;
          const favoriteAgent = favoriteAgentId 
            ? agents.find(a => a.id === favoriteAgentId) 
            : agents[0];

          if (favoriteAgent) {
            setSelectedAgent(favoriteAgent);
            logger.dev('[ChatFullscreenV2] 🌟 Agent favori chargé (aucune session):', favoriteAgent.name);
          }
        }

        // 6️⃣ Marquer initialisation terminée
        setIsInitializing(false);
        logger.dev('[ChatFullscreenV2] ✅ Initialisation chat terminée');

      } catch (error) {
        logger.error('[ChatFullscreenV2] ❌ Erreur initialisation chat:', error);
        setIsInitializing(false);
      }
    };

    initializeChat();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, agentsLoading, agents, syncSessions, setCurrentSession, setSelectedAgent]);

  // 🎯 FERMER CANVA SI PAS ASSOCIÉ À SESSION ACTUELLE
  useEffect(() => {
    // Ne rien faire si pas encore initialisé ou pas de session
    if (!currentSession?.id || !user?.id || authLoading) {
      return;
    }

    // Si un canva est actif, vérifier qu'il appartient à la session actuelle
    if (isCanvaOpen && activeCanvaId) {
      const activeCanva = canvaSessions[activeCanvaId];
      
      // ✅ Ignorer si chatSessionId est vide (session locale pas encore hydratée)
      // ✅ Ne fermer que si chatSessionId est défini ET différent de la session actuelle
      if (activeCanva && 
          activeCanva.chatSessionId && 
          activeCanva.chatSessionId !== currentSession.id) {
        logger.info('[ChatFullscreenV2] 🔄 Fermeture canva : appartient à une autre session', {
          activeCanvaId,
          activeCanvaChatSessionId: activeCanva.chatSessionId,
          currentSessionId: currentSession.id
        });
        
        closeCanva(activeCanvaId).catch((error) => {
          logger.error('[ChatFullscreenV2] ❌ Erreur fermeture canva lors changement session', error);
        });
      }
    }
  }, [currentSession?.id, isCanvaOpen, activeCanvaId, canvaSessions, closeCanva, user?.id, authLoading]);

  // 🎯 AUTO-ACTIVATE OPEN CANVA on session load
  useEffect(() => {
    // Ne rien faire si pas encore initialisé ou pas de session
    if (!currentSession?.id || !user?.id || authLoading) {
      return;
    }

    // Ne rien faire si un canva est déjà actif (évite double activation)
    // ✅ Vérifier aussi que le canva actif appartient à la session actuelle
    if (isCanvaOpen && activeCanvaId) {
      const activeCanva = canvaSessions[activeCanvaId];
      // Si le canva actif appartient à la session actuelle, ne rien faire
      if (activeCanva && activeCanva.chatSessionId === currentSession.id) {
        return;
      }
    }

    let isMounted = true;

    const loadAndActivateOpenCanva = async () => {
      try {
        // Récupérer token auth
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token || !isMounted) {
          return;
        }

        // Charger les canvas de cette session
        const response = await fetch(`/api/v2/canva/sessions?chat_session_id=${currentSession.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'X-Client-Type': 'canva_auto_activate'
          }
        });

        if (!response.ok || !isMounted) {
          return;
        }

        const data = await response.json() as ListCanvasResponse;
        const canvases = data.canva_sessions || [];

        // Trouver tous les canvas avec status='open'
        const openCanvas = canvases.filter((c: CanvaSessionDB) => c.status === 'open');

        if (openCanvas.length === 0) {
          // Pas de canva ouvert → chat normal
          return;
        }

        // ✅ FALLBACK : Si plusieurs canvas sont 'open' (cas d'erreur/race condition)
        // On prend le dernier (updated_at le plus récent, ou created_at si pas de updated_at)
        let selectedCanva = openCanvas[0];
        if (openCanvas.length > 1) {
          logger.warn('[ChatFullscreenV2] ⚠️ Multiple open canvases detected, using fallback (most recent)', {
            count: openCanvas.length,
            canvases: openCanvas.map((c: CanvaSessionDB) => ({ id: c.id, created_at: c.created_at }))
          });

          // Trier par created_at DESC (le plus récent en premier)
          // Note: CanvaSession n'a pas updated_at, on utilise created_at
          selectedCanva = openCanvas.sort((a: CanvaSessionDB, b: CanvaSessionDB) => {
            const aDate = a.created_at || '';
            const bDate = b.created_at || '';
            return bDate.localeCompare(aDate); // DESC order
          })[0];

          // ✅ FALLBACK ACTION : Fermer les autres canvas 'open' (cleanup)
          try {
            await Promise.all(
              openCanvas
                .filter((c: CanvaSessionDB) => c.id !== selectedCanva.id)
                .map((otherCanva: CanvaSessionDB) =>
                  fetch(`/api/v2/canva/sessions/${otherCanva.id}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                      'X-Client-Type': 'canva_fallback_cleanup'
                    },
                    body: JSON.stringify({ status: 'closed' })
                  })
                )
            );

            logger.info('[ChatFullscreenV2] ✅ Fallback cleanup: closed other open canvases', {
              closedCount: openCanvas.length - 1,
              keptCanvaId: selectedCanva.id
            });
          } catch (cleanupError) {
            logger.error('[ChatFullscreenV2] ⚠️ Error during fallback cleanup', cleanupError);
            // Continue quand même, on active le canva sélectionné
          }
        }

        if (selectedCanva && selectedCanva.note_id && isMounted) {
          logger.info('[ChatFullscreenV2] 🔄 Auto-activating open canva on load', {
            canvaId: selectedCanva.id,
            noteId: selectedCanva.note_id,
            chatSessionId: currentSession.id,
            isFallback: openCanvas.length > 1
          });

          // Activer automatiquement le canva ouvert (le plus récent si plusieurs)
          await switchCanva(selectedCanva.id, selectedCanva.note_id);
        }
      } catch (error) {
        logger.error('[ChatFullscreenV2] ❌ Error auto-activating open canva', error);
      }
    };

    loadAndActivateOpenCanva();

    return () => {
      isMounted = false;
    };
  }, [currentSession?.id, user?.id, authLoading, isCanvaOpen, activeCanvaId, canvaSessions, switchCanva]);

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

  const allowSidebarHover = isDesktop && !isCanvaOpen;

  const handleSidebarMouseEnter = useCallback(() => {
    if (!allowSidebarHover) return;
    setSidebarHovered(true);
  }, [allowSidebarHover]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!allowSidebarHover) return;
    setSidebarHovered(false);
  }, [allowSidebarHover]);

  useEffect(() => {
    if (!allowSidebarHover) {
      setSidebarHovered(false);
    }
  }, [allowSidebarHover]);

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
  // ✅ NOUVEAU : Support mentions légères + prompts
  const handleSendMessage = useCallback(async (
    message: string | import('@/types/image').MessageContent,
    images?: import('@/types/image').ImageAttachment[],
    notes?: Array<{ id: string; slug: string; title: string; markdown_content: string }>,
    mentions?: Array<{ id: string; slug: string; title: string; description?: string; word_count?: number; created_at?: string }>,
    usedPrompts?: import('@/types/promptMention').PromptMention[] // ✅ NOUVEAU : Prompts metadata (slug au lieu de name)
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
      await messageActions.editMessage({
        messageId: editingMessage.messageId,
        newContent: textContent,
        images,
        messageIndex: editingMessage.messageIndex
      });
      return;
    }

    // Mode normal (avec mentions légères + prompts metadata)
    await messageActions.sendMessage(message, images, notes, mentions, usedPrompts);
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
    if (animations.displayedSessionId && animations.displayedSessionId !== currentSession?.id) return [];
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
      let cutIndex = -1;
      
      if (typeof editingMessage.messageIndex === 'number') {
        cutIndex = Math.min(Math.max(editingMessage.messageIndex, 0), filtered.length);
      }
      
      if (cutIndex === -1) {
        const fallbackIndex = filtered.findIndex(msg =>
          msg.id === editingMessage.messageId ||
          (msg.timestamp && editingMessage.messageId.includes(new Date(msg.timestamp).getTime().toString()))
        );
        if (fallbackIndex !== -1) {
          cutIndex = fallbackIndex;
        }
      }
      
      if (cutIndex !== -1) {
        filtered = filtered.slice(0, cutIndex);
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

  // ✅ REMOVED: Sync sessions déplacé dans useEffect optimisé ci-dessus (évite duplication)

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
      currentSession?.id &&
      infiniteMessages.length > 0 &&
      !isLoadingMessages &&
      (
        animations.displayedSessionId !== currentSession.id ||
        !animations.messagesVisible
      )
    ) {
      animations.triggerFadeIn(
        currentSession.id,
        infiniteMessages,
        messagesContainerRef
      );
    }
  }, [
    currentSession?.id,
    infiniteMessages,
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
      <div className={`chatgpt-container ${wideMode ? 'wide-mode' : ''} ${(isDesktop && isCanvaOpen) ? 'canva-active' : ''}`}>
      <ChatHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleSidebarToggle}
        selectedAgent={selectedAgent}
        agentNotFound={agentNotFound}
        agentDropdownOpen={agentDropdownOpen}
        onToggleAgentDropdown={() => setAgentDropdownOpen(!agentDropdownOpen)}
        isAuthenticated={isAuthenticated}
        authLoading={authLoading}
        chatSessionId={currentSession?.id || null}
        activeCanvaId={activeCanvaId}
        isCanvaOpen={isCanvaOpen}
        onOpenNewCanva={isDesktop ? handleOpenCanva : undefined}
            onSelectCanva={async (canvaId, noteId) => {
              try {
                logger.dev('[ChatFullscreenV2] Switching canva', { canvaId, noteId });
                const result = await switchCanva(canvaId, noteId);
                if (result === 'not_found') {
                  toast.error('Canva introuvable (note supprimée ou inaccessible)');
                  return;
                }
                toast.success('Canva ouvert');
              } catch (error) {
                logger.error('[ChatFullscreenV2] Failed to switch canva', error);
                toast.error('Erreur ouverture canva');
              }
            }}
        onCloseCanva={async (canvaId) => {
          try {
            await closeCanva(canvaId);
            toast.success('Canva fermé');
          } catch (error) {
            logger.error('[ChatFullscreenV2] Failed to close canva', error);
            toast.error('Erreur fermeture canva');
          }
        }}
        canOpenCanva={isDesktop}
      />

      {/* Zone hover invisible sidebar */}
      {allowSidebarHover && (
        <div 
          className="sidebar-hover-zone"
          onMouseEnter={handleSidebarMouseEnter}
        />
      )}

      <div className={`chatgpt-content ${ (sidebarOpen || (allowSidebarHover && sidebarHovered)) ? 'sidebar-open' : ''}`}>
        {/* Sidebar */}
        <div 
          {...(isDesktop ? {
            onMouseEnter: handleSidebarMouseEnter,
            onMouseLeave: handleSidebarMouseLeave
          } : {})}
        >
        <SidebarUltraClean
            isOpen={isDesktop ? (sidebarOpen || (allowSidebarHover && sidebarHovered)) : sidebarOpen}
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
          <div className={`chatgpt-main ${isDesktop && isCanvaOpen ? 'chatgpt-main--with-canva' : ''}`}>
          {isDesktop && isCanvaOpen ? (
            <>
              <div className="chatgpt-main-chat">
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
                  keyboardInset={keyboardInset}
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
                  keyboardInset={keyboardInset}
                />
              </div>
              <ChatCanvaPane 
                width={canvaWidth}
                onWidthChange={setCanvaWidth}
              />
            </>
          ) : (
            <>
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
                keyboardInset={keyboardInset}
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
                keyboardInset={keyboardInset}
              />
            </>
          )}
          </div>
        </div>
        <CanvaStatusIndicator
          payload={canvaContextPayload}
          isLoading={isCanvaContextLoading}
          error={canvaContextError}
        />
      </div>
  );
};

export default ChatFullscreenV2;
