'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useChatStore } from '@/store/useChatStore';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAppContext } from '@/hooks/useAppContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useAtomicToolCalls } from '@/hooks/useAtomicToolCalls';
import { useAuth } from '@/hooks/useAuth';
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
  const { user, loading: authLoading } = useAuth();
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

  // 🎯 Hook pour les tool calls atomiques
  const { addToolResult, isProcessing: isProcessingToolCalls } = useAtomicToolCalls();

  const handleComplete = useCallback(async (fullContent: string, fullReasoning: string) => {
    // Vérifier l'authentification avant de continuer
    if (authLoading) {
      logger.dev('[ChatFullscreenV2] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible de traiter la réponse finale');
      return;
    }

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
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleError = useCallback((errorMessage: string) => {
    // Vérifier l'authentification avant de continuer
    if (authLoading) {
      logger.dev('[ChatFullscreenV2] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible de traiter l\'erreur');
      return;
    }

    addMessage({
      role: 'assistant',
      content: `Erreur: ${errorMessage}`,
      timestamp: new Date().toISOString()
    });
  }, [addMessage, user, authLoading]);

  const handleToolCalls = useCallback(async (toolCalls: any[], toolName: string) => {
    // Vérifier l'authentification avant de continuer
    if (authLoading) {
      logger.dev('[ChatFullscreenV2] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible de traiter les tool calls');
      await addMessage({
        role: 'assistant',
        content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
        timestamp: new Date().toISOString()
      }, { persist: false });
      return;
    }

    logger.dev('[ChatFullscreenV2] 🔧 Tool calls détectés:', { toolCalls, toolName });
    toolFlowActiveRef.current = true;
      
    await addMessage({
      role: 'assistant',
      content: null,
      tool_calls: toolCalls,
      timestamp: new Date().toISOString()
    });
    
    scrollToBottom(true);
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleToolResult = useCallback(async (toolName: string, result: any, success: boolean, toolCallId?: string) => {
    // Vérifier l'authentification avant de continuer
    if (authLoading) {
      logger.dev('[ChatFullscreenV2] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible de traiter le tool result');
      await addMessage({
        role: 'assistant',
        content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
        timestamp: new Date().toISOString()
      }, { persist: false });
      return;
    }

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

    // 🔧 CORRECTION: Utiliser le hook atomic pour persister les tool calls
    const toolResult = {
      tool_call_id: toolCallId || `call_${Date.now()}`,
      name: toolName || 'unknown_tool',
      content: normalizeResult(result, !!success),
      success: !!success
    };

    try {
      const persisted = await addToolResult(toolResult);
      
      if (persisted) {
        logger.dev('[ChatFullscreenV2] ✅ Tool result persisté atomiquement');
      } else {
        logger.error('[ChatFullscreenV2] ❌ Échec persistance tool result, fallback local');
        
        // Vérifier si c'est une erreur d'authentification
        const isAuthError = toolResult.content.includes('Authentification requise') || 
                           toolResult.content.includes('Problème d\'authentification');
        
        if (isAuthError) {
          // Afficher un message d'erreur d'authentification à l'utilisateur
          await addMessage({
            role: 'assistant',
            content: '⚠️ Erreur d\'authentification. Veuillez vous reconnecter pour continuer.',
            timestamp: new Date().toISOString()
          }, { persist: false });
          
          // Optionnel: rediriger vers la page de connexion après un délai
          setTimeout(() => {
            // window.location.href = '/auth/login';
            logger.warn('[ChatFullscreenV2] ⚠️ Redirection vers la page de connexion recommandée');
          }, 3000);
          
          return;
        }
        
        // Fallback: ajouter localement avec persistance
        const toolResultMessage = {
          role: 'tool' as const,
          ...toolResult,
          timestamp: new Date().toISOString()
        };
        await addMessage(toolResultMessage, { persist: true });
      }
    } catch (error) {
      logger.error('[ChatFullscreenV2] ❌ Erreur lors du traitement du tool result:', error);
      
      // Gérer les erreurs d'authentification
      if (error instanceof Error && error.message.includes('Authentification')) {
        await addMessage({
          role: 'assistant',
          content: '⚠️ Erreur d\'authentification. Veuillez vous reconnecter pour continuer.',
          timestamp: new Date().toISOString()
        }, { persist: false });
      } else {
        // Erreur générique
        await addMessage({
          role: 'assistant',
          content: '❌ Erreur lors du traitement du résultat de l\'outil.',
          timestamp: new Date().toISOString()
        }, { persist: false });
      }
    }
    
    scrollToBottom(true);
  }, [addToolResult, addMessage, scrollToBottom, user, authLoading]);

  // 🎯 Hook de chat optimisé avec callbacks mémorisés
  const handleToolExecutionComplete = useCallback(async (toolResults: any[]) => {
    // ✅ L'API fait déjà la relance automatique, pas besoin de relance manuelle
    logger.dev('[ChatFullscreenV2] ✅ Exécution des tools terminée, attente de la réponse automatique de l\'API');
    
    // Traiter les tool results si nécessaire pour l'affichage
    if (toolResults && toolResults.length > 0) {
      for (const result of toolResults) {
        if (result.success) {
          logger.dev(`[ChatFullscreenV2] ✅ Tool ${result.name} exécuté avec succès`);
        } else {
          logger.warn(`[ChatFullscreenV2] ⚠️ Tool ${result.name} a échoué:`, result.result?.error || 'Erreur inconnue');
        }
      }
    }
    
    // L'API va automatiquement relancer le LLM et retourner la réponse finale
    // Pas besoin d'appeler sendMessage ici
  }, []);

  // 🎯 Hook de chat avec callbacks mémorisés
  const { isProcessing, sendMessage } = useChatResponse({
    onComplete: handleComplete,
    onError: handleError,
    onToolCalls: handleToolCalls,
    onToolResult: handleToolResult,
    onToolExecutionComplete: handleToolExecutionComplete
  });

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

  // 🎯 Messages triés et mémorisés
  const sortedMessages = useMemo(() => {
    if (!currentSession?.thread) return [];
    return [...currentSession.thread].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
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

  // Scroll initial après chargement des sessions
  useEffect(() => {
    if (user && !authLoading && sessions.length > 0 && currentSession?.thread && currentSession.thread.length > 0) {
      const timer = setTimeout(() => scrollToBottom(true), 500);
      return () => clearTimeout(timer);
    }
  }, [sessions.length, currentSession?.thread, scrollToBottom, user, authLoading]);

  // S'assurer que la session la plus récente est sélectionnée
  useEffect(() => {
    if (user && !authLoading && sessions.length > 0 && !currentSession) {
      setCurrentSession(sessions[0]);
    }
  }, [sessions, currentSession, setCurrentSession, user, authLoading]);

  // Scroll automatique pour nouveaux messages
  useEffect(() => {
    if (user && !authLoading && currentSession?.thread && currentSession.thread.length > 0) {
      const timer = setTimeout(() => scrollToBottom(true), 100);
      return () => clearTimeout(timer);
    }
  }, [currentSession?.thread, scrollToBottom, user, authLoading]);

  // Scroll intelligent pendant le traitement
  useEffect(() => {
    if (user && !authLoading && isProcessing && isNearBottom) {
      scrollToBottom();
    }
  }, [isProcessing, isNearBottom, scrollToBottom, user, authLoading]);

  // 🎯 Handlers optimisés
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || loading) return;
    
    // Vérifier l'authentification avant d'envoyer le message
    if (!user) {
      logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible d\'envoyer le message');
      return;
    }
    
    setLoading(true);
    
    try {
      if (!currentSession) {
        // Vérifier l'authentification avant de créer une session
        if (!user) {
          logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible de créer une session');
          setLoading(false);
          return;
        }
        
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
  }, [loading, currentSession, createSession, addMessage, selectedAgent, appContext, sendMessage, setLoading, user]);

  const handleHistoryLimitChange = useCallback(async (newLimit: number) => {
    // Vérifier l'authentification avant de continuer
    if (authLoading) {
      logger.dev('[ChatFullscreenV2] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible de modifier la limite d\'historique');
      return;
    }

    if (!currentSession) return;
    
    try {
      await updateSession(currentSession.id, { history_limit: newLimit });
    } catch (error) {
      logger.error('[ChatFullscreenV2] ❌ Erreur mise à jour history_limit:', error);
      setError('Erreur lors de la mise à jour de la limite d\'historique');
    }
  }, [currentSession, updateSession, setError, user, authLoading]);

  const handleSidebarToggle = useCallback(() => {
    // Vérifier l'authentification avant de continuer
    if (authLoading) {
      logger.dev('[ChatFullscreenV2] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible de modifier la sidebar');
      return;
    }

    setSidebarOpen(prev => !prev);
  }, [user, authLoading]);

  const handleWideModeToggle = useCallback(() => {
    // Vérifier l'authentification avant de continuer
    if (authLoading) {
      logger.dev('[ChatFullscreenV2] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatFullscreenV2] ⚠️ Utilisateur non authentifié, impossible de modifier le mode large');
      return;
    }

    setWideMode(prev => !prev);
  }, [user, authLoading]);

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
            disabled={!user || authLoading}
          />
        </div>
      </div>

      {/* Main content optimisé */}
      <div className="main-content-area">
        {/* Sidebar */}
        <ChatSidebar
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
          <div className="chat-sidebar-overlay" onClick={() => {
            if (user && !authLoading) {
              setSidebarOpen(false);
            }
          }} />
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
              disabled={!user || authLoading}
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
            {renderAuthStatus()}
            <ChatInput 
              onSend={handleSendMessage} 
              loading={loading}
              textareaRef={textareaRef}
              disabled={!user || authLoading}
              placeholder={!user ? "Connectez-vous pour commencer à chatter..." : "Tapez votre message..."}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatFullscreenV2;