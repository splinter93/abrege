'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useLLMStore } from '@/store/useLLMStore';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAppContext } from '@/hooks/useAppContext';
import { useChatResponse } from '@/hooks/useChatResponse';
import { AnimatedMessage } from './AnimatedMessage';
import { AnimatedReasoning } from './AnimatedReasoning';
import { useChatScroll } from '@/hooks/useChatScroll';
import { supabase } from '@/supabaseClient';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import ChatKebabMenu from './ChatKebabMenu';
import ChatSidebar from './ChatSidebar';
import ReasoningMessage from './ReasoningMessage';
import { simpleLogger as logger } from '@/utils/logger';
import './index.css';
import './ReasoningMessage.css';
import './ToolCallMessage.css';
import Link from 'next/link';

// 🔧 NOUVEAU: Fonction de formatage du reasoning pour Qwen 3
const formatReasoningForQwen = (reasoning: string, model?: string): string => {
  if (!reasoning) return '';
  
  // Détecter si c'est Qwen 3
  const isQwen3 = model?.includes('Qwen') || model?.includes('qwen');
  
  // Nettoyer le reasoning
  let cleanedReasoning = reasoning.trim();
  
  // ✅ CORRECTION: Gestion spécifique des balises <think> et </think> de Qwen 3
  if (isQwen3) {
    // Extraire seulement le contenu entre <think> et </think>
    const thinkMatch = cleanedReasoning.match(/<think>([\s\S]*?)<\/think>/);
    
    if (thinkMatch) {
      // Prendre seulement le contenu entre les balises
      cleanedReasoning = thinkMatch[1].trim();
    } else {
      // Si pas de balises, supprimer les balises partielles
      cleanedReasoning = cleanedReasoning
        .replace(/<think>/gi, '')
        .replace(/<\/think>/gi, '')
        .trim();
    }
    
    // Nettoyer les espaces en début et fin
    cleanedReasoning = cleanedReasoning.trim();
    
    // Formater avec une structure claire
    const formattedReasoning = cleanedReasoning
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
    
    // ✅ NOUVEAU: Formatage avec encadré et couleur grise
    return `> **🧠 Raisonnement Qwen 3 :**
> 
> *${formattedReasoning}*
> 
> ---
> *Ce raisonnement montre le processus de pensée du modèle avant de générer sa réponse finale.*`;
  }
  
  // Pour les autres modèles, nettoyer les marqueurs de reasoning
  const reasoningMarkers = [
    '<|im_start|>reasoning\n',
    '<|im_end|>\n',
    'reasoning\n',
    'Reasoning:\n',
    'Raisonnement:\n'
  ];
  
  for (const marker of reasoningMarkers) {
    if (cleanedReasoning.startsWith(marker)) {
      cleanedReasoning = cleanedReasoning.substring(marker.length);
    }
  }
  
  // Formater avec une structure claire
  const formattedReasoning = cleanedReasoning
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  // Formatage générique pour les autres modèles
  return `**🧠 Raisonnement :**

${formattedReasoning}

---
*Processus de pensée du modèle.*`;
};

