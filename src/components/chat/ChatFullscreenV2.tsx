'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { useChatStore } from '@/store/useChatStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAppContext } from '@/hooks/useAppContext';
import { useUIContext } from '@/hooks/useUIContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useChatHandlers } from '@/hooks/useChatHandlers';
import { supabase } from '@/supabaseClient';
import { tokenManager } from '@/utils/tokenManager';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ChatKebabMenu from './ChatKebabMenu';
import SidebarUltraClean from './SidebarUltraClean';
import { simpleLogger as logger } from '@/utils/logger';
import Link from 'next/link';

import './ToolCallMessage.css';
import '@/styles/chat-consolidated.css';
import '@/styles/sidebar-collapsible.css';

const ChatFullscreenV2: React.FC = () => {
  // 🎯 Hooks optimisés
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wideMode, setWideMode] = useState(false);
  
  // 🎯 Auth centralisée
  const { requireAuth, user, loading: authLoading, isAuthenticated } = useAuthGuard();
  
  // 🎯 Contexte et store
  const appContext = useAppContext();
  
  // 🎯 Contexte UI pour l'injection
  const uiContext = useUIContext({
    activeNote: appContext?.activeNote,
    activeClasseur: appContext?.activeClasseur,
    activeFolder: appContext?.activeFolder
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

  // 🎯 Handlers centralisés
  const {
    handleComplete,
    handleError,
    handleToolCalls,
    handleToolResult,
    handleToolExecutionComplete
  } = useChatHandlers();

  // 🎯 Hook de chat
  const { isProcessing, sendMessage } = useChatResponse({
    onComplete: handleComplete,
    onError: handleError,
    onToolCalls: handleToolCalls,
    onToolResult: handleToolResult,
    onToolExecutionComplete: handleToolExecutionComplete
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
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
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
      if ((msg as any).channel === 'analysis' && !msg.content) return false;
      
      // Par défaut, garder le message
      return true;
    });
    
    // Log optimisé pour le debugging
    if (process.env.NODE_ENV === 'development') {
      logger.dev(`[ChatFullscreenV2] 🔍 Messages affichés: ${filtered.length}/${sorted.length}`, {
        total: sorted.length,
        filtered: filtered.length,
        hasToolCalls: filtered.some(m => (m as any).tool_calls?.length > 0),
        hasReasoning: filtered.some(m => (m as any).reasoning),
        channels: sorted.map(m => ({ role: m.role, channel: (m as any).channel, hasContent: !!m.content }))
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
    
    try {
      if (!currentSession) {
        await createSession();
        setLoading(false);
        return;
      }

      const historyBeforeNewMessage = currentSession.thread || [];
      const limitedHistoryForLLM = historyBeforeNewMessage.slice(-(currentSession.history_limit || 30));
      
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
      
      const contextWithSessionId = {
        ...appContext,
        sessionId: currentSession.id,
        agentId: selectedAgent?.id,
        uiContext
      };

      await sendMessage(message, currentSession.id, contextWithSessionId, limitedHistoryForLLM, tokenResult.token);

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
  }, [loading, currentSession, createSession, addMessage, selectedAgent, appContext, sendMessage, setLoading, requireAuth]);

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
          <div className="chatgpt-logo">
            <Link href="/" className="chatgpt-logo-link" aria-label="Aller à l'accueil">
              <img src="/logo-scrivia-white.png" alt="Scrivia" className="chatgpt-logo-img" />
            </Link>
          </div>
        </div>
        <div className="chatgpt-header-right">
          <ChatKebabMenu
            historyLimit={currentSession?.history_limit || 30}
            onHistoryLimitChange={handleHistoryLimitChange}
            disabled={!user || authLoading}
          />
        </div>
      </div>

      {/* Contenu principal avec nouveau design ChatGPT */}
      <div className="chatgpt-content">
        {/* Sidebar moderne */}
        <SidebarUltraClean
          isOpen={sidebarOpen}
          isDesktop={isDesktop}
          onClose={() => {
            if (user && !authLoading) {
              setSidebarOpen(false);
            }
          }}
        />

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
          {/* Bouton toggle sidebar - affiché seulement quand sidebar est fermée */}
          {!sidebarOpen && (
            <button
              onClick={handleSidebarToggle}
              className="chatgpt-sidebar-toggle-btn"
              aria-label="Ouvrir les conversations"
              title="Ouvrir les conversations"
              disabled={!user || authLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          )}
          
          {/* Messages optimisés */}
          <div className="chatgpt-messages-container">
            <div className="chatgpt-messages">
              {displayMessages.map((message) => (
                <ChatMessage 
                  key={message.id || `${message.role}-${message.timestamp}-${(message as any).tool_call_id || ''}`} 
                  message={message}
                  animateContent={false} // Supprimé - faux streaming
                  isWaitingForResponse={loading && message.role === 'assistant' && !message.content}
                />
              ))}
              
              {/* ✅ SUPPRIMÉ: Message assistant en streaming (faux streaming) */}
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
              placeholder="Tapez votre message..."
            />
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ChatFullscreenV2;