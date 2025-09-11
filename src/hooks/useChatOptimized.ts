import { useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
import { useChatResponse } from './useChatResponse';
import { useChatScroll } from './useChatScroll';
import { useAuth } from './useAuth';
import { useChatStore } from '@/store/useChatStore';
import { simpleLogger as logger } from '@/utils/logger';

interface UseChatOptimizedOptions {
  scrollThreshold?: number;
  scrollDelay?: number;
}

interface UseChatOptimizedReturn {
  // Hooks de base
  user: any;
  authLoading: boolean;
  loading: boolean;
  isProcessing: boolean;
  
  // Store
  sessions: any[];
  currentSession: any;
  selectedAgent: any;
  selectedAgentId: string | null;
  error: string | null;
  
  // Actions
  setCurrentSession: (session: any) => void;
  setSelectedAgent: (agent: any) => void;
  setSelectedAgentId: (agentId: string | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  syncSessions: () => Promise<void>;
  createSession: (name?: string) => Promise<void>;
  addMessage: (message: any, options?: any) => Promise<void>;
  updateSession: (sessionId: string, data: any) => Promise<void>;
  
  // Scroll optimisé
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: (force?: boolean) => void;
  isNearBottom: boolean;
  debouncedScrollToBottom: () => void;
  
  // Handlers
  handleSendMessage: (message: string) => Promise<void>;
  handleComplete: (fullContent: string, fullReasoning: string, toolCalls?: any[], toolResults?: any[], harmonyChannels?: any) => Promise<void>;
  handleError: (errorMessage: string) => void;
  handleToolCalls: (toolCalls: any[], toolName: string) => Promise<void>;
  handleToolResult: (toolName: string, result: any, success: boolean, toolCallId?: string) => Promise<void>;
  handleToolExecutionComplete: (toolResults: any[]) => Promise<void>;
}

/**
 * Hook optimisé pour le chat - évite la duplication de code entre ChatFullscreenV2 et ChatWidget
 */
export function useChatOptimized(options: UseChatOptimizedOptions = {}): UseChatOptimizedReturn {
  const { scrollThreshold = 150, scrollDelay = 100 } = options;
  
  // Hooks de base
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

  // Scroll optimisé
  const { messagesEndRef, scrollToBottom, isNearBottom } = useChatScroll({
    scrollThreshold,
    scrollDelay
  });

  // Debounced scroll pour éviter les re-renders excessifs
  const debouncedScrollToBottom = useCallback(
    debounce(() => scrollToBottom(true), 100),
    [scrollToBottom]
  );

  // Handlers optimisés
  const handleComplete = useCallback(async (
    fullContent: string, 
    fullReasoning: string, 
    toolCalls?: any[], 
    toolResults?: any[], 
    harmonyChannels?: any
  ) => {
    if (authLoading) {
      logger.dev('[useChatOptimized] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[useChatOptimized] ⚠️ Utilisateur non authentifié, impossible de traiter la réponse finale');
      return;
    }

    const safeContent = fullContent?.trim();
    if (!safeContent) {
      scrollToBottom(true);
      return;
    }
      
    // Message final complet (avec tool calls et reasoning)
    const messageToAdd = {
      role: 'assistant' as const,
      content: safeContent,
      reasoning: fullReasoning,
      tool_calls: toolCalls || [],
      tool_results: toolResults || [],
      timestamp: new Date().toISOString(),
      channel: 'final' as const,
      // Ajouter les canaux Harmony si disponibles
      ...(harmonyChannels && {
        harmony_analysis: harmonyChannels.analysis,
        harmony_commentary: harmonyChannels.commentary,
        harmony_final: harmonyChannels.final
      })
    };

    await addMessage(messageToAdd, { 
      persist: true, 
      updateExisting: true
    });
    
    scrollToBottom(true);
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleError = useCallback((errorMessage: string) => {
    if (authLoading) {
      logger.dev('[useChatOptimized] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[useChatOptimized] ⚠️ Utilisateur non authentifié, impossible de traiter l\'erreur');
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
    if (authLoading) {
      logger.dev('[useChatOptimized] ⏳ Vérification de l\'authentification en cours...');
      return;
    }
    
    if (!user) {
      logger.warn('[useChatOptimized] ⚠️ Utilisateur non authentifié, impossible de traiter les tool calls');
      await addMessage({
        role: 'assistant',
        content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
        timestamp: new Date().toISOString()
      }, { persist: false });
      return;
    }

    logger.dev('[useChatOptimized] 🔧 Tool calls détectés:', { toolCalls, toolName });
    
    // Créer un message temporaire avec tool calls pour l'affichage immédiat
    const toolCallMessage = {
      role: 'assistant' as const,
      content: '🔧 Exécution des outils en cours...',
      tool_calls: toolCalls,
      timestamp: new Date().toISOString(),
      channel: 'analysis' as const
    };
      
    await addMessage(toolCallMessage, { persist: true });
    scrollToBottom(true);
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleToolResult = useCallback(async (toolName: string, result: any, success: boolean, toolCallId?: string) => {
    try {
      if (authLoading) {
        logger.dev('[useChatOptimized] ⏳ Vérification de l\'authentification en cours...');
        return;
      }
      
      if (!user) {
        logger.warn('[useChatOptimized] ⚠️ Utilisateur non authentifié, impossible de traiter le tool result');
        await addMessage({
          role: 'assistant',
          content: '⚠️ Vous devez être connecté pour utiliser cette fonctionnalité.',
          timestamp: new Date().toISOString()
        }, { persist: false });
        return;
      }

      logger.dev('[useChatOptimized] ✅ Tool result reçu:', { toolName, success });
      
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

      // Créer le message à afficher
      const toolResultMessage = {
        role: 'tool' as const,
        ...normalizedToolResult,
        timestamp: new Date().toISOString()
      };

      // Ajouter le message à l'interface
      await addMessage(toolResultMessage, { persist: true });
      
    } catch (error) {
      logger.error('[useChatOptimized] ❌ Erreur lors du traitement du tool result:', error);
      
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
    
    scrollToBottom(true);
  }, [addMessage, scrollToBottom, user, authLoading]);

  const handleToolExecutionComplete = useCallback(async (toolResults: any[]) => {
    logger.dev('[useChatOptimized] ✅ Exécution des tools terminée, attente de la réponse automatique de l\'API');
    
    if (toolResults && toolResults.length > 0) {
      for (const result of toolResults) {
        if (result.success) {
          logger.dev(`[useChatOptimized] ✅ Tool ${result.name} exécuté avec succès`);
        } else {
          logger.warn(`[useChatOptimized] ⚠️ Tool ${result.name} a échoué:`, result.result?.error || 'Erreur inconnue');
        }
      }
    }
  }, []);

  // Hooks de chat avec callbacks mémorisés
  const { isProcessing, sendMessage } = useChatResponse({
    onComplete: handleComplete,
    onError: handleError,
    onToolCalls: handleToolCalls,
    onToolResult: handleToolResult,
    onToolExecutionComplete: handleToolExecutionComplete
  });


  // Handler d'envoi de message optimisé
  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim() || loading) return;
    
    if (!user) {
      logger.warn('[useChatOptimized] ⚠️ Utilisateur non authentifié, impossible d\'envoyer le message');
      return;
    }
    
    setLoading(true);
    
    try {
      if (!currentSession) {
        if (!user) {
          logger.warn('[useChatOptimized] ⚠️ Utilisateur non authentifié, impossible de créer une session');
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
      const { supabase } = await import('@/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) throw new Error('Token d\'authentification manquant');

      // Contexte optimisé
      const contextWithSessionId = {
        sessionId: currentSession.id,
        agentId: selectedAgent?.id
      };

      // Historique complet pour l'utilisateur
      const fullHistory = currentSession.thread;
      const limitedHistoryForLLM = fullHistory.slice(-(currentSession.history_limit || 30));
      
      // Utiliser l'API standard
      const sendFunction = sendMessage;
      
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
  }, [loading, currentSession, createSession, addMessage, selectedAgent, sendMessage, setLoading, user]);

  return {
    // Hooks de base
    user,
    authLoading,
    loading,
    isProcessing,
    
    // Store
    sessions,
    currentSession,
    selectedAgent,
    selectedAgentId,
    error,
    
    // Actions
    setCurrentSession,
    setSelectedAgent,
    setSelectedAgentId,
    setError,
    setLoading,
    syncSessions,
    createSession,
    addMessage,
    updateSession,
    
    // Scroll optimisé
    messagesEndRef,
    scrollToBottom,
    isNearBottom,
    debouncedScrollToBottom,
    
    // Handlers
    handleSendMessage,
    handleComplete,
    handleError,
    handleToolCalls,
    handleToolResult,
    handleToolExecutionComplete
  };
}
