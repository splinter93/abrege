'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChatStore } from '@/store/useChatStore';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAppContext } from '@/hooks/useAppContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { useChatScroll } from '@/hooks/useChatScroll';
import { supabase } from '@/supabaseClient';
import ChatInput from './ChatInput';
import ChatMessageOptimized from './ChatMessageOptimized';
import ChatKebabMenu from './ChatKebabMenu';
import ChatSidebar from './ChatSidebar';
import { simpleLogger as logger } from '@/utils/logger';

import './index.css';
import './ReasoningMessage.css';
import './ToolCallMessage.css';
import Link from 'next/link';

const ChatFullscreenV2: React.FC = () => {
  // 🎯 Hooks optimisés
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [wideMode, setWideMode] = useState(false);
  
  // 🎯 Contexte et store
  const appContext = useAppContext();
  const {
    sessions,
    currentSession,
    selectedAgent,
    selectedAgentId,
    loading,
    error,
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



  // 🎯 Refs optimisées
  const toolFlowActiveRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🎯 Hook de scroll optimisé
  const { messagesEndRef, scrollToBottom, isNearBottom } = useChatScroll({
    autoScroll: true,
    scrollThreshold: 150,
    scrollDelay: 100
  });

  // 🎯 Hook de chat optimisé avec callbacks mémorisés
  const handleToolExecutionComplete = useCallback(async (toolResults: any[]) => {
    if (!currentSession) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) throw new Error('Token d\'authentification manquant');

      // Historique minimal mais fonctionnel
      const minimalHistory = [
        currentSession.thread
          .filter(msg => msg.role === 'user' && msg.content?.trim())
          .slice(-1)[0],
        ...toolResults.map(result => ({
          role: 'tool' as const,
          tool_call_id: result.tool_call_id,
          name: result.name,
          content: JSON.stringify(result.result)
        }))
      ].filter(Boolean);

      await sendMessage(
        'Traite les résultats des outils et réponds à la demande de l\'utilisateur.',
        currentSession.id,
        { sessionId: currentSession.id },
        minimalHistory,
        token
      );
      
    } catch (error) {
      logger.error('[ChatFullscreenV2] ❌ Erreur lors de la relance:', error);
      await addMessage({
        role: 'assistant',
        content: 'Désolé, une erreur est survenue lors de la génération de la réponse finale.',
        timestamp: new Date().toISOString()
      });
    }
  }, [currentSession]);

  const handleComplete = useCallback(async (fullContent: string, fullReasoning: string) => {
    const safeContent = fullContent?.trim();
    if (!safeContent) {
      scrollToBottom(true);
      return;
    }
      
    await addMessage({
      role: 'assistant',
      content: safeContent,
      reasoning: fullReasoning,
      timestamp: new Date().toISOString()
    });
    
    toolFlowActiveRef.current = false;
    scrollToBottom(true);
  }, [addMessage, scrollToBottom]);

  const handleError = useCallback((errorMessage: string) => {
    addMessage({
      role: 'assistant',
      content: `Erreur: ${errorMessage}`,
      timestamp: new Date().toISOString()
    });
  }, [addMessage]);

  const handleToolCalls = useCallback(async (toolCalls: any[], toolName: string) => {
    logger.dev('[ChatFullscreenV2] 🔧 Tool calls détectés:', { toolCalls, toolName });
    toolFlowActiveRef.current = true;
      
    await addMessage({
      role: 'assistant',
      content: null,
      tool_calls: toolCalls,
      timestamp: new Date().toISOString()
    });
    
    scrollToBottom(true);
  }, [addMessage, scrollToBottom]);

  const handleToolResult = useCallback(async (toolName: string, result: any, success: boolean, toolCallId?: string) => {
    logger.dev('[ChatFullscreenV2] ✅ Tool result reçu:', { toolName, success });
      
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
      } catch (e) {
        return JSON.stringify({ success: !!ok, error: 'tool_result_serialization_error' });
      }
    };

    const toolResultMessage = {
      role: 'tool' as const,
      tool_call_id: toolCallId || `call_${Date.now()}`,
      name: toolName || 'unknown_tool',
      content: normalizeResult(result, !!success),
      timestamp: new Date().toISOString()
    };
      
    await addMessage(toolResultMessage, { persist: false });
    scrollToBottom(true);
  }, [addMessage, scrollToBottom]);

  // 🎯 Hook de chat avec callbacks mémorisés
  const { isProcessing, sendMessage } = useChatResponse({
    onToolExecutionComplete: handleToolExecutionComplete,
    onComplete: handleComplete,
    onError: handleError,
    onToolCalls: handleToolCalls,
    onToolResult: handleToolResult
  });

  // 🎯 Messages triés et mémorisés
  const sortedMessages = useMemo(() => {
    if (!currentSession?.thread) return [];
    return [...currentSession.thread].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [currentSession?.thread]);

  // 🎯 Effets optimisés
  useEffect(() => {
    syncSessions();
  }, [syncSessions]);

  // Restaurer l'agent sélectionné au montage
  useEffect(() => {
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
  }, [selectedAgentId, selectedAgent, setSelectedAgent, setSelectedAgentId]);

  // Scroll initial après chargement des sessions
  useEffect(() => {
    if (sessions.length > 0 && currentSession?.thread && currentSession.thread.length > 0) {
      const timer = setTimeout(() => scrollToBottom(true), 500);
      return () => clearTimeout(timer);
    }
  }, [sessions.length, currentSession?.thread, scrollToBottom]);

  // S'assurer que la session la plus récente est sélectionnée
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      setCurrentSession(sessions[0]);
    }
  }, [sessions, currentSession, setCurrentSession]);

  // Scroll automatique pour nouveaux messages
  useEffect(() => {
    if (currentSession?.thread && currentSession.thread.length > 0) {
      const timer = setTimeout(() => scrollToBottom(true), 100);
      return () => clearTimeout(timer);
    }
  }, [currentSession?.thread, scrollToBottom]);

  // Scroll intelligent pendant le traitement
  useEffect(() => {
    if (isProcessing && isNearBottom) {
      scrollToBottom();
    }
  }, [isProcessing, isNearBottom, scrollToBottom]);

  // 🎯 Handlers optimisés
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    
    try {
      if (!currentSession) {
        await createSession();
        return;
      }

      // Message utilisateur optimiste
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString()
      };
      await addMessage(userMessage);

      // Token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) throw new Error('Token d\'authentification manquant');

      // Contexte optimisé
      const contextWithSessionId = {
        ...appContext,
        sessionId: currentSession.id,
        agentId: selectedAgent?.id
      };

      // Log optimisé
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[ChatFullscreenV2] 🎯 Contexte:', {
          sessionId: currentSession.id,
          agentId: selectedAgent?.id,
          agentName: selectedAgent?.name,
          agentModel: selectedAgent?.model
        });
      }

      // Historique limité
      const limitedHistory = currentSession.thread.slice(-currentSession.history_limit);
      
      await sendMessage(message, currentSession.id, contextWithSessionId, limitedHistory, token);

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
  }, [loading, currentSession, createSession, addMessage, selectedAgent, appContext, sendMessage, setLoading]);

  const handleHistoryLimitChange = useCallback(async (newLimit: number) => {
    if (!currentSession) return;
    
    try {
      await updateSession(currentSession.id, { history_limit: newLimit });
    } catch (error) {
      logger.error('[ChatFullscreenV2] ❌ Erreur mise à jour history_limit:', error);
      setError('Erreur lors de la mise à jour de la limite d\'historique');
    }
  }, [currentSession, updateSession, setError]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleWideModeToggle = useCallback(() => {
    setWideMode(prev => !prev);
  }, []);

  // 🎯 Rendu optimisé
  return (
    <div className={`chat-fullscreen-container ${wideMode ? 'wide-mode' : ''}`}>
      {/* Header optimisé */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-logo">
            <Link href="/" className="chat-logo-link" aria-label="Aller à l'accueil">
              <img src="/logo_scrivia_white.png" alt="Scrivia" className="chat-logo-img" />
            </Link>
          </div>
          <div className="chat-session-info" />
        </div>
        <div className="chat-actions">
          <ChatKebabMenu
            isWideMode={wideMode}
            isFullscreen={true}
            historyLimit={currentSession?.history_limit || 10}
            onToggleWideMode={handleWideModeToggle}
            onToggleFullscreen={() => {}}
            onHistoryLimitChange={handleHistoryLimitChange}
          />
        </div>
      </div>

      {/* Main content optimisé */}
      <div className="main-content-area">
        {/* Sidebar */}
        <ChatSidebar
          isOpen={sidebarOpen}
          isDesktop={isDesktop}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Overlay mobile/tablette */}
        {!isDesktop && sidebarOpen && (
          <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Content optimisé */}
        <div className="chat-content">
          {/* Sidebar toggle flottant */}
          {!sidebarOpen && (
            <button
              onClick={handleSidebarToggle}
              className="sidebar-toggle-btn-floating"
              aria-label="Ouvrir les conversations"
              title="Ouvrir les conversations"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          )}

          {/* Messages optimisés */}
          <div className="chat-messages-container">
            <div className="chat-message-list">
              {sortedMessages.map((message) => (
                <ChatMessageOptimized 
                  key={message.id || `${message.role}-${message.timestamp}-${(message as any).tool_call_id || ''}`} 
                  message={message}
                  animateContent={message.role === 'assistant' && message.timestamp === new Date().toISOString().slice(0, -5) + 'Z'}
                />
              ))}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input optimisé */}
          <div className="chat-input-container">
            <ChatInput 
              onSend={handleSendMessage} 
              loading={loading} 
              textareaRef={textareaRef} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatFullscreenV2;