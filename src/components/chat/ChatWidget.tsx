'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { createPortal } from 'react-dom';
import { useChatStore } from '@/store/useChatStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAppContext } from '@/hooks/useAppContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { useChatScroll } from '@/hooks/useChatScroll';
import { useAuth } from '@/hooks/useAuth';
import { useUIContext } from '@/hooks/useUIContext';
// useToolCallDebugger supprimé
import { useAgents } from '@/hooks/useAgents';
import { supabase } from '@/supabaseClient';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import { simpleLogger as logger } from '@/utils/logger';
import './ChatWidget.css';

interface ChatWidgetProps {
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  onExpand?: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'small' | 'medium' | 'large';
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  isOpen, // ✅ Utiliser la prop ou le store
  onToggle,
  onExpand,
  position = 'bottom-right',
  size = 'medium'
}) => {
  // 🎯 Utiliser le store pour l'état global du widget
  const { isWidgetOpen, toggleWidget } = useChatStore();
  
  // 🎯 État local pour l'état minimisé (indépendant de l'ouverture/fermeture)
  const [isMinimized, setIsMinimized] = useState(false);
  
  // 🎯 L'état du widget est maintenant géré par le store
  const widgetOpen = isOpen !== undefined ? isOpen : isWidgetOpen;
  
  // 🐛 DEBUG: Log pour comprendre les changements d'état
  useEffect(() => {
    logger.dev('[ChatWidget] 🔍 État du widget:', {
      isOpen,
      isWidgetOpen,
      widgetOpen,
      isMinimized
    });
  }, [isOpen, isWidgetOpen, widgetOpen, isMinimized]);
  
  // 🎯 Hooks optimisés (même que ChatFullscreenV2)
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const appContext = useAppContext();
  const { user, loading: authLoading } = useAuth();
  const { agents, loading: agentsLoading } = useAgents();
  
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

  // 🎯 Hook de scroll optimisé avec autoscroll
  const { messagesEndRef, scrollToBottom, isNearBottom } = useChatScroll({
    scrollThreshold: 150,
    scrollDelay: 100,
    autoScroll: true,
    messages: currentSession?.thread || []
  });
  
  // ✅ Ancienne logique de scroll supprimée - maintenant gérée par useChatScroll

  // ✅ Code mort nettoyé pour la production

  // 🎯 Callbacks mémorisés pour le hook de chat
  const handleComplete = useCallback(async (
    fullContent: string, 
    fullReasoning: string, 
    toolCalls?: any[], 
    toolResults?: any[]
  ) => {
    logger.dev('[ChatWidget] 📥 Réponse complète reçue:', { 
      contentLength: fullContent?.length, 
      hasReasoning: !!fullReasoning,
      toolCallsCount: toolCalls?.length || 0,
      widgetOpen 
    });
    
    if (authLoading) {
      logger.dev('[ChatWidget] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatWidget] ⚠️ Utilisateur non authentifié, impossible de traiter la réponse finale');
      return;
    }

    const safeContent = fullContent?.trim();
    if (!safeContent) {
      return;
    }
      
    await addMessage({
      role: 'assistant',
      content: safeContent,
      reasoning: fullReasoning,
      tool_calls: toolCalls || [],
      tool_results: toolResults || [],
      timestamp: new Date().toISOString(),
      channel: 'final'
    });
    
    toolFlowActiveRef.current = false;
    
    // Autoscroll géré automatiquement par useChatScroll
    
    logger.dev('[ChatWidget] ✅ Réponse complète traitée, widget toujours ouvert:', widgetOpen);
  }, [addMessage, scrollToBottom, user, authLoading, widgetOpen]);

  const handleError = useCallback((errorMessage: string) => {
    if (authLoading) {
      logger.dev('[ChatWidget] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatWidget] ⚠️ Utilisateur non authentifié, impossible de traiter l\'erreur');
      return;
    }

    addMessage({
      role: 'assistant',
      content: `Erreur: ${errorMessage}`,
      timestamp: new Date().toISOString(),
      channel: 'final'
    });
    
    // Autoscroll géré automatiquement par useChatScroll
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleToolCalls = useCallback(async (toolCalls: any[], toolName: string) => {
    if (authLoading) {
      logger.dev('[ChatWidget] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatWidget] ⚠️ Utilisateur non authentifié, impossible de traiter les tool calls');
      await addMessage({
        role: 'assistant',
        content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
        timestamp: new Date().toISOString()
      }, { persist: false });
      return;
    }

    logger.dev('[ChatWidget] 🔧 Tool calls détectés:', { toolCalls, toolName });
    logger.tool('[ChatWidget] 🔧 Tool calls détectés:', { toolCalls, toolName });
    
    // ✅ Tool calls traités (debugger supprimé pour la production)
    
    toolFlowActiveRef.current = true;
      
    await addMessage({
      role: 'assistant',
      content: null,
      tool_calls: toolCalls,
      timestamp: new Date().toISOString(),
      channel: 'analysis' as const
    }, { persist: false });
    
    // Autoscroll géré automatiquement par useChatScroll
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleToolResult = useCallback(async (toolName: string, result: any, success: boolean, toolCallId?: string) => {
    if (authLoading) {
      logger.dev('[ChatWidget] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[ChatWidget] ⚠️ Utilisateur non authentifié, impossible de traiter le tool result');
      await addMessage({
        role: 'assistant',
        content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
        timestamp: new Date().toISOString()
        }, { persist: false });
      return;
    }

    logger.dev('[ChatWidget] ✅ Tool result reçu:', { toolName, success });
    logger.tool('[ChatWidget] ✅ Tool result reçu:', { toolName, success });
    
    const toolResult = {
      tool_call_id: toolCallId || `call_${Date.now()}`,
      name: toolName || 'unknown_tool',
      content: typeof result === 'string' ? result : JSON.stringify(result),
      success: !!success
    };
    
    // ✅ Tool result traité (debugger supprimé pour la production)
      
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

    const normalizedToolResult = {
      tool_call_id: toolCallId || `call_${Date.now()}`,
      name: toolName || 'unknown_tool',
      content: normalizeResult(result, !!success),
      success: !!success
    };

    try {
      const toolResultMessage = {
        role: 'tool' as const,
        ...normalizedToolResult,
        timestamp: new Date().toISOString()
      };
      await addMessage(toolResultMessage, { persist: false });
    } catch (error) {
      logger.error('[ChatWidget] ❌ Erreur lors du traitement du tool result:', error);
      
      if (error instanceof Error && error.message.includes('Authentification')) {
        await addMessage({
          role: 'assistant',
          content: '⚠️ Erreur d\'authentification. Veuillez vous reconnecter pour continuer.',
          timestamp: new Date().toISOString()
        }, { persist: false });
      } else {
        await addMessage({
          role: 'assistant',
          content: '❌ Erreur lors du traitement du résultat de l\'outil.',
          timestamp: new Date().toISOString()
        }, { persist: false });
      }
    }
    
    // Autoscroll géré automatiquement par useChatScroll
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleToolExecutionComplete = useCallback(async (toolResults: any[]) => {
    logger.dev('[ChatWidget] ✅ Exécution des tools terminée, attente de la réponse automatique de l\'API');
    
    if (toolResults && toolResults.length > 0) {
      for (const result of toolResults) {
        if (result.success) {
          logger.dev(`[ChatWidget] ✅ Tool ${result.name} exécuté avec succès`);
        } else {
          logger.warn(`[ChatWidget] ⚠️ Tool ${result.name} a échoué:`, result.result?.error || 'Erreur inconnue');
        }
      }
    }
  }, []);

  // 🎯 Hook de chat avec callbacks mémorisés
  const { isProcessing, sendMessage } = useChatResponse({
    onComplete: handleComplete,
    onError: handleError,
    onToolCalls: handleToolCalls,
    onToolResult: handleToolResult,
    onToolExecutionComplete: handleToolExecutionComplete
  });

  // 🎯 Messages triés
  const sortedMessages = useMemo(() => {
    if (!currentSession?.thread) return [];
    return [...currentSession.thread].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [currentSession?.thread]);

  // 🎯 Gestion des messages
  const handleSendMessage = useCallback(async (content: string) => {
    logger.dev('[ChatWidget] 📤 Tentative d\'envoi de message:', { content: content.trim(), loading, widgetOpen });
    
    if (!content.trim() || loading) return;
    
    // Vérifier l'authentification avant d'envoyer le message
    if (!user) {
      logger.warn('[ChatWidget] ⚠️ Utilisateur non authentifié, impossible d\'envoyer le message');
      return;
    }
    
    setLoading(true);
    
    try {
      if (!currentSession) {
        // Vérifier l'authentification avant de créer une session
        if (!user) {
          logger.warn('[ChatWidget] ⚠️ Utilisateur non authentifié, impossible de créer une session');
          setLoading(false);
          return;
        }
        
        await createSession();
        return;
      }

      // Message utilisateur optimiste
      const userMessage = {
        role: 'user' as const,
        content: content.trim(),
        timestamp: new Date().toISOString()
      };
      await addMessage(userMessage);
      
      // Autoscroll géré automatiquement par useChatScroll

      // Token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) throw new Error('Token d\'authentification manquant');

      // Contexte optimisé avec UI Context
      const contextWithSessionId = {
        sessionId: currentSession.id,
        agentId: selectedAgent?.id,
        uiContext: uiContext // 🎯 Injection du contexte UI
      };

      // 🕵️‍♂️ DEBUG: Log du contexte avant envoi
      logger.dev('🕵️‍♂️ [ChatWidget] Contexte envoyé à l\'API:', contextWithSessionId);

      // Log optimisé
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[ChatWidget] 🎯 Contexte:', {
          sessionId: currentSession.id,
          agentId: selectedAgent?.id,
          agentName: selectedAgent?.name,
          agentModel: selectedAgent?.model
        });
      }

      // ✅ NOUVEAU: Historique complet pour l'utilisateur
      // La limitation history_limit est uniquement pour l'API LLM, pas pour l'affichage
      const fullHistory = currentSession.thread;
      
      // Pour l'API LLM, on peut limiter à history_limit pour la performance
      const limitedHistoryForLLM = fullHistory.slice(-(currentSession.history_limit || 30));
      
      await sendMessage(content.trim(), currentSession.id, contextWithSessionId, limitedHistoryForLLM, token);

    } catch (error) {
      logger.error('Erreur lors de l\'appel LLM:', error);
      await addMessage({
        role: 'assistant',
        content: 'Désolé, une erreur est survenue lors du traitement de votre message. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
      logger.dev('[ChatWidget] ✅ Fin de l\'envoi de message, widget toujours ouvert:', widgetOpen);
    }
  }, [loading, currentSession, createSession, addMessage, selectedAgent, sendMessage, setLoading, user, widgetOpen]);



  // 🎯 Effets optimisés (même que ChatFullscreenV2)
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
          logger.dev('[ChatWidget] 🔄 Restauration agent avec ID:', selectedAgentId);
          const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('id', selectedAgentId)
            .single();
            
          if (agent) {
            setSelectedAgent(agent);
            logger.dev('[ChatWidget] ✅ Agent restauré:', agent.name);
          } else {
            logger.dev('[ChatWidget] ⚠️ Agent non trouvé, suppression de l\'ID');
            setSelectedAgentId(null);
          }
        } catch (err) {
          logger.error('[ChatWidget] ❌ Erreur restauration agent:', err);
        }
      }
    };
    
    restoreSelectedAgent();
  }, [selectedAgentId, selectedAgent, setSelectedAgent, setSelectedAgentId, user, authLoading]);

  // Charger les agents si pas encore chargés
  useEffect(() => {
    if (user && !authLoading && agents.length === 0 && !agentsLoading) {
      // Charger les agents via le hook useAgents
      // Le hook se charge automatiquement, mais on peut forcer le rechargement si nécessaire
    }
  }, [user, authLoading, agents.length, agentsLoading]);

  // Scroll initial après chargement des sessions
  useEffect(() => {
    if (user && !authLoading && sessions.length > 0 && currentSession?.thread && currentSession.thread.length > 0) {
      const timer = setTimeout(() => scrollToBottom(false), 300);
      return () => clearTimeout(timer);
    }
  }, [sessions.length, currentSession?.thread, scrollToBottom, user, authLoading]);

  // S'assurer que la session la plus récente est sélectionnée
  useEffect(() => {
    if (user && !authLoading && sessions.length > 0 && !currentSession) {
      setCurrentSession(sessions[0]);
    }
  }, [sessions, currentSession, setCurrentSession, user, authLoading]);

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

  // 🎯 Synchroniser avec la prop isOpen ou le store
  useEffect(() => {
    // Scroll automatique quand le widget s'ouvre
    if (widgetOpen && currentSession?.thread && currentSession.thread.length > 0) {
      debouncedScrollToBottom();
    }
  }, [widgetOpen, currentSession?.thread, debouncedScrollToBottom]);

  const handleToggle = () => {
    // 🎯 Utiliser le store pour le toggle global
    if (isOpen === undefined) {
      // Si pas de prop isOpen, utiliser le store
      toggleWidget();
    } else {
      // Si prop isOpen fournie, utiliser le callback
      const newState = !widgetOpen;
      onToggle?.(newState);
    }
  };

  const handleClose = () => {
    if (isOpen === undefined) {
      // Si pas de prop isOpen, fermer via le store
      const { closeWidget } = useChatStore.getState();
      closeWidget();
    } else {
      // Si prop isOpen fournie, utiliser le callback
      onToggle?.(false);
    }
  };

  const handleExpand = () => {
    onExpand?.();
  };

  const handleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    
    // Scroll automatique quand le widget est déminimisé
    if (!newState && currentSession?.thread && currentSession.thread.length > 0) {
      setTimeout(() => scrollToBottom(false), 200);
    }
  };

  // Déterminer les classes CSS selon la position et la taille
  const getPositionClasses = () => {
    const positionClasses = {
      'bottom-right': 'chat-widget-bottom-right',
      'bottom-left': 'chat-widget-bottom-left',
      'top-right': 'chat-widget-top-right',
      'top-left': 'chat-widget-top-left'
    };
    return positionClasses[position] || 'chat-widget-bottom-right';
  };

  const getSizeClasses = () => {
    const sizeClasses = {
      small: 'chat-widget-small',
      medium: 'chat-widget-medium',
      large: 'chat-widget-large'
    };
    return sizeClasses[size] || 'chat-widget-medium';
  };

  // 🎯 Affichage de l'état d'authentification (même que ChatFullscreenV2)
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

  // Rendu du bouton flottant avec createPortal
  if (typeof document !== 'undefined' && !widgetOpen) {
    const positionStyles = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' }
    };

    return createPortal(
      <button
        className="chat-widget-toggle"
        onClick={handleToggle}
        aria-label={`Ouvrir le chat avec ${selectedAgent?.name || 'Assistant'}`}
        style={{
          position: 'fixed',
          zIndex: 9999,
          ...positionStyles[position],
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: selectedAgent?.profile_picture ? '3px solid rgba(255, 255, 255, 0.9)' : 'none',
          background: selectedAgent?.profile_picture 
            ? 'rgba(255, 255, 255, 0.1)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          cursor: 'pointer',
          boxShadow: selectedAgent?.profile_picture 
            ? '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            : '0 4px 20px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '0',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          if (selectedAgent?.profile_picture) {
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
          } else {
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.4)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          if (selectedAgent?.profile_picture) {
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
          } else {
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
          }
        }}
      >
        {selectedAgent?.profile_picture ? (
          <>
            <img
              src={selectedAgent.profile_picture}
              alt={selectedAgent.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '50%',
                position: 'absolute',
                top: '0',
                left: '0'
              }}
            />
            {/* Overlay subtil pour améliorer la visibilité */}
            <div
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 100%)',
                pointerEvents: 'none'
              }}
            />
          </>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              opacity="0.8"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v8m-4-4h8"
              opacity="0.8"
            />
          </svg>
        )}
      </button>,
      document.body
    );
  }

  return (
    <>
      {/* Widget du chat */}
      <div
        className={`chat-fullscreen-container chat-widget-mode ${getPositionClasses()} ${getSizeClasses()} ${
          isMinimized ? 'chat-widget-minimized' : ''
        }`}
      >
        {isMinimized ? (
          <button
            className="chat-widget-toggle"
            onClick={handleMinimize}
            aria-label={`Agrandir le chat avec ${selectedAgent?.name || 'Assistant'}`}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: selectedAgent?.profile_picture ? '3px solid rgba(255, 255, 255, 0.9)' : 'none',
              background: selectedAgent?.profile_picture 
                ? 'rgba(255, 255, 255, 0.1)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: 'pointer',
              boxShadow: selectedAgent?.profile_picture 
                ? '0 4px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                : '0 4px 20px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '0',
              position: 'relative'
            }}
          >
            {selectedAgent?.profile_picture ? (
              <>
                <img
                  src={selectedAgent.profile_picture}
                  alt={selectedAgent.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '0',
                    left: '0'
                  }}
                />
                {/* Overlay subtil pour améliorer la visibilité */}
                <div
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 100%)',
                    pointerEvents: 'none'
                  }}
                />
              </>
            ) : (
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            )}
          </button>
        ) : (
          <>
            {/* Header du widget - Structure optimisée */}
            <div className="chat-header">
              <div className="chat-header-left">
                {selectedAgent?.profile_picture ? (
                  <img
                    src={selectedAgent.profile_picture}
                    alt={selectedAgent.name}
                    className="chat-agent-avatar"
                  />
                ) : (
                  <div className="chat-agent-avatar-placeholder">
                    {selectedAgent?.name?.charAt(0) || 'A'}
                  </div>
                )}
                <div className="chat-agent-info">
                  <span className="chat-agent-name">
                    {selectedAgent?.name || 'Assistant'}
                  </span>
                  <span className="chat-agent-status">
                    {loading || isProcessing ? 'En train d\'écrire...' : 'En ligne'}
                  </span>
                </div>
              </div>
              <div className="chat-actions">
                <button
                  className="chat-widget-close-btn"
                  onClick={handleExpand}
                  aria-label="Agrandir"
                  title="Passer en mode plein écran"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
                <button
                  className="chat-widget-close-btn"
                  onClick={handleMinimize}
                  aria-label="Minimiser"
                  title="Minimiser le chat"
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenu principal du chat - Structure réorganisée */}
            <div className="chat-content">
              {/* Zone des messages - Optimisée pour le scroll */}
              <div className="messages-container">
                <div className="chat-message-list">
                  {sortedMessages.map((message) => (
                    <ChatMessage 
                      key={message.id || `${message.role}-${message.timestamp}-${(message as any).tool_call_id || ''}`} 
                      message={message}
                      animateContent={message.role === 'assistant' && message.timestamp === new Date().toISOString().slice(0, -5) + 'Z'}
                      isWaitingForResponse={loading || isProcessing}
                    />
                  ))}
                  {/* Indicateur de chargement */}
                  {(loading || isProcessing) && (
                    <div className="chat-message chat-message-assistant">
                      <div className="chat-message-bubble">
                        <div className="flex items-center space-x-2">
                          <div className="animate-pulse flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-sm text-gray-500">Assistant réfléchit...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Zone d'input - Structure optimisée */}
              <div className="chat-input-container">
                {/* Messages d'état */}
                {renderAuthStatus()}
                {error && (
                  <div className="chat-error-message">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-4 w-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-2">
                        <p className="text-xs text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Input principal */}
                <ChatInput 
                  onSend={handleSendMessage} 
                  loading={loading || isProcessing}
                  textareaRef={textareaRef}
                  disabled={!user || authLoading}
                  placeholder={!user ? "Connectez-vous pour commencer..." : "Tapez votre message..."}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ChatWidget; 