const ChatFullscreenV2: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop);
  const [wideMode, setWideMode] = useState(false);
  
  // Récupérer le contexte de l'app
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

  const { currentProvider } = useLLMStore();

  // Flag pour éviter la double persistance quand des tools sont utilisés
  const toolFlowActiveRef = useRef(false);

  // ✅ ANTI-SILENCE: Hook optimisé avec pattern anti-silence
  const {
    isProcessing,
    sendMessage
  } = useChatResponse({
        onToolExecutionComplete: async (toolResults) => {
      logger.dev('[ChatFullscreenV2] 🚀 Tous les tool calls terminés, relance automatique...');

      try {
        if (!currentSession) return;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error('Token d\'authentification manquant');
        }

        // ⭐ HISTORIQUE MINIMAL MAIS FONCTIONNEL : Juste ce qu'il faut
        const minimalHistory = [
          // Dernier message utilisateur (contexte de la demande)
          currentSession.thread
            .filter(msg => msg.role === 'user' && msg.content && msg.content.trim() !== '')
            .slice(-1)[0],
          // Résultats des tools (essentiel pour la réponse)
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
          minimalHistory, // ⭐ Historique minimal mais complet
          token
        );
        
      } catch (error) {
        logger.error('[ChatFullscreenV2] ❌ Erreur lors de la relance:', error);
        
        const errorMessage = {
          role: 'assistant' as const,
          content: 'Désolé, une erreur est survenue lors de la génération de la réponse finale.',
          timestamp: new Date().toISOString()
        };
        
        await addMessage(errorMessage);
      }
    },
    onComplete: async (fullContent, fullReasoning) => {
      const safeContent = (fullContent || '').trim();
      
      // Si pas de contenu, ne rien faire
      if (!safeContent) {
        scrollToBottom(true);
        return;
      }
      
      // Créer le message final
      const finalMessage = {
        role: 'assistant' as const,
        content: safeContent,
        reasoning: fullReasoning,
        timestamp: new Date().toISOString()
      };
      
      await addMessage(finalMessage);
      toolFlowActiveRef.current = false;
      scrollToBottom(true);
    },
    onError: (errorMessage) => {
      const errorMsg = {
        role: 'assistant' as const,
        content: `Erreur: ${errorMessage}`,
        timestamp: new Date().toISOString()
      };
      addMessage(errorMsg);
    },

    onToolCalls: async (toolCalls, toolName) => {
      logger.dev('[ChatFullscreenV2] 🔧 Tool calls détectés:', { toolCalls, toolName });
      toolFlowActiveRef.current = true;
      
      // Créer un message assistant avec les tool calls
      const toolMessage = {
        role: 'assistant' as const,
        content: null,
        tool_calls: toolCalls,
        timestamp: new Date().toISOString()
      };
      
      // Ajouter le message avec les tool calls
      await addMessage(toolMessage);
      scrollToBottom(true);
    },
    onToolResult: async (toolName, result, success, toolCallId) => {
      logger.dev('[ChatFullscreenV2] ✅ Tool result reçu:', { toolName, success });
      
      // Créer un message tool avec le résultat
      const normalizeResultToJsonString = (res: unknown, ok: boolean): string => {
        try {
          if (typeof res === 'string') {
            // Si c'est déjà du JSON, tenter de parser et injecter success si absent
            try {
              const parsed = JSON.parse(res);
              if (parsed && typeof parsed === 'object' && !('success' in parsed)) {
                return JSON.stringify({ success: !!ok, ...parsed });
              }
              return JSON.stringify(parsed);
            } catch {
              // Ce n'est pas du JSON: normaliser
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
          // Fallback pour les types primitifs
          return JSON.stringify({ success: !!ok, value: res });
        } catch (e) {
          // Fallback ultime pour éviter de casser l'UI
          return JSON.stringify({ success: !!ok, error: 'tool_result_serialization_error' });
        }
      };

      const toolResultMessage = {
        role: 'tool' as const,
        tool_call_id: toolCallId || `call_${Date.now()}`,
        name: toolName || 'unknown_tool',
        content: normalizeResultToJsonString(result, !!success),
        timestamp: new Date().toISOString()
      };
      
      // Laisser le serveur persister; ici on met juste à jour l'UI de façon optimiste
      await addMessage(toolResultMessage, { persist: false });
      scrollToBottom(true);
    }
  });

  // Hook de scroll intelligent
  const { messagesEndRef, scrollToBottom, isNearBottom } = useChatScroll({
    autoScroll: true,
    scrollThreshold: 150,
    scrollDelay: 100
  });

  // Charger les sessions au montage
  useEffect(() => {
    syncSessions();
  }, [syncSessions]);

  // Log de l'état du store
  useEffect(() => {
    logger.dev('[ChatFullscreenV2] 📊 État du store:', {
      selectedAgent: selectedAgent ? {
        id: selectedAgent.id,
        name: selectedAgent.name,
        model: selectedAgent.model,
        provider: selectedAgent.provider
      } : null,
      selectedAgentId,
      currentSession: currentSession?.id,
      sessionsCount: sessions.length
    });
  }, [selectedAgent, selectedAgentId, currentSession, sessions.length]);

  // Restaurer l'agent sélectionné au montage
  useEffect(() => {
    const restoreSelectedAgent = async () => {
      if (selectedAgentId && !selectedAgent) {
        try {
          logger.dev('[ChatFullscreenV2] 🔄 Restauration agent avec ID:', selectedAgentId);
          // Récupérer l'agent depuis la DB
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
        } catch (error) {
          logger.error('[ChatFullscreenV2] ❌ Erreur restauration agent:', error);
        }
      }
    };
    
    restoreSelectedAgent();
  }, [selectedAgentId, selectedAgent, setSelectedAgent]);

  // Scroll initial après chargement des sessions
  useEffect(() => {
    if (sessions.length > 0 && currentSession?.thread && currentSession.thread.length > 0) {
      // Attendre que tout soit chargé puis scroll
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [sessions.length, currentSession?.thread?.length, scrollToBottom]);

  // S'assurer que la session la plus récente est sélectionnée
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      setCurrentSession(sessions[0]);
    }
  }, [sessions, currentSession, setCurrentSession]);

  // Scroll automatique quand de nouveaux messages sont ajoutés
  useEffect(() => {
    if (currentSession?.thread && currentSession.thread.length > 0) {
      // Délai pour s'assurer que le DOM est rendu
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    }
  }, [currentSession?.thread, scrollToBottom]);

  // Scroll initial au chargement de la page
  useEffect(() => {
    if (currentSession?.thread && currentSession.thread.length > 0) {
      // Scroll immédiat au chargement avec délai pour s'assurer que le DOM est prêt
      const timer = setTimeout(() => {
        scrollToBottom(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [currentSession?.id, scrollToBottom]); // Se déclenche quand la session change

  // Scroll intelligent pendant le traitement
  useEffect(() => {
    if (isProcessing) {
      // Scroll seulement si l'utilisateur est près du bas
      if (isNearBottom) {
        scrollToBottom();
      }
    }
  }, [isProcessing, isNearBottom, scrollToBottom]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    
    try {
      // Vérifier si on a une session courante
      if (!currentSession) {
        await createSession();
        return;
      }

      // Ajouter le message utilisateur immédiatement
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString()
      };
      await addMessage(userMessage);

      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      // Préparer le contexte pour l'API LLM
      const contextWithSessionId = {
        ...appContext,
        sessionId: currentSession.id,
        agentId: selectedAgent?.id // Ajouter l'ID de l'agent sélectionné
      };

      logger.dev('[ChatFullscreenV2] 🎯 Contexte préparé:', {
        sessionId: currentSession.id,
        agentId: selectedAgent?.id,
        agentName: selectedAgent?.name,
        agentModel: selectedAgent?.model,
        agentProvider: selectedAgent?.provider,
        agentInstructions: selectedAgent?.system_instructions ? '✅ Présentes' : '❌ Manquantes',
        agentTemperature: selectedAgent?.temperature,
        agentMaxTokens: selectedAgent?.max_tokens
      });
      if (selectedAgent?.system_instructions) {
        logger.dev('[ChatFullscreenV2] 📝 Instructions système (extrait):', selectedAgent.system_instructions.substring(0, 100) + '...');
      }

      // Limiter l'historique selon la configuration
      const limitedHistory = currentSession.thread.slice(-currentSession.history_limit);
      
      // Démarrer le traitement via useChatResponse
      logger.dev('[ChatFullscreenV2] 🚀 Démarrage traitement avec sessionId:', currentSession.id);
      await sendMessage(message, currentSession.id, contextWithSessionId, limitedHistory, token);

    } catch (error) {
      logger.error('Erreur lors de l\'appel LLM:', error);
      
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Désolé, une erreur est survenue lors du traitement de votre message. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      };
      
      await addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryLimitChange = async (newLimit: number) => {
    if (!currentSession) return;
    
    try {
      await updateSession(currentSession.id, { history_limit: newLimit });
    } catch (error) {
      logger.error('[ChatFullscreenV2] ❌ Erreur mise à jour history_limit:', error);
      setError('Erreur lors de la mise à jour de la limite d\'historique');
    }
  };

  const messages = currentSession?.thread || [];

  return (
    <div className={`chat-fullscreen-container ${wideMode ? 'wide-mode' : ''}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-logo">
            <Link href="/" className="chat-logo-link" aria-label="Aller à l’accueil">
              <img src="/logo scrivia white.png" alt="Scrivia" className="chat-logo-img" />
            </Link>
          </div>
          <div className="chat-session-info" />
        </div>
        <div className="chat-actions">
          <ChatKebabMenu
            isWideMode={wideMode}
            isFullscreen={true}
            historyLimit={currentSession?.history_limit || 10}
            onToggleWideMode={() => setWideMode(!wideMode)}
            onToggleFullscreen={() => {}}
            onHistoryLimitChange={handleHistoryLimitChange}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="main-content-area">
        {/* Sidebar */}
        <ChatSidebar
          isOpen={sidebarOpen}
          isDesktop={isDesktop}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Overlay (mobile/tablette) */}
        {!isDesktop && sidebarOpen && (
          <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Content */}
        <div className="chat-content">
          {/* Sidebar toggle when closed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
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

          {/* Messages */}
          <div className="chat-messages-container">
            <div className="chat-message-list">
              {messages
                .slice()
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .map((message) => (
                  <ChatMessage 
                    key={message.id || `${message.role}-${message.timestamp}-${(message as any).tool_call_id || ''}`} 
                    message={message}
                    animateContent={message.role === 'assistant' && message.timestamp === new Date().toISOString().slice(0, -5) + 'Z'}
                  />
                ))}

            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <ChatInput onSend={handleSendMessage} loading={loading} textareaRef={useRef<HTMLTextAreaElement>(null)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatFullscreenV2;