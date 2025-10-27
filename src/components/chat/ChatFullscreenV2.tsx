'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { debounce } from 'lodash';
import { useChatStore } from '@/store/useChatStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useLLMContext, useLLMContextFormatted } from '@/hooks/useLLMContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useChatHandlers } from '@/hooks/useChatHandlers';
import { 
  ChatMessage as ChatMessageType, 
  AssistantMessage,
  isEmptyAnalysisMessage,
  hasToolCalls,
  hasReasoning
} from '@/types/chat';
import { supabase } from '@/supabaseClient';
import { tokenManager } from '@/utils/tokenManager';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import SidebarUltraClean from './SidebarUltraClean';
import MessageLoader from './MessageLoader';
import AgentInfoDropdown from './AgentInfoDropdown';
import { StreamingIndicator, type StreamingState } from './StreamingIndicator';
import StreamTimelineRenderer from './StreamTimelineRenderer';
import { simpleLogger as logger } from '@/utils/logger';
import { useInfiniteMessages } from '@/hooks/useInfiniteMessages';
import Link from 'next/link';

import './ToolCallMessage.css';
import '@/styles/chat-clean.css';
import '@/styles/sidebar-collapsible.css';

const ChatFullscreenV2: React.FC = () => {
  // 🎯 Hooks optimisés
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [wideMode, setWideMode] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  
  // 🎯 Auth centralisée
  const { requireAuth, user, loading: authLoading, isAuthenticated } = useAuthGuard();
  
  // 🎯 Contexte LLM unifié
  const llmContext = useLLMContext({
    includeRecent: false,  // Pas d'historique pour l'instant
    includeDevice: true,
    compactFormat: true
  });
  const {
    sessions,
    currentSession,
    selectedAgent,
    selectedAgentId,
    loading,
    editingMessage,
    setCurrentSession,
    setSelectedAgent,
    setSelectedAgentId,
    setError,
    setLoading,
    syncSessions,
    createSession,
    addMessage,
    startEditingMessage,
    cancelEditing
  } = useChatStore();



  // 🎯 Refs
  const toolFlowActiveRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousSessionIdRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 🎯 Lazy loading des messages avec infinite scroll
  const {
    messages: infiniteMessages,
    isLoading: isLoadingMessages,
    isLoadingMore,
    hasMore,
    loadInitialMessages,
    loadMoreMessages,
    addMessage: addInfiniteMessage,
    replaceMessages: replaceInfiniteMessages,
    clearMessages: clearInfiniteMessages
  } = useInfiniteMessages({
    sessionId: currentSession?.id || null,
    initialLimit: 10,  // 🎯 10 messages pour éviter les problèmes avec images/mermaid
    loadMoreLimit: 20,
    enabled: !!currentSession?.id
  });

  // 🎨 État pour animation fade-in des messages
  const [shouldAnimateMessages, setShouldAnimateMessages] = useState(false);
  const [messagesVisible, setMessagesVisible] = useState(false);
  
  // 🎯 Track session change pour vider immédiatement l'affichage
  const [displayedSessionId, setDisplayedSessionId] = useState<string | null>(null);

  // 🎯 Hook de scroll optimisé
  const { messagesEndRef, scrollToBottom, scrollToLastUserMessage, isNearBottom } = useChatScroll({
    autoScroll: true,
    messages: infiniteMessages
  });

  // 🎯 Handlers centralisés avec skip (on gère les tool calls différemment en streaming)
  const {
    handleComplete,
    handleError,
    handleToolCalls,
    handleToolResult,
    handleToolExecutionComplete
  } = useChatHandlers();
  
  // 🎯 État pour tracker les tool calls du round actuel avec leurs statuts
  const [currentToolCalls, setCurrentToolCalls] = useState<Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
    success?: boolean;
    result?: string;
  }>>([]);

  // 🎯 États pour streaming (affichage progressif)
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageTemp, setStreamingMessageTemp] = useState<ChatMessageType | null>(null);
  
  // 🎯 États pour UI Think-Aloud
  const [streamingState, setStreamingState] = useState<StreamingState>('idle');
  const [executingToolCount, setExecutingToolCount] = useState(0);
  const [currentToolName, setCurrentToolName] = useState<string>('');
  const [currentRound, setCurrentRound] = useState(0);
  
  // ✏️ État pour l'édition de messages
  const [editingContent, setEditingContent] = useState<string>('');
  
  // ✅ NOUVEAU : Timeline progressive pour affichage pendant le streaming
  const [streamingTimeline, setStreamingTimeline] = useState<Array<{
    type: 'text' | 'tool_execution' | 'tool_result';
    content?: string;
    toolCalls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
      success?: boolean;
      result?: string;
    }>;
    toolCount?: number;
    roundNumber?: number;
    timestamp: number;
  }>>([]);
  const [streamStartTime, setStreamStartTime] = useState<number>(0);
  
  // 🎯 Hook de chat avec streaming
  const { isProcessing, sendMessage } = useChatResponse({
    useStreaming: true, // ✅ Activer le streaming
    onStreamChunk: (chunk) => {
      // ✅ Accumuler le contenu pour l'affichage progressif
      setStreamingContent(prev => prev + chunk);
      
      // ✅ NOUVEAU : Alimenter la timeline progressive
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
        } else {
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
        }
      });
    },
    onStreamStart: () => {
      setIsStreaming(true);
      setStreamingContent(''); // Reset pour le nouveau message
      setCurrentRound(0); // ✅ Commencer au round 0
      setStreamingState('thinking');
      // ✅ NOUVEAU : Initialiser la timeline progressive
      setStreamingTimeline([]);
      setStreamStartTime(Date.now());
    },
    onStreamEnd: () => {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingState('idle');
      setCurrentToolCalls([]); // Reset après le stream
      setCurrentRound(0);
      // ✅ NOUVEAU : Clear timeline (sera reconstruite depuis le message persisté)
      setStreamingTimeline([]);
    },
    onToolCalls: (toolCalls) => {
      // ✅ Stocker les tool calls pour affichage pendant l'exécution
      setCurrentToolCalls(toolCalls.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.name || 'unknown',
          arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || {})
        },
        success: undefined // En attente
      })));
    },
    onToolExecution: (toolCount, toolCalls) => {
      setStreamingState('executing');
      setExecutingToolCount(toolCount);
      setCurrentRound(prev => prev + 1);
      
      // ✅ Utiliser directement les tool calls passés en paramètre (pas le state)
      setStreamingTimeline(prev => [
        ...prev,
        {
          type: 'tool_execution' as const,
          toolCalls: toolCalls.map(tc => ({
            ...tc,
            type: 'function' as const, // ✅ Cast explicite
            success: undefined,
            result: undefined
          })),
          toolCount,
          roundNumber: currentRound,
          timestamp: Date.now() - streamStartTime
        }
      ]);
    },
    onToolResult: (toolName, result, success, toolCallId) => {
      // ✅ Mettre à jour le statut du tool en temps réel
      setCurrentToolCalls(prev => prev.map(tc => 
        tc.id === toolCallId 
          ? { ...tc, success, result: typeof result === 'string' ? result : JSON.stringify(result) }
          : tc
      ));
      
      // ✅ NOUVEAU : Mettre à jour les tool calls dans la timeline
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
      
      handleToolResult(toolName, result, success, toolCallId);
    },
    onToolExecutionComplete: async (toolResults) => {
      // Convertir le format pour handleToolExecutionComplete
      const converted = toolResults.map(tr => ({
        tool_call_id: tr.tool_call_id,
        name: tr.name,
        content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
        success: tr.success
      }));
      await handleToolExecutionComplete(converted);
    },
    onComplete: handleComplete, // ✅ Reçoit maintenant la streamTimeline
    onError: handleError
  });

  // 🎯 Sidebar fermée par défaut
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  // 🎯 Fermer sidebar et désactiver hover quand on passe en mode mobile
  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false);
      setSidebarHovered(false);
    }
  }, [isDesktop]);

  // 🎯 Fermer sidebar sur mobile après changement de session
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


  // 🎯 Affichage de l'état d'authentification
  const renderAuthStatus = () => {
    if (authLoading) {
      return (
        <div className="flex items-center justify-center p-4 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
          Vérification de l'authentification...
        </div>
      );
    }
    
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
              <h3 className="text-sm font-medium text-yellow-800">
                Authentification requise
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Vous devez être connecté pour utiliser le chat et les outils.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  // 🎯 Détecter changement de session et vider immédiatement l'affichage
  useEffect(() => {
    if (currentSession?.id && currentSession.id !== previousSessionIdRef.current) {
      // 🚫 Nouvelle session sélectionnée : vider IMMÉDIATEMENT l'affichage et les messages
      setDisplayedSessionId(null);
      setShouldAnimateMessages(false); // Reset animation
      setMessagesVisible(false); // Masquer les messages
      clearInfiniteMessages(); // Nettoyer les anciens messages
      previousSessionIdRef.current = currentSession.id;
    }
    
    // ✅ Une fois les messages chargés (ou conversation vide), activer l'affichage
    if (!isLoadingMessages && !displayedSessionId && currentSession?.id) {
      setDisplayedSessionId(currentSession.id);
    }
  }, [currentSession?.id, displayedSessionId, isLoadingMessages, infiniteMessages.length, clearInfiniteMessages]);

  // 🎯 Messages triés et mémorisés pour l'affichage
  const displayMessages = useMemo(() => {
    // 🚫 Ne rien afficher si la session affichée ne correspond pas à la session active
    if (displayedSessionId !== currentSession?.id) return [];
    if (infiniteMessages.length === 0) return [];
    
    const sorted = [...infiniteMessages].sort(
      (a, b) => {
        const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timestampA - timestampB;
      }
    );

    // ✅ Filtrage intelligent : garder tous les messages importants
    let filtered = sorted.filter(msg => {
      // Toujours garder les messages utilisateur
      if (msg.role === 'user') return true;
      
      // Toujours garder les messages assistant avec du contenu
      if (msg.role === 'assistant' && msg.content) return true;
      
      // Garder les messages tool
      if (msg.role === 'tool') return true;
      
      // Exclure les messages temporaires sans contenu (canal 'analysis' sans content)
      if (isEmptyAnalysisMessage(msg)) return false;
      
      // Par défaut, garder le message
      return true;
    });
    
    // ✏️ Si on est en mode édition, masquer le message en édition ET tous ceux qui suivent
    if (editingMessage) {
      // Trouver l'index du message édité dans le tableau filtré
      const editedMsgIndexInFiltered = filtered.findIndex(msg => 
        msg.id === editingMessage.messageId ||
        (msg.timestamp && editingMessage.messageId.includes(new Date(msg.timestamp).getTime().toString()))
      );
      
      if (editedMsgIndexInFiltered !== -1) {
        // ✅ Garder seulement les messages AVANT celui en édition (pas le message lui-même)
        filtered = filtered.slice(0, editedMsgIndexInFiltered);
      }
    }
    
    // Log optimisé pour le debugging
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[ChatFullscreenV2] 🔍 Messages affichés: ${filtered.length}/${sorted.length}`, {
        total: sorted.length,
        filtered: filtered.length,
        hasToolCalls: filtered.some(hasToolCalls),
        hasReasoning: filtered.some(hasReasoning),
        channels: sorted.map(m => ({ 
          role: m.role, 
          channel: m.role === 'assistant' ? 'assistant' : undefined, 
          hasContent: !!m.content 
        }))
      });
    }
    
    return filtered;
  }, [infiniteMessages, displayedSessionId, currentSession?.id, editingMessage]);

  // 🎯 Effets optimisés
  useEffect(() => {
    if (user && !authLoading) {
      syncSessions();
    }
  }, [syncSessions, user, authLoading]);

  // Restaurer l'agent sélectionné au montage
  useEffect(() => {
    if (!user || authLoading) return;
    
    const restoreSelectedAgent = async () => {
      if (selectedAgentId && !selectedAgent) {
        try {
          logger.dev('[ChatFullscreenV2] 🔄 Restauration agent avec ID:', selectedAgentId);
          const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('id', selectedAgentId)
            .single();
            
          if (agent) {
            setSelectedAgent(agent);
            logger.dev('[ChatFullscreenV2] ✅ Agent restauré:', agent.name);
          } else {
            logger.dev('[ChatFullscreenV2] ⚠️ Agent non trouvé, suppression de l\'ID');
            setSelectedAgentId(null);
          }
        } catch (err) {
          logger.error('[ChatFullscreenV2] ❌ Erreur restauration agent:', err);
        }
      }
    };
    
    restoreSelectedAgent();
  }, [selectedAgentId, selectedAgent, setSelectedAgent, setSelectedAgentId, user, authLoading]);

  // ✅ Scroll et animation quand session chargée
  useEffect(() => {
    // 🎯 Déclencher quand displayedSessionId est mis à jour (messages chargés ou conversation vide)
    if (displayedSessionId === currentSession?.id && !isLoadingMessages && !messagesVisible) {
      
      if (infiniteMessages.length > 0) {
        // 🎯 ÉTAPE 1 : Rendre dans le DOM mais INVISIBLE (opacity: 0)
        setMessagesVisible(false);
        
        // 🎯 ÉTAPE 2 : Attendre que le DOM soit rendu, scroll INSTANTANÉ invisible
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const container = messagesContainerRef.current;
            if (container) {
              // 🎯 Forcer un padding fixe en bas (40px)
              const messagesContainer = container.querySelector('.chatgpt-messages') as HTMLElement;
              if (messagesContainer) {
                messagesContainer.style.paddingBottom = '40px';
              }
              
              // Scroll instantané sans animation (invisible)
              const maxScrollTop = container.scrollHeight - container.clientHeight;
              container.scrollTop = Math.max(0, maxScrollTop);
              
              // 🎯 ÉTAPE 3 : Retry pour les images après 300ms
              setTimeout(() => {
                const newMaxScrollTop = container.scrollHeight - container.clientHeight;
                container.scrollTop = Math.max(0, newMaxScrollTop);
                
                // 🎯 ÉTAPE 4 : Fade-in maintenant que tout est en place
                requestAnimationFrame(() => {
                  setMessagesVisible(true);
                  setShouldAnimateMessages(true);
                  setTimeout(() => setShouldAnimateMessages(false), 400);
                });
              }, 300);
            }
          });
        });
      } else {
        // 🎯 Conversation vide (nouvelle) : afficher directement l'empty state
        setMessagesVisible(true);
        setShouldAnimateMessages(true);
        setTimeout(() => setShouldAnimateMessages(false), 400);
      }
    }
  }, [displayedSessionId, currentSession?.id, infiniteMessages.length, messagesVisible, isLoadingMessages, scrollToBottom]);

  // 🎯 Détection du scroll pour infinite loading
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore || isLoadingMore) return;

    const handleScroll = () => {
      // Détecter si on est proche du haut (50px)
      if (container.scrollTop < 50) {
        logger.dev('[ChatFullscreenV2] 📥 Scroll proche du haut, chargement des messages anciens...');
        loadMoreMessages();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, loadMoreMessages]);

  // 🎯 Synchroniser les nouveaux messages streamés vers le hook infinite
  const lastMessageCountRef = useRef(0);
  useEffect(() => {
    if (!currentSession?.thread) return;
    
    const threadLength = currentSession.thread.length;
    
    // Si le thread a augmenté, ajouter le dernier message au hook infinite
    if (threadLength > lastMessageCountRef.current && threadLength > 0) {
      const newMessage = currentSession.thread[threadLength - 1];
      addInfiniteMessage(newMessage);
      logger.dev('[ChatFullscreenV2] ➕ Nouveau message ajouté au lazy loading:', newMessage.role);
    }
    
    lastMessageCountRef.current = threadLength;
  }, [currentSession?.thread, addInfiniteMessage]);

  // S'assurer qu'une session est sélectionnée SEULEMENT s'il n'y en a aucune
  useEffect(() => {
    if (user && !authLoading && sessions.length > 0 && !currentSession) {
      // ✅ FIX: Sélectionner la session la plus récente seulement si aucune session n'est active
      setCurrentSession(sessions[0]);
      logger.dev('[ChatFullscreenV2] 📌 Auto-sélection de la session la plus récente');
    }
  }, [sessions.length, currentSession, setCurrentSession, user, authLoading]);

  // ❌ DÉSACTIVÉ : Pas d'autoscroll automatique pour nouveaux messages
  // Le scroll est géré manuellement uniquement après l'ajout d'un message user
  
  // ❌ DÉSACTIVÉ : Pas d'autoscroll pendant le streaming
  // On laisse le message assistant s'afficher dans l'espace disponible (padding-bottom: 300px)

  // ✏️ Handlers pour l'édition de messages
  const handleEditMessage = useCallback((messageId: string, content: string, displayIndex: number) => {
    if (!requireAuth()) return;
    
    // ✅ Trouver le vrai index dans infiniteMessages (qui est la source de vérité affichée)
    const realIndex = infiniteMessages.findIndex(msg => {
      if (msg.id === messageId) return true;
      
      // Fallback: chercher par timestamp
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
      logger.error('[ChatFullscreenV2] ❌ Message non trouvé:', {
        messageId,
        displayIndex,
        infiniteMessagesLength: infiniteMessages.length,
        sampleIds: infiniteMessages.slice(0, 5).map(m => ({ id: m.id, timestamp: m.timestamp }))
      });
      return;
    }
    
    startEditingMessage(messageId, content, realIndex);
    setEditingContent(content);
    
    logger.dev('[ChatFullscreenV2] ✏️ Mode édition activé:', { 
      messageId, 
      displayIndex, 
      realIndex 
    });
  }, [startEditingMessage, requireAuth, infiniteMessages]);

  const handleCancelEdit = useCallback(() => {
    cancelEditing();
    setEditingContent('');
    
    logger.dev('[ChatFullscreenV2] ❌ Édition annulée');
  }, [cancelEditing]);

  // 🎯 Handlers optimisés  
  const handleSendMessageInternal = useCallback(async (message: string | import('@/types/image').MessageContent, images?: import('@/types/image').ImageAttachment[]) => {
    // Vérifier si le message a du contenu (texte ou images)
    const hasTextContent = typeof message === 'string' ? message.trim() : true;
    const hasImages = images && images.length > 0;
    
    if (!hasTextContent && !hasImages) return;
    if (loading) return;
    if (!requireAuth()) return;
    
    setLoading(true);
    
    // ✅ Clear completed tool executions pour le nouveau message
    // setCompletedToolExecutions([]); // This line is removed
    
    try {
      if (!currentSession) {
        await createSession();
        setLoading(false);
        return;
      }

      const historyBeforeNewMessage = currentSession.thread || [];
      
      // ✅ FILTRAGE INTELLIGENT: Garder le contexte conversationnel + tools liés uniquement
      // Évite les tool messages orphelins (sans leur assistant parent)
      const historyLimit = currentSession.history_limit || 40;
      const userAssistantMessages = historyBeforeNewMessage.filter(m => 
        m.role === 'user' || m.role === 'assistant'
      );
      const toolMessages = historyBeforeNewMessage.filter(m => 
        m.role === 'tool'
      );
      
      // 1. Garder les 30 messages user/assistant les plus récents
      const recentConversation = userAssistantMessages.slice(-Math.min(historyLimit, 30));
      
      // 2. Extraire UNIQUEMENT les tool_call_id du DERNIER message assistant avec tool_calls
      // ✅ FIX: Ne pas garder les anciens tool results qui polluent l'historique
      const keptToolCallIds = new Set<string>();
      
      // Chercher le dernier assistant avec tool_calls (en partant de la fin)
      for (let i = recentConversation.length - 1; i >= 0; i--) {
        const msg = recentConversation[i];
        if (msg.role === 'assistant' && msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
          // Trouvé ! Garder seulement ces tool_call_id
          msg.tool_calls.forEach(tc => {
            if (tc.id) keptToolCallIds.add(tc.id);
          });
          break; // ✅ Stop après le premier trouvé (le plus récent)
        }
      }
      
      // 3. Garder SEULEMENT les tool messages qui correspondent à ces tool_call_id
      const relevantTools = toolMessages.filter(tm => 
        tm.tool_call_id && keptToolCallIds.has(tm.tool_call_id)
      );
      
      // 🔍 DEBUG: Logger le filtrage des tools
      if (toolMessages.length > 0) {
        logger.dev('[ChatFullscreenV2] 🔍 Filtrage tool messages:', {
          totalToolMessages: toolMessages.length,
          keptToolCallIds: Array.from(keptToolCallIds),
          relevantTools: relevantTools.length,
          filtered: toolMessages.length - relevantTools.length,
          toolMessagesDetails: toolMessages.map(tm => ({
            tool_call_id: tm.tool_call_id,
            name: tm.name,
            hasName: !!tm.name,
            isKept: tm.tool_call_id ? keptToolCallIds.has(tm.tool_call_id) : false
          }))
        });
      }
      
      logger.dev('[ChatFullscreenV2] 📊 Filtrage historique:', {
        total: historyBeforeNewMessage.length,
        userAssistant: recentConversation.length,
        toolsRelevant: relevantTools.length,
        toolsTotal: toolMessages.length,
        toolCallIds: keptToolCallIds.size,
        hasImages: hasImages,
        imageCount: images?.length || 0
      });
      
      // 4. Recombiner et trier par timestamp pour ordre chronologique
      const limitedHistoryForLLM = [...recentConversation, ...relevantTools]
        .sort((a, b) => {
          const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timestampA - timestampB;
        });
      
      // 🔍 DEBUG: Logger l'historique final envoyé au LLM
      logger.info('[ChatFullscreenV2] 📤 Historique envoyé au LLM:', {
        totalMessages: limitedHistoryForLLM.length,
        roles: limitedHistoryForLLM.map(m => m.role),
        hasToolMessages: limitedHistoryForLLM.filter(m => m.role === 'tool').length,
        toolMessagesDetails: limitedHistoryForLLM
          .filter(m => m.role === 'tool')
          .map(m => ({
            tool_call_id: m.tool_call_id,
            name: m.name,
            hasName: !!m.name,
            contentPreview: m.content?.substring(0, 50)
          }))
      });
      
      // Extraire le texte pour la sauvegarde du message
      const messageText = typeof message === 'string' 
        ? message 
        : (message.find((part): part is import('@/types/image').MessageContentPart & { type: 'text' } => part.type === 'text')?.text || '');
      
      // Extraire les images si présentes
      const attachedImages = images?.map(img => ({
        url: img.base64,
        fileName: img.fileName
      }));
      
      const userMessage = {
        role: 'user' as const,
        content: messageText,
        timestamp: new Date().toISOString(),
        ...(attachedImages && attachedImages.length > 0 && { attachedImages })
      };
      
      // Ajouter le message user au store
      await addMessage(userMessage);
      
      // 🎯 Le scroll est géré automatiquement par useChatScroll (détecte message user)

      const tokenResult = await tokenManager.getValidToken();
      if (!tokenResult.isValid || !tokenResult.token) {
        throw new Error(tokenResult.error || 'Token invalide');
      }
      
      // ✅ NOUVEAU : Contexte LLM unifié
      // Le nouveau LLMContext est passé dans uiContext pour compatibilité avec l'orchestrateur
      const contextForLLM = {
        type: 'chat_session' as const,
        id: currentSession.id,
        name: 'Chat Scrivia',
        sessionId: currentSession.id,
        agentId: selectedAgent?.id,
        uiContext: {
          ...llmContext,
          sessionId: currentSession.id
        }
      };

      // ✅ Support multi-modal : Passer le contenu complet (texte ou texte+images)
      // sendMessage acceptera MessageContent pour gérer les images
      await sendMessage(message, currentSession.id, contextForLLM, limitedHistoryForLLM, tokenResult.token);

    } catch (error) {
      logger.error('Erreur lors de l\'appel LLM:', error);
      
      await addMessage({
        role: 'assistant',
        content: 'Désolé, une erreur est survenue lors du traitement de votre message. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  }, [loading, currentSession, createSession, addMessage, selectedAgent, llmContext, sendMessage, setLoading, requireAuth]);

  // ✏️ Handler pour soumettre un message édité
  const handleEditSubmit = useCallback(async (newContent: string, images?: import('@/types/image').ImageAttachment[]) => {
    if (!editingMessage || !currentSession || !requireAuth()) return;
    
    setLoading(true);
    
    try {
      // 1. Appel API pour remplacer le message et supprimer les suivants
      const tokenResult = await tokenManager.getValidToken();
      if (!tokenResult.isValid || !tokenResult.token) {
        throw new Error(tokenResult.error || 'Token non disponible');
      }

      const response = await fetch(
        `/api/ui/chat-sessions/${currentSession.id}/messages/${editingMessage.messageId}/edit`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${tokenResult.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: newContent,
            attachedImages: images?.map(img => ({
              url: img.base64 || img.previewUrl,
              fileName: img.fileName
            }))
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'édition du message');
      }

      // 2. Recharger la session depuis la DB pour avoir le thread à jour
      await syncSessions();
      
      // 3. Forcer le rechargement des messages depuis l'API (sans clear brutal)
      await loadInitialMessages();
      
      // 4. Récupérer la session fraîchement rechargée
      const freshSession = useChatStore.getState().currentSession;
      
      if (!freshSession) {
        throw new Error('Session perdue après édition');
      }

      // 5. Annuler le mode édition
      cancelEditing();
      setEditingContent('');

      logger.info('[ChatFullscreenV2] ✅ Message édité avec succès:', {
        messageId: editingMessage.messageId,
        messagesDeleted: result.data.messagesDeleted
      });

      // 6. Préparer l'historique pour le LLM (messages jusqu'au message édité)
      const historyForLLM = freshSession.thread.filter(m => 
        m.role === 'user' || m.role === 'assistant' || m.role === 'tool'
      );

      // 7. Préparer le contexte pour le LLM
      const contextForLLM = {
        agent: selectedAgent,
        skipAddingUserMessage: true, // ✅ Flag pour éviter de rajouter le message user qui est déjà dans l'historique
        uiContext: {
          ...llmContext,
          sessionId: freshSession.id
        }
      };

      // 8. Relancer la génération (le message édité est déjà dans historyForLLM)
      // On passe une string vide car le message n'a pas besoin d'être rajouté
      await sendMessage('', freshSession.id, contextForLLM, historyForLLM, tokenResult.token);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'édition';
      logger.error('[ChatFullscreenV2] ❌ Erreur lors de l\'édition:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [editingMessage, cancelEditing, requireAuth, setLoading, setError, syncSessions, loadInitialMessages, selectedAgent, llmContext, sendMessage]);

  // 🎯 Wrapper pour router entre édition et envoi normal
  const handleSendMessage = useCallback(async (message: string | import('@/types/image').MessageContent, images?: import('@/types/image').ImageAttachment[]) => {
    // ✏️ Si on est en mode édition, router vers handleEditSubmit
    if (editingMessage) {
      let textContent = '';
      if (typeof message === 'string') {
        textContent = message;
      } else if (Array.isArray(message)) {
        // Extraire le texte du premier élément de type 'text'
        const textPart = message.find(part => part.type === 'text');
        textContent = textPart && 'text' in textPart ? textPart.text : '';
      }
      await handleEditSubmit(textContent, images);
      return;
    }
    
    // Mode normal
    await handleSendMessageInternal(message, images);
  }, [editingMessage, handleEditSubmit, handleSendMessageInternal]);

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
    if (!isDesktop) return;  // ✅ Guard clause strict
    setSidebarHovered(true);
  }, [isDesktop]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (!isDesktop) return;  // ✅ Guard clause strict
    setSidebarHovered(false);
  }, [isDesktop]);

  const handleWideModeToggle = useCallback(() => {
    if (!requireAuth()) return;
    setWideMode(prev => !prev);
  }, [requireAuth]);


  // 🎯 Rendu optimisé
  return (
    <>

      {/* Chat fullscreen */}
      <div className={`chatgpt-container ${wideMode ? 'wide-mode' : ''}`}>
      {/* Header optimisé avec nouveau design ChatGPT */}
      <div className="chatgpt-header">
        <div className="chatgpt-header-left">
          {/* Bouton toggle sidebar dans le header */}
          <button
            onClick={handleSidebarToggle}
            className="chatgpt-sidebar-toggle-btn-header"
            aria-label={sidebarOpen ? "Fermer les conversations" : "Ouvrir les conversations"}
            title={sidebarOpen ? "Fermer les conversations" : "Ouvrir les conversations"}
            disabled={!user || authLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
          
          {/* Agent actif */}
          {selectedAgent && (
            <div className="chat-active-agent-wrapper" style={{ position: 'relative' }}>
              <button 
                className="chat-active-agent"
                onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                aria-label="Informations de l'agent"
              >
                {selectedAgent.profile_picture ? (
                  <img 
                    src={selectedAgent.profile_picture} 
                    alt={selectedAgent.name}
                    className="agent-icon agent-avatar-header"
                  />
                ) : (
                  <span className="agent-icon">🤖</span>
                )}
                <span className="agent-name">{selectedAgent.name}</span>
              </button>
              
              {/* Dropdown d'info agent */}
              <AgentInfoDropdown
                agent={selectedAgent}
                isOpen={agentDropdownOpen}
                onClose={() => setAgentDropdownOpen(false)}
              />
            </div>
          )}
        </div>
        <div className="chatgpt-header-right">
          {/* Bouton réduire */}
          <Link 
            href="/" 
            className="chatgpt-reduce-btn-header"
            aria-label="Réduire le chat"
            title="Réduire le chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
          </Link>
        </div>
      </div>

      {/* Zone de hover invisible pour la sidebar */}
      {isDesktop && (
        <div 
          className="sidebar-hover-zone"
          onMouseEnter={handleSidebarMouseEnter}
        />
      )}

      {/* Contenu principal avec nouveau design ChatGPT */}
      <div className={`chatgpt-content ${(sidebarOpen || (isDesktop && sidebarHovered)) ? 'sidebar-open' : ''}`}>
        {/* Sidebar moderne */}
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
        />
        </div>

        {/* Overlay mobile/tablette */}
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

          {/* Zone principale des messages */}
          <div className="chatgpt-main">
          {/* Messages optimisés */}
          <div className="chatgpt-messages-container" ref={messagesContainerRef}>
            <div 
              className={`chatgpt-messages ${shouldAnimateMessages ? 'messages-fade-in' : ''}`}
              style={{
                opacity: messagesVisible || displayMessages.length === 0 ? undefined : 0
              }}
            >
              {/* Écran d'accueil SEULEMENT pour nouvelle conversation (pas en chargement, pas en transition) */}
              {!isLoadingMessages && displayMessages.length === 0 && selectedAgent && messagesVisible && displayedSessionId === currentSession?.id && (
                <div className="chat-empty-state">
                  <div className="chat-empty-agent-avatar">
                    {selectedAgent.profile_picture ? (
                      <img src={selectedAgent.profile_picture} alt={selectedAgent.name} />
                    ) : (
                      <div className="chat-empty-agent-placeholder">🤖</div>
                    )}
                  </div>
                  <h2 className="chat-empty-agent-name">{selectedAgent.name}</h2>
                  <p className="chat-empty-agent-description">{selectedAgent.description || 'Prêt à vous assister'}</p>
                  {selectedAgent.model && (
                    <div className="chat-empty-agent-model">{selectedAgent.model}</div>
                  )}
                </div>
              )}

              {/* Loader pour infinite scroll (chargement messages anciens) */}
              {isLoadingMore && hasMore && (
                <MessageLoader isLoadingMore />
              )}

              <AnimatePresence mode="sync">
                {displayMessages.map((message, index) => {
                  // ✅ TypeScript strict : Générer une clé unique sans 'as any'
                  const keyParts = [message.role, message.timestamp];
                  if (message.role === 'tool' && 'tool_call_id' in message) {
                    keyParts.push(message.tool_call_id || 'unknown');
                  }
                  const fallbackKey = keyParts.join('-');
                  
                  // ✅ Masquer le dernier message assistant s'il est en cours de streaming
                  const isLastAssistant = index === displayMessages.length - 1 && message.role === 'assistant';
                  const isBeingStreamed = isLastAssistant && isStreaming;
                  
                  if (isBeingStreamed) return null;
                  
                  return (
                    <motion.div
                      key={message.id || fallbackKey}
                      initial={false}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ 
                        duration: 0.2,
                        ease: [0.22, 1, 0.36, 1]
                      }}
                    >
                      <ChatMessage 
                        message={message}
                        messageIndex={index}
                        onEdit={handleEditMessage}
                        animateContent={false}
                        isStreaming={false} // ✅ Pas de streaming pour les messages persistés
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {/* ✨ Indicateur de saisie : afficher pendant loading jusqu'à ce que le contenu arrive */}
              {loading && (!isStreaming || streamingTimeline.length === 0) && displayMessages.length > 0 && (
                <div className="chatgpt-message chatgpt-message-assistant">
                  <div className="chatgpt-message-bubble chatgpt-message-bubble-assistant">
                    <div className="chatgpt-message-content">
                      <div className="chat-typing-indicator">
                        <div className="chat-typing-dot"></div>
                        <div className="chat-typing-dot"></div>
                        <div className="chat-typing-dot"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* ✅ PENDANT LE STREAMING : Utiliser StreamTimelineRenderer pour affichage chronologique */}
              {isStreaming && streamingTimeline.length > 0 && (
                <div className="chatgpt-message chatgpt-message-assistant">
                  <div className="chatgpt-message-bubble chatgpt-message-bubble-assistant">
                    <StreamTimelineRenderer 
                      timeline={{
                        items: streamingTimeline.map(item => {
                          if (item.type === 'text') {
                            return {
                              type: 'text' as const,
                              content: item.content || '',
                              timestamp: item.timestamp,
                              roundNumber: item.roundNumber
                            };
                          } else if (item.type === 'tool_execution') {
                            return {
                              type: 'tool_execution' as const,
                              toolCalls: item.toolCalls || [],
                              toolCount: item.toolCount || 0,
                              timestamp: item.timestamp,
                              roundNumber: item.roundNumber || 0
                            };
                          } else if (item.type === 'tool_result') {
                            // ✅ Gérer tool_result proprement avec les champs requis
                            return {
                              type: 'tool_result' as const,
                              toolCallId: (item as { toolCallId?: string }).toolCallId || 'unknown',
                              toolName: (item as { toolName?: string }).toolName || 'unknown',
                              result: item.content || '',
                              success: (item as { success?: boolean }).success ?? true,
                              timestamp: item.timestamp
                            };
                          }
                          // ✅ Exhaustive check : ne devrait jamais arriver
                          const _exhaustive: never = item.type;
                          throw new Error(`Type non géré: ${_exhaustive}`);
                        }),
                        startTime: streamStartTime,
                        endTime: Date.now()
                      }}
                      isActiveStreaming={isStreaming}
                    />
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input optimisé */}
          <div className="chatgpt-input-container">
            {renderAuthStatus()}
            <ChatInput 
              onSend={handleSendMessage} 
              loading={loading}
              textareaRef={textareaRef}
              disabled={false}
              placeholder={selectedAgent ? `Discuter avec ${selectedAgent.name}` : "Commencez à discuter..."}
              sessionId={currentSession?.id || 'temp'}
              currentAgentModel={selectedAgent?.model}
              editingMessageId={editingMessage?.messageId || null}
              editingContent={editingContent}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ChatFullscreenV2;