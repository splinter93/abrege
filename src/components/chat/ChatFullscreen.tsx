'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAppContext } from '@/hooks/useAppContext';
import { useLLMStore } from '@/store/useLLMStore';
import { useMediaQuery } from '@/hooks/useMediaQuery'; // Import du nouveau hook
import ChatInput from './ChatInput';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import ChatKebabMenu from './ChatKebabMenu';
import ChatSidebar from './ChatSidebar';
import './index.css';
import { supabase } from '@/supabaseClient';
import OptimizedMessage from './OptimizedMessage';

const ChatFullscreen: React.FC = () => {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  
  const [wideMode, setWideMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop); // Initialisation basée sur la taille d'écran
  const [streamingChannel, setStreamingChannel] = useState<any>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingContextRef = useRef<{ sessionId: string; messageId: string } | null>(null);
  
  // Récupérer le contexte de l'app
  const appContext = useAppContext();
  
  const {
    sessions,
    currentSession,
    loading,
    error,
    setCurrentSession,
    setError,
    setLoading,
    syncSessions,
    createSession,
    addMessage,
    updateSession
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.thread, streamingContent]);

  // Charger les sessions au montage
  useEffect(() => {
    syncSessions();
  }, [syncSessions]);

  // S'assurer que la session la plus récente est sélectionnée au chargement
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      setCurrentSession(sessions[0]);
      console.log('[Chat Fullscreen] ✅ Session la plus récente sélectionnée:', sessions[0].name);
    }
  }, [sessions, currentSession, setCurrentSession]);

  // Cleanup des abonnements Realtime
  useEffect(() => {
    return () => {
      if (streamingChannel) {
        supabase.removeChannel(streamingChannel);
        console.log('[ChatFullscreen] 🧹 Canal streaming nettoyé');
      }
    };
  }, [streamingChannel]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    
    try {
      // Vérifier si on a une session courante
      if (!currentSession) {
        console.log('[ChatFullscreen] ⚠️ Pas de session courante, création...');
        await createSession();
        // La session sera automatiquement sélectionnée par le useEffect
        return;
      }

      // Ajouter le message utilisateur immédiatement (optimistic update)
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
        sessionId: currentSession.id
      };

      // Limiter l'historique selon la configuration
      const limitedHistory = currentSession.thread.slice(-currentSession.history_limit);
      
      // Récupérer le provider LLM actuel
      const { currentProvider } = useLLMStore.getState();

      // Store context so subscription callbacks use fresh session/message IDs
      streamingContextRef.current = { sessionId: currentSession.id, messageId: `assistant-${Date.now()}` };
      
      const clientChannelId = `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
      console.log('[ChatFullscreen] 📡 Generated client channel:', clientChannelId);
      
      // Créer le canal avec gestion d'erreur robuste
      const channel = supabase
        .channel(clientChannelId)
        .on('broadcast', { event: 'llm-token' }, (payload) => {
          try {
            console.log('[ChatFullscreen] 📝 Token received via broadcast:', payload);
            const { token, sessionId } = payload.payload || {};
            const ref = streamingContextRef.current;
            if (ref && sessionId === ref.sessionId && token) {
              setStreamingContent(prev => prev + token);
            }
          } catch (error) {
            console.error('[ChatFullscreen] ❌ Erreur traitement token:', error);
          }
        })
        .on('broadcast', { event: 'llm-complete' }, async (payload) => {
          try {
            console.log('[ChatFullscreen] ✅ Complete received via broadcast:', payload);
            const { sessionId, fullResponse } = payload.payload || {};
            const ref = streamingContextRef.current;
            if (ref && sessionId === ref.sessionId && fullResponse) {
              // Sauvegarder le message final
              const finalMessage = {
                role: 'assistant' as const,
                content: fullResponse,
                timestamp: new Date().toISOString()
              };
              
              await addMessage(finalMessage);
              console.log('[ChatFullscreen] 💾 Message assistant sauvegardé');
              
              // Reset streaming state
              streamingContextRef.current = null;
              setIsStreaming(false);
              setStreamingContent('');
            }
          } catch (error) {
            console.error('[ChatFullscreen] ❌ Erreur traitement completion:', error);
            setIsStreaming(false);
            setStreamingContent('');
          }
        })
        .on('broadcast', { event: 'llm-error' }, (payload) => {
          try {
            console.error('[ChatFullscreen] ❌ Error received via broadcast:', payload);
            const { sessionId, error: errorMessage } = payload.payload || {};
            const ref = streamingContextRef.current;
            if (ref && sessionId === ref.sessionId) {
              // Ajouter un message d'erreur
              const errorMsg = {
                role: 'assistant' as const,
                content: `Erreur: ${errorMessage || 'Erreur lors du streaming'}`,
                timestamp: new Date().toISOString()
              };
              
              addMessage(errorMsg);
              
              // Reset streaming state
              streamingContextRef.current = null;
              setIsStreaming(false);
              setStreamingContent('');
            }
          } catch (error) {
            console.error('[ChatFullscreen] ❌ Erreur traitement error event:', error);
            setIsStreaming(false);
            setStreamingContent('');
          }
        })
        .subscribe((status) => {
          console.log('[ChatFullscreen] 📡 Channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('[ChatFullscreen] ✅ Canal streaming connecté');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[ChatFullscreen] ❌ Erreur canal streaming');
            setIsStreaming(false);
            setStreamingContent('');
          }
        });
      
      setStreamingChannel(channel);

      // Call the LLM API with channelId for streaming
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          context: contextWithSessionId,
          history: limitedHistory,
          provider: currentProvider,
          channelId: clientChannelId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(`Erreur API: ${response.status} - ${errorData.error || 'Erreur inconnue'}`);
      }

      const data = await response.json();

      // Handle non-streaming fallback responses
      if (data.response && !isStreaming) {
        console.log('[ChatFullscreen] ✅ Non-streaming response received:', data.response);
        const finalMessage = {
          role: 'assistant' as const,
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        await addMessage(finalMessage);
        setIsStreaming(false);
        setStreamingContent('');
      }

    } catch (error) {
      console.error('Erreur lors de l\'appel LLM:', error);
      
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Désolé, une erreur est survenue lors du traitement de votre message. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      };
      
      await addMessage(errorMessage);
      setIsStreaming(false);
      setStreamingContent('');
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryLimitChange = async (newLimit: number) => {
    if (!currentSession) return;
    
    try {
      console.log(`[ChatFullscreen] 🔄 Mise à jour history_limit: ${newLimit}`);
      
      await updateSession(currentSession.id, { history_limit: newLimit });
      
      console.log(`[ChatFullscreen] ✅ History limit mis à jour: ${newLimit}`);
    } catch (error) {
      console.error('[ChatFullscreen] ❌ Erreur mise à jour history_limit:', error);
      setError('Erreur lors de la mise à jour de la limite d\'historique');
    }
  };

  const messages = currentSession?.thread || [];

  return (
    <div className={`chat-fullscreen-container ${wideMode ? 'wide-mode' : ''}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-title">
            <img src="/logo scrivia white.png" alt="Scrivia" className="chat-logo" />
          </div>
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

      <div className="main-content-area">
        {/* Sidebar */}
        <ChatSidebar 
          isOpen={sidebarOpen} 
          isDesktop={isDesktop}
          onClose={() => setSidebarOpen(false)} 
        />
        
        {/* Overlay pour mobile/tablette */}
        {!isDesktop && sidebarOpen && (
          <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Container principal */}
        <div className="chat-content">
          {/* Bouton sidebar quand fermée */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="sidebar-toggle-btn-floating"
              aria-label="Ouvrir les conversations"
              title="Ouvrir les conversations"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
            </button>
          )}
          
          {/* Messages */}
          <div className="chat-messages-container">
            <div className="chat-message-list">
              {messages.map((message, index) => (
                <div key={message.id || index} className={`chat-message chat-message-${message.role}`}>
                  <div className={`chat-message-bubble chat-message-bubble-${message.role}`}>
                    <EnhancedMarkdownMessage content={message.content} />
                  </div>
                </div>
              ))}
              
              {/* Message en cours de streaming */}
              {isStreaming && streamingContent && (
                <div className="chat-message chat-message-assistant">
                  <div className="chat-message-bubble chat-message-bubble-assistant">
                    <EnhancedMarkdownMessage content={streamingContent} />
                    <div className="chat-typing-indicator">
                      <div className="chat-typing-dot"></div>
                      <div className="chat-typing-dot"></div>
                      <div className="chat-typing-dot"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
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

export default ChatFullscreen; 