'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { useChatStore } from '@/store/useChatStore';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAppContext } from '@/hooks/useAppContext';
import { useUIContext } from '@/hooks/useUIContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { useChatScroll } from '@/hooks/useChatScroll';
// import { useAtomicToolCalls } from '@/hooks/useAtomicToolCalls'; // Fichier supprimé
import { useAuth } from '@/hooks/useAuth';
// useToolCallDebugger supprimé
import { supabase } from '@/supabaseClient';
import { tokenManager } from '@/utils/tokenManager';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ChatKebabMenu from './ChatKebabMenu';
import SidebarUltraClean from './SidebarUltraClean';
import { simpleLogger as logger } from '@/utils/logger';

import './ToolCallMessage.css';
import '@/styles/chat-consolidated.css';
import '@/styles/sidebar-collapsible.css';
import Link from 'next/link';

const ChatFullscreenV2: React.FC = () => {
  // 🎯 Hooks optimisés
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [sidebarOpen, setSidebarOpen] = useState(false); // Toujours fermée par défaut
  const [wideMode, setWideMode] = useState(false);
  
  // 🎯 Contexte et store
  const appContext = useAppContext();
  const { user, loading: authLoading } = useAuth();
  
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



  // 🎯 Refs optimisées
  const toolFlowActiveRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🎯 Hook de scroll optimisé avec autoscroll
  const { messagesEndRef, scrollToBottom, isNearBottom } = useChatScroll({
    scrollThreshold: 300,
    scrollDelay: 100,
    autoScroll: true,
    messages: currentSession?.thread || []
  });

  // ✅ SUPPRIMÉ: Hook de streaming (faux streaming)
  // Le chat utilise maintenant l'API standard sans streaming

  // 🎯 Hook pour le debugger des tool calls - SUPPRIMÉ
  // Code mort nettoyé pour la production

  // 🎼 Activation automatique d'Harmony pour GPT OSS 20b et 120b

  // 🎯 Hook pour les tool calls atomiques
  // const { addToolResult, isProcessing: isProcessingToolCalls } = useAtomicToolCalls(); // Hook supprimé

  // ✅ CORRECTION: Sidebar TOUJOURS fermée par défaut, sauf si l'utilisateur l'a ouverte explicitement
  // ✅ État initial de la sidebar (seulement au premier mount)
  useEffect(() => {
    // Sidebar fermée par défaut au chargement initial
    setSidebarOpen(false);
  }, []); // ✅ Dependencies vides = exécuté seulement au mount

  // 🎯 Fermer la sidebar sur mobile après sélection d'une nouvelle session
  const previousSessionIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Fermer seulement si la session a CHANGÉ (pas juste au mount)
    if (!isDesktop && sidebarOpen && currentSession) {
      const currentId = currentSession.id;
      
      if (previousSessionIdRef.current !== null && previousSessionIdRef.current !== currentId) {
        // La session a changé → auto-fermer après 300ms
        const timer = setTimeout(() => {
          setSidebarOpen(false);
        }, 300);
        previousSessionIdRef.current = currentId;
        return () => clearTimeout(timer);
      }
      
      previousSessionIdRef.current = currentId;
    }
  }, [currentSession?.id, isDesktop, sidebarOpen]);

  const handleComplete = useCallback(async (
    fullContent: string, 
    fullReasoning: string, 
    toolCalls?: any[], 
    toolResults?: any[], 
    harmonyChannels?: {
      analysis?: string;
      commentary?: string;
      final?: string;
    }
  ) => {
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
    logger.dev('[ChatFullscreenV2] 🎯 handleComplete appelé:', {
      fullContent: fullContent?.substring(0, 100) + '...',
      safeContent: safeContent?.substring(0, 100) + '...',
      hasContent: !!safeContent,
      reasoning: fullReasoning?.substring(0, 50) + '...',
      hasHarmonyChannels: !!harmonyChannels,
      harmonyAnalysis: harmonyChannels?.analysis?.substring(0, 50) + '...',
      harmonyCommentary: harmonyChannels?.commentary?.substring(0, 50) + '...',
      harmonyFinal: harmonyChannels?.final?.substring(0, 50) + '...'
    });

    if (!safeContent) {
      logger.warn('[ChatFullscreenV2] ⚠️ Contenu vide, pas de message à ajouter');
      return;
    }
      
    // ✅ Message final complet (avec tool calls et reasoning)
    const messageToAdd = {
      role: 'assistant' as const,
      content: safeContent,
      reasoning: fullReasoning,
      tool_calls: toolCalls || [],
      tool_results: toolResults || [],
      timestamp: new Date().toISOString(),
      channel: 'final' as const,
      // 🎼 Ajouter les canaux Harmony si disponibles
      ...(harmonyChannels && {
        harmony_analysis: harmonyChannels.analysis,
        harmony_commentary: harmonyChannels.commentary,
        harmony_final: harmonyChannels.final
      })
    };

    logger.dev('[ChatFullscreenV2] 📝 Ajout du message final complet:', {
      content: safeContent?.substring(0, 100) + '...',
      reasoning: fullReasoning?.substring(0, 50) + '...',
      toolCalls: toolCalls?.length || 0,
      toolResults: toolResults?.length || 0
    });
    
    // ✅ Remplacer le message temporaire par le message final
    await addMessage(messageToAdd, { 
      persist: true, 
      updateExisting: true // Remplacer le message temporaire
    });
    
    logger.dev('[ChatFullscreenV2] ✅ Message final ajouté avec succès');
    
    toolFlowActiveRef.current = false;
    // Autoscroll géré automatiquement par useChatScroll
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
      timestamp: new Date().toISOString(),
      channel: 'final'
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
    logger.tool('[ChatFullscreenV2] 🔧 Tool calls détectés:', { toolCalls, toolName });
    
    // ✅ Tool calls traités (debugger supprimé pour la production)
    
    toolFlowActiveRef.current = true;
    
    // ✅ Créer un message temporaire avec tool calls pour l'affichage immédiat
    const toolCallMessage = {
      role: 'assistant' as const,
      content: '🔧 Exécution des outils en cours...',
      tool_calls: toolCalls,
      timestamp: new Date().toISOString(),
      channel: 'analysis' as const // Canal temporaire pour l'affichage
    };
      
    await addMessage(toolCallMessage, { persist: true }); // Persister pour l'affichage
    // Autoscroll géré automatiquement par useChatScroll
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleToolResult = useCallback(async (toolName: string, result: any, success: boolean, toolCallId?: string) => {
    try {
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
      logger.tool('[ChatFullscreenV2] ✅ Tool result reçu:', { toolName, success });
      
      // Normaliser le résultat du tool
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

      // Créer le tool result normalisé
      const normalizedToolResult = {
        tool_call_id: toolCallId || `call_${Date.now()}`,
        name: toolName || 'unknown_tool',
        content: normalizeResult(result, !!success),
        success: !!success
      };

      // ✅ Tool result traité (debugger supprimé pour la production)
      
      // Créer le message à afficher
      const toolResultMessage = {
        role: 'tool' as const,
        ...normalizedToolResult,
        timestamp: new Date().toISOString()
      };

      // Ajouter le message à l'interface
      await addMessage(toolResultMessage, { persist: true });
      
      logger.dev('[ChatFullscreenV2] ✅ Tool result traité et affiché avec succès');
      
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
    // Autoscroll géré automatiquement par useChatScroll
  }, [addMessage, scrollToBottom, user, authLoading]);

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

      // 🔧 FIX: Lire l'historique AVANT d'ajouter le message pour éviter la race condition
      const historyBeforeNewMessage = currentSession.thread || [];
      
      // Pour l'API LLM, limiter l'historique selon history_limit
      const limitedHistoryForLLM = historyBeforeNewMessage.slice(-(currentSession.history_limit || 30));
      
      // Message utilisateur optimiste
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString()
      };
      await addMessage(userMessage);

      // 🔐 TOKEN AVEC REFRESH AUTOMATIQUE
      logger.dev('[ChatFullscreenV2] 🔐 Récupération et validation du token...');
      const tokenResult = await tokenManager.getValidToken();
      
      if (!tokenResult.isValid || !tokenResult.token) {
        throw new Error(tokenResult.error || 'Token d\'authentification manquant ou invalide');
      }
      
      const token = tokenResult.token;
      
      // 🔍 LOG DE DIAGNOSTIC
      logger.info('[ChatFullscreenV2] 🔐 Token validé:', {
        wasRefreshed: tokenResult.wasRefreshed,
        expiresAt: tokenResult.expiresAt ? new Date(tokenResult.expiresAt * 1000).toISOString() : 'unknown',
        userId: tokenResult.userId,
        tokenLength: token.length,
      });

      // Contexte optimisé avec UI Context
      const contextWithSessionId = {
        ...appContext,
        sessionId: currentSession.id,
        agentId: selectedAgent?.id,
        uiContext // ✅ CORRECTION : Ajouter le contexte UI
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
      
      // Utiliser l'API standard (sans streaming)
      const sendFunction = sendMessage;
      
      logger.dev('[ChatFullscreenV2] 🎼 Envoi du message:', {
        message: message.substring(0, 50) + '...',
        sessionId: currentSession.id,
        agentId: selectedAgent?.id,
        historyLength: limitedHistoryForLLM.length,
        lastMessageInHistory: limitedHistoryForLLM[limitedHistoryForLLM.length - 1]?.role,
        last3Messages: limitedHistoryForLLM.slice(-3).map(m => ({
          role: m.role,
          content: m.content?.substring(0, 30) + '...',
          timestamp: m.timestamp
        }))
      });

      await sendFunction(message, currentSession.id, contextWithSessionId, limitedHistoryForLLM, token);

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

    setSidebarOpen(prev => {
      const newState = !prev;
      // Sauvegarder la préférence de l'utilisateur
      localStorage.setItem('sidebar-interacted', 'true');
      localStorage.setItem('sidebar-preference', newState ? 'open' : 'closed');
      return newState;
    });
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