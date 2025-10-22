'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import ChatKebabMenu from './ChatKebabMenu';
import SidebarUltraClean from './SidebarUltraClean';
import { StreamingIndicator, type StreamingState } from './StreamingIndicator';
import StreamTimelineRenderer from './StreamTimelineRenderer';
import { simpleLogger as logger } from '@/utils/logger';
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
    setCurrentSession,
    setSelectedAgent,
    setSelectedAgentId,
    setError,
    setLoading,
    syncSessions,
    createSession,
    addMessage,
    updateSession
  } = useChatStore();



  // 🎯 Refs
  const toolFlowActiveRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousSessionIdRef = useRef<string | null>(null);

  // 🎯 Hook de scroll optimisé
  const { messagesEndRef, scrollToBottom, isNearBottom } = useChatScroll({
    scrollThreshold: 300,
    scrollDelay: 100,
    autoScroll: true,
    messages: currentSession?.thread || []
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
    name: string;
    arguments: string;
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
  
  // ✅ NOUVEAU : Timeline progressive pour affichage pendant le streaming
  const [streamingTimeline, setStreamingTimeline] = useState<Array<{
    type: 'text' | 'tool_execution' | 'tool_result';
    content?: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      arguments: string;
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
        name: tc.name || 'unknown',
        arguments: typeof tc.arguments === 'string' ? tc.arguments : JSON.stringify(tc.arguments || {}),
        success: undefined // En attente
      })));
    },
    onToolExecution: (toolCount) => {
      setStreamingState('executing');
      setExecutingToolCount(toolCount);
      setCurrentRound(prev => prev + 1);
      
      // ✅ NOUVEAU : Ajouter événement tool_execution à la timeline
      setStreamingTimeline(prev => [
        ...prev,
        {
          type: 'tool_execution' as const,
          toolCalls: currentToolCalls.map(tc => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.arguments,
            success: tc.success,
            result: tc.result
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
            toolCalls: item.toolCalls.map(tc => 
              tc.id === toolCallId
                ? { ...tc, success, result: typeof result === 'string' ? result : JSON.stringify(result) }
                : tc
            )
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

  // 🎯 Messages triés et mémorisés pour l'affichage
  const displayMessages = useMemo(() => {
    if (!currentSession?.thread) return [];
    
    const sorted = [...currentSession.thread].sort(
      (a, b) => {
        const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timestampA - timestampB;
      }
    );

    // ✅ Filtrage intelligent : garder tous les messages importants
    const filtered = sorted.filter(msg => {
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
  }, [currentSession?.thread]);

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

  // ✅ MÉMOIRE: Scroll optimisé avec debounce et cleanup
  const debouncedScrollToBottom = useCallback(
    debounce(() => scrollToBottom(false), 150),
    [scrollToBottom]
  );

  // ✅ MÉMOIRE: Cleanup du debounce au démontage
  useEffect(() => {
    return () => {
      debouncedScrollToBottom.cancel();
    };
  }, [debouncedScrollToBottom]);

  // ✅ MÉMOIRE: Scroll initial avec cleanup garanti
  useEffect(() => {
    if (user && !authLoading && sessions.length > 0 && currentSession?.thread && currentSession.thread.length > 0) {
      const timer = setTimeout(() => scrollToBottom(false), 300);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [sessions.length, currentSession?.thread, scrollToBottom, user, authLoading]);

  // S'assurer qu'une session est sélectionnée SEULEMENT s'il n'y en a aucune
  useEffect(() => {
    if (user && !authLoading && sessions.length > 0 && !currentSession) {
      // ✅ FIX: Sélectionner la session la plus récente seulement si aucune session n'est active
      setCurrentSession(sessions[0]);
      logger.dev('[ChatFullscreenV2] 📌 Auto-sélection de la session la plus récente');
    }
  }, [sessions.length, currentSession, setCurrentSession, user, authLoading]);

  // Scroll automatique pour nouveaux messages (optimisé)
  useEffect(() => {
    if (user && !authLoading && currentSession?.thread && currentSession.thread.length > 0) {
      debouncedScrollToBottom();
    }
  }, [currentSession?.thread?.length, debouncedScrollToBottom, user, authLoading]);

  // Scroll intelligent pendant le traitement
  useEffect(() => {
    if (user && !authLoading && isProcessing && isNearBottom) {
      scrollToBottom();
    }
  }, [isProcessing, isNearBottom, scrollToBottom, user, authLoading]);

  // 🎯 Handlers optimisés
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || loading) return;
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
      
      // 2. Extraire tous les tool_call_id des messages assistant gardés
      const keptToolCallIds = new Set<string>();
      recentConversation.forEach(msg => {
        if (msg.role === 'assistant' && msg.tool_calls && Array.isArray(msg.tool_calls)) {
          msg.tool_calls.forEach(tc => {
            if (tc.id) keptToolCallIds.add(tc.id);
          });
        }
      });
      
      // 3. Garder SEULEMENT les tool messages qui correspondent à ces tool_call_id
      const relevantTools = toolMessages.filter(tm => 
        tm.tool_call_id && keptToolCallIds.has(tm.tool_call_id)
      );
      
      logger.dev('[ChatFullscreenV2] 📊 Filtrage historique:', {
        total: historyBeforeNewMessage.length,
        userAssistant: recentConversation.length,
        toolsRelevant: relevantTools.length,
        toolsTotal: toolMessages.length,
        toolCallIds: keptToolCallIds.size
      });
      
      // 4. Recombiner et trier par timestamp pour ordre chronologique
      const limitedHistoryForLLM = [...recentConversation, ...relevantTools]
        .sort((a, b) => {
          const timestampA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timestampB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timestampA - timestampB;
        });
      
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString()
      };
      await addMessage(userMessage);

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

  const handleHistoryLimitChange = useCallback(async (newLimit: number) => {
    if (!requireAuth() || !currentSession) return;
    
    try {
      await updateSession(currentSession.id, { history_limit: newLimit });
    } catch (error) {
      logger.error('[ChatFullscreenV2] ❌ Erreur mise à jour history_limit:', error);
      setError('Erreur lors de la mise à jour de la limite d\'historique');
    }
  }, [currentSession, updateSession, setError, requireAuth]);

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
    if (isDesktop) {
      setSidebarHovered(true);
    }
  }, [isDesktop]);

  const handleSidebarMouseLeave = useCallback(() => {
    if (isDesktop) {
      setSidebarHovered(false);
    }
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
          {/* Bouton retour dashboard */}
          <Link href="/dashboard" className="chatgpt-sidebar-toggle-btn-header" aria-label="Retour au dashboard" title="Retour au dashboard">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            </Link>
          
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
          
          {/* Bouton nouvelle conversation */}
          <button
            onClick={() => {
              if (user && !authLoading) {
                createSession();
              }
            }}
            className="chatgpt-sidebar-toggle-btn-header"
            aria-label="Nouvelle conversation"
            title="Nouvelle conversation"
            disabled={!user || authLoading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          
          {/* Agent actif */}
          {selectedAgent && (
            <div className="chat-active-agent">
              <span className="agent-icon">🤖</span>
              <span className="agent-name">{selectedAgent.name}</span>
            </div>
          )}
        </div>
        <div className="chatgpt-header-right">
          <ChatKebabMenu
            historyLimit={currentSession?.history_limit || 30}
            onHistoryLimitChange={handleHistoryLimitChange}
            disabled={!user || authLoading}
          />
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
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
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
          <div className="chatgpt-messages-container">
            <div className="chatgpt-messages">
              {displayMessages.map((message) => (
                <ChatMessage 
                  key={message.id || `${message.role}-${message.timestamp}-${message.role === 'tool' ? (message as any).tool_call_id || 'unknown' : ''}`} 
                  message={message}
                  animateContent={false}
                  isWaitingForResponse={loading && message.role === 'assistant' && !message.content}
                  isStreaming={false} // ✅ Pas de streaming pour les messages persistés
                />
              ))}
              
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
                              toolCalls: (item.toolCalls || []).map(tc => ({
                                id: tc.id,
                                type: 'function' as const,
                                function: {
                                  name: tc.name,
                                  arguments: tc.arguments
                                }
                              })),
                              toolCount: item.toolCount || 0,
                              timestamp: item.timestamp,
                              roundNumber: item.roundNumber || 0
                            };
                          }
                          return item as any;
                        }),
                        startTime: streamStartTime,
                        endTime: Date.now()
                      }}
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
              placeholder="Commencez à discuter..."
            />
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ChatFullscreenV2;