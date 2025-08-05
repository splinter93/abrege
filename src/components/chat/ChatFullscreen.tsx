'use client';
import { simpleLogger as logger } from '@/utils/logger';

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
  // Ref to skip fallback save when streaming completes
  const skipFallbackSaveRef = useRef(false);
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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTriggerRef = useRef<string>('');

  const scrollToBottom = useCallback((force = false) => {
    // Éviter les scrolls multiples dans un court laps de temps
    const now = Date.now();
    const timeSinceLastScroll = now - parseInt(lastScrollTriggerRef.current || '0');
    
    if (!force && timeSinceLastScroll < 100) {
      return;
    }
    
    // Clear le timeout précédent
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Debounce le scroll
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
      lastScrollTriggerRef.current = now.toString();
    }, 50);
  }, []);

  // Scroll automatique optimisé
  useEffect(() => {
    // Scroll seulement quand de nouveaux messages sont ajoutés
    if (currentSession?.thread && currentSession.thread.length > 0) {
      scrollToBottom();
    }
  }, [currentSession?.thread, scrollToBottom]);

  // Scroll pendant le streaming (avec debounce)
  useEffect(() => {
    if (isStreaming && streamingContent) {
      scrollToBottom();
    }
  }, [isStreaming, streamingContent, scrollToBottom]);

  // Cleanup des timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Charger les sessions au montage
  useEffect(() => {
    syncSessions();
  }, [syncSessions]);

  // S'assurer que la session la plus récente est sélectionnée au chargement
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      setCurrentSession(sessions[0]);
      logger.dev('[Chat Fullscreen] ✅ Session la plus récente sélectionnée:', sessions[0].name);
    }
  }, [sessions, currentSession, setCurrentSession]);

  // Cleanup des abonnements Realtime
  useEffect(() => {
    return () => {
      if (streamingChannel) {
        supabase.removeChannel(streamingChannel);
        logger.dev('[ChatFullscreen] 🧹 Canal streaming nettoyé');
      }
    };
  }, [streamingChannel]);

  // Gestion du scroll global
  useEffect(() => {
    // Empêcher le scroll global quand le chat est actif
    document.body.classList.add('chat-active');
    
    return () => {
      // Restaurer le scroll global quand le chat est fermé
      document.body.classList.remove('chat-active');
    };
  }, []);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    
    try {
      // Vérifier si on a une session courante
      if (!currentSession) {
        logger.dev('[ChatFullscreen] ⚠️ Pas de session courante, création...');
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

      // Attendre un tick pour s'assurer que le message utilisateur est bien ajouté
      await new Promise(resolve => setTimeout(resolve, 0));

      // 🔧 ANTI-DUPLICATION: Ajouter un message assistant temporaire et le sauvegarder en DB
      const tempAssistantMessage = {
        role: 'assistant' as const,
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      };
      
      // Utiliser addMessage pour ajouter le message temporaire (qui le sauvegarde en DB)
      await addMessage(tempAssistantMessage);
      logger.dev('[ChatFullscreen] ✅ Message assistant temporaire ajouté et sauvegardé en DB');
      
      // Attendre un tick pour s'assurer que le message assistant est bien ajouté
      await new Promise(resolve => setTimeout(resolve, 0));

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
      logger.dev('[ChatFullscreen] 📡 Generated client channel:', clientChannelId);
      
      // Créer le canal avec gestion d'erreur robuste
      const channel = supabase
        .channel(clientChannelId)
        .on('broadcast', { event: 'llm-token' }, (payload) => {
          try {
            const { token, sessionId } = payload.payload || {};
            const ref = streamingContextRef.current;
            if (ref && sessionId === ref.sessionId && token) {
              setStreamingContent(prev => {
                const newContent = prev + token;
                // Log seulement tous les 50 tokens pour éviter le spam
                if (newContent.length % 50 === 0) {
                  logger.dev('[ChatFullscreen] 📝 Streaming progress:', newContent.length, 'chars');
                }
                return newContent;
              });
            }
          } catch (error) {
            logger.error('[ChatFullscreen] ❌ Erreur traitement token:', error);
          }
        })
        .on('broadcast', { event: 'llm-complete' }, async (payload) => {
          // Mark that we already saved via streaming callback
          skipFallbackSaveRef.current = true;
          try {
            logger.dev('[ChatFullscreen] ✅ Complete received via broadcast:', payload);
            const { sessionId, fullResponse } = payload.payload || {};
            const ref = streamingContextRef.current;
            if (ref && sessionId === ref.sessionId && fullResponse) {
              // Reset streaming state AVANT de traiter le message final
              streamingContextRef.current = null;
              setIsStreaming(false);
              setStreamingContent('');
              
              // Attendre un tick pour s'assurer que le state est mis à jour
              await new Promise(resolve => setTimeout(resolve, 0));
              
                            // 🔧 ANTI-DUPLICATION: Mettre à jour le message assistant existant
              const store = useChatStore.getState();
              const currentSession = store.currentSession;
              
              if (currentSession && currentSession.thread.length > 0) {
                // Trouver le dernier message assistant (qui est le message temporaire)
                const lastAssistantMessage = currentSession.thread
                  .filter(msg => msg.role === 'assistant')
                  .pop();
                
                if (lastAssistantMessage) {
                  // Mettre à jour le contenu du message assistant
                  const updatedThread = currentSession.thread.map(msg => 
                    msg.id === lastAssistantMessage.id 
                      ? { ...msg, content: fullResponse, isStreaming: false }
                      : msg
                  );
                  
                  const updatedSession = {
                    ...currentSession,
                    thread: updatedThread
                  };
                  
                  store.setCurrentSession(updatedSession);
                  logger.dev('[ChatFullscreen] ✅ Message assistant mis à jour avec le contenu final');
                  
                  // 🔧 ANTI-DUPLICATION: Le message est déjà en DB via l'optimistic update
                  // Pas besoin de faire un appel API supplémentaire
                  logger.dev('[ChatFullscreen] ✅ Message assistant mis à jour (pas de sauvegarde en double)');
                }
              }
              
              // Scroll forcé après la fin du streaming
              setTimeout(() => scrollToBottom(true), 100);
            }
          } catch (error) {
            logger.error('[ChatFullscreen] ❌ Erreur traitement completion:', error);
            streamingContextRef.current = null;
            setIsStreaming(false);
            setStreamingContent('');
          }
        })
        .on('broadcast', { event: 'llm-error' }, async (payload) => {
          try {
            logger.error('[ChatFullscreen] ❌ Error received via broadcast:', payload);
            const { sessionId, error: errorMessageFromPayload } = payload.payload || {};
            const ref = streamingContextRef.current;
            if (ref && sessionId === ref.sessionId) {
                                // 🔧 ANTI-DUPLICATION: Mettre à jour le message assistant existant avec l'erreur
                  const store = useChatStore.getState();
                  const currentSession = store.currentSession;
                  
                  if (currentSession && currentSession.thread.length > 0) {
                    // Trouver le dernier message assistant (qui est le message temporaire)
                    const lastAssistantMessage = currentSession.thread
                      .filter(msg => msg.role === 'assistant')
                      .pop();
                    
                    if (lastAssistantMessage) {
                      const errorContent = `Erreur: ${errorMessageFromPayload || 'Erreur lors du streaming'}`;
                      
                      // Mettre à jour le contenu du message assistant avec l'erreur
                      const updatedThread = currentSession.thread.map(msg => 
                        msg.id === lastAssistantMessage.id 
                          ? { 
                              ...msg, 
                              content: errorContent, 
                              isStreaming: false 
                            }
                          : msg
                      );
                      
                      const updatedSession = {
                        ...currentSession,
                        thread: updatedThread
                      };
                      
                      store.setCurrentSession(updatedSession);
                      logger.dev('[ChatFullscreen] ✅ Message assistant mis à jour avec l\'erreur');
                      
                      // 🔧 ANTI-DUPLICATION: Le message d'erreur est déjà en DB via l'optimistic update
                      // Pas besoin de faire un appel API supplémentaire
                      logger.dev('[ChatFullscreen] ✅ Message d\'erreur mis à jour (pas de sauvegarde en double)');
                    }
                  }
              
              // Reset streaming state
              streamingContextRef.current = null;
              setIsStreaming(false);
              setStreamingContent('');
            }
          } catch (error) {
            logger.error('[ChatFullscreen] ❌ Erreur traitement error event:', error);
            setIsStreaming(false);
            setStreamingContent('');
          }
        })
        .subscribe((status) => {
          logger.dev('[ChatFullscreen] 📡 Channel status:', status);
          if (status === 'SUBSCRIBED') {
            logger.dev('[ChatFullscreen] ✅ Canal streaming connecté');
          } else if (status === 'CHANNEL_ERROR') {
            logger.error('[ChatFullscreen] ❌ Erreur canal streaming');
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
        if (!skipFallbackSaveRef.current) {
          logger.dev('[ChatFullscreen] ✅ Non-streaming response received:', data.response);
          
          // 🔧 ANTI-DUPLICATION: Mettre à jour le message assistant existant et sauvegarder en DB
          const store = useChatStore.getState();
          const currentSession = store.currentSession;
          
          if (currentSession && currentSession.thread.length > 0) {
            // Trouver le dernier message assistant (qui est le message temporaire)
            const lastAssistantMessage = currentSession.thread
              .filter(msg => msg.role === 'assistant')
              .pop();
            
            if (lastAssistantMessage) {
              // Mettre à jour le contenu du message assistant
              const updatedThread = currentSession.thread.map(msg => 
                msg.id === lastAssistantMessage.id 
                  ? { ...msg, content: data.response, isStreaming: false }
                  : msg
              );
              
              const updatedSession = {
                ...currentSession,
                thread: updatedThread
              };
              
              store.setCurrentSession(updatedSession);
              logger.dev('[ChatFullscreen] ✅ Message assistant mis à jour avec la réponse non-streaming');
              
              // 🔧 SAUVEGARDER EN DB: Ajouter le message final en DB
              const finalMessage = {
                role: 'assistant' as const,
                content: data.response,
                timestamp: new Date().toISOString()
              };
              
              // Utiliser directement le service de chat pour sauvegarder en DB (sans mettre à jour le store)
              const response = await fetch(`/api/v1/chat-sessions/${currentSession.id}/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(finalMessage),
              });
              
              if (!response.ok) {
                logger.error('[ChatFullscreen] ❌ Erreur sauvegarde message non-streaming en DB:', response.status);
              } else {
                logger.dev('[ChatFullscreen] ✅ Message non-streaming sauvegardé en DB');
              }
            }
          }
        } else {
          // reset the skip flag after skipping once
          skipFallbackSaveRef.current = false;
        }
        
        setIsStreaming(false);
        setStreamingContent('');
      }

    } catch (error) {
      logger.error('Erreur lors de l\'appel LLM:', error);
      
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
      logger.dev(`[ChatFullscreen] 🔄 Mise à jour history_limit: ${newLimit}`);
      
      await updateSession(currentSession.id, { history_limit: newLimit });
      
      logger.dev(`[ChatFullscreen] ✅ History limit mis à jour: ${newLimit}`);
    } catch (error) {
      logger.error('[ChatFullscreen] ❌ Erreur mise à jour history_limit:', error);
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
            <a href="/" className="chat-logo-link">
              <img src="/logo scrivia white.png" alt="Scrivia" className="chat-logo" />
            </a>
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