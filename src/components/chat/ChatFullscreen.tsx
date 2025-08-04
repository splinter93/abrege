'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChatStore, type ChatMessage } from '../../store/useChatStore';
import { useSessionSync } from '@/hooks/useSessionSync';
import { chatPollingService } from '@/services/chatPollingService';
import { llmService } from '@/services/llmService';
import { useAppContext } from '@/hooks/useAppContext';
import { useLLMStore } from '@/store/useLLMStore';
import ChatInput from './ChatInput';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import ChatKebabMenu from './ChatKebabMenu';
import ChatSidebar from './ChatSidebar';
import './chat.css';
import { supabase } from '@/supabaseClient';

const ChatFullscreen: React.FC = () => {
  const [wideMode, setWideMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [streamingChannel, setStreamingChannel] = useState<any>(null);
  const streamingContextRef = useRef<{ sessionId: string; messageId: string } | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  
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
    syncSessions
  } = useChatStore();

  // Hook pour synchroniser les sessions
  const { syncSessions: syncSessionsFromHook, createSession, addMessage } = useSessionSync();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.thread]);

  useEffect(() => {
    syncSessionsFromHook();
  }, [syncSessionsFromHook]);

  // S'assurer que la session la plus récente est sélectionnée au chargement
  useEffect(() => {
    if (sessions.length > 0 && !currentSession) {
      // Les sessions sont déjà triées par updated_at DESC dans le store
      setCurrentSession(sessions[0]);
      console.log('[Chat Fullscreen] ✅ Session la plus récente sélectionnée:', sessions[0].name);
    }
  }, [sessions, currentSession, setCurrentSession]);

  // Réessayer d'envoyer le message en attente après création de session
  useEffect(() => {
    if (currentSession && pendingMessage) {
      handleSendMessage(pendingMessage);
      setPendingMessage(null);
    }
  }, [currentSession, pendingMessage]);

  // Cleanup des abonnements Realtime
  useEffect(() => {
    return () => {
      if (streamingChannel) {
        supabase.removeChannel(streamingChannel);
        console.log('[ChatFullscreen] 🧹 Canal streaming nettoyé');
      }
    };
  }, [streamingChannel]);

  // Fonction pour mettre à jour le message en cours de streaming
  const updateStreamingMessage = (token: string) => {
    if (!streamingMessageId) return;

    const store = useChatStore.getState();
    const currentSessionFromStore = store.currentSession;
    
    if (currentSessionFromStore) {
      const updatedThread = currentSessionFromStore.thread.map(msg => {
        if (msg.id === streamingMessageId) {
          return {
            ...msg,
            content: msg.content + token,
            isStreaming: true
          };
        }
        return msg;
      });

      const updatedSession = {
        ...currentSessionFromStore,
        thread: updatedThread
      };
      
      store.setCurrentSession(updatedSession);
      console.log('[ChatFullscreen] 📝 Token ajouté au message streaming:', token);
    }
  };

  // Fonction pour finaliser le message streaming
  const finalizeStreamingMessage = (finalContent?: string) => {
    if (!streamingMessageId) return;

    const store = useChatStore.getState();
    const currentSessionFromStore = store.currentSession;
    if (currentSessionFromStore) {
      const updatedThread = currentSessionFromStore.thread.map(msg => {
        if (msg.id === streamingMessageId) {
          return {
            ...msg,
            content: finalContent !== undefined ? finalContent : msg.content,
            isStreaming: false
          };
        }
        return msg;
      });

      const updatedSession = {
        ...currentSessionFromStore,
        thread: updatedThread
      };
      store.setCurrentSession(updatedSession);
    }

    setStreamingMessageId(null);
    setStreamingChannel(null); // Important to unsubscribe
    console.log('[ChatFullscreen] ✅ Streaming finalisé, message mis à jour');
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    
    try {
      // Vérifier si on a une session courante
      if (!currentSession) {
        console.log('[ChatFullscreen] ⚠️ Pas de session courante, création...');
        const newSession = await createSession();
        if (!newSession) {
          throw new Error('Impossible de créer une nouvelle session');
        }
        console.log('[ChatFullscreen] ✅ Nouvelle session créée:', newSession);
      }
      
      // Récupérer la session courante mise à jour
      const store = useChatStore.getState();
      const updatedCurrentSession = store.currentSession;
      
      if (!updatedCurrentSession) {
        throw new Error('Aucune session disponible');
      }
      
      console.log('[ChatFullscreen] 🎯 Session courante pour envoi:', updatedCurrentSession);
      
      // Créer le message utilisateur
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      // Ajouter le message utilisateur IMMÉDIATEMENT dans l'UI
      const updatedThread = [...updatedCurrentSession.thread, userMessage];
      const updatedSession = {
        ...updatedCurrentSession,
        thread: updatedThread
      };
      store.setCurrentSession(updatedSession);
      console.log('[ChatFullscreen] ✅ Message utilisateur ajouté immédiatement');
      
      // Sauvegarder le message utilisateur en DB
      await addMessage(userMessage);
      
      // Préparer le contexte avec l'ID de session réel
      const context = appContext || {
        type: 'chat_session',
        id: 'default',
        name: 'Chat général'
      };
      
      // Ajouter l'ID de session au contexte pour le streaming
      const contextWithSessionId = {
        ...context,
        sessionId: updatedCurrentSession.id
      };
      
      console.log('[ChatFullscreen] 🎯 Contexte:', contextWithSessionId);
      
      // Récupérer le token de session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }
      
      // Récupérer le provider actuel
      const currentProvider = useLLMStore.getState().getCurrentProvider();
      
      // Créer un message assistant temporaire pour le streaming
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      };
      
      // Ajouter le message assistant IMMÉDIATEMENT dans l'UI
      const finalThread = [...updatedThread, assistantMessage];
      const finalSession = {
        ...updatedCurrentSession,
        thread: finalThread
      };
      store.setCurrentSession(finalSession);
      console.log('[ChatFullscreen] ✅ Message assistant streaming ajouté immédiatement');
      setStreamingMessageId(assistantMessage.id);
      // Store context so subscription callbacks use fresh session/message IDs
      streamingContextRef.current = { sessionId: updatedCurrentSession.id, messageId: assistantMessage.id };
      const clientChannelId = `llm-stream-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
      console.log('[ChatFullscreen] 📡 Generated client channel:', clientChannelId);
      const channel = supabase
        .channel(clientChannelId)
        .on('broadcast', { event: 'llm-token' }, payload => {
          console.log('[ChatFullscreen] 📝 Token received via broadcast:', payload);
          const { token, sessionId } = payload.payload;
          const ref = streamingContextRef.current;
          if (ref && sessionId === ref.sessionId) {
            const store = useChatStore.getState();
            const sess = store.currentSession;
            if (!sess) return;
            const updatedThread = sess.thread.map(msg =>
              msg.id === ref.messageId
                ? { ...msg, content: msg.content + token, isStreaming: true }
                : msg
            );
            store.setCurrentSession({ ...sess, thread: updatedThread });
          }
        })
        .on('broadcast', { event: 'llm-complete' }, async payload => {
          console.log('[ChatFullscreen] ✅ Complete received via broadcast:', payload);
          const { sessionId, fullResponse } = payload.payload;
          const ref = streamingContextRef.current;
          if (ref && sessionId === ref.sessionId) {
            const store = useChatStore.getState();
            const sess = store.currentSession;
            if (sess) {
              const updatedThread = sess.thread.map(msg =>
                msg.id === ref.messageId
                  ? { ...msg, content: fullResponse, isStreaming: false }
                  : msg
              );
              store.setCurrentSession({ ...sess, thread: updatedThread });
            }
            streamingContextRef.current = null;
          }
        })
        .subscribe(status => console.log('[ChatFullscreen] 📡 Channel status:', status));
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
          history: updatedCurrentSession.thread,
          provider: currentProvider,
          channelId: clientChannelId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur API: ${response.status} - ${errorData.error || 'Erreur inconnue'}`);
      }

      const data = await response.json();

      // Handle non-streaming fallback responses
      if (data.response) {
        console.log('[ChatFullscreen] ✅ Non-streaming response received:', data.response);
        finalizeStreamingMessage(data.response);
        const finalMessage = {
          role: 'assistant' as const,
          content: data.response,
          timestamp: new Date().toISOString(),
        };
        await addMessage(finalMessage);
      }
      // end of refactored streaming logic

    } catch (error) {
      console.error('Erreur lors de l\'appel LLM:', error);
      
      const errorMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Désolé, une erreur est survenue lors du traitement de votre message. Veuillez réessayer.',
        timestamp: new Date().toISOString()
      };
      
      await addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const messages = currentSession?.thread || [];

  return (
    <div className={`chat-fullscreen-container ${wideMode ? 'wide-mode' : ''}`}>
      {/* Bouton de sidebar flottant en haut à gauche */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="chat-sidebar-floating-button"
        aria-label="Ouvrir les conversations"
        title="Conversations"
      >
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M3 3h18v18H3zM9 9h6M9 13h6M9 17h6"></path>
        </svg>
      </button>

      <div className="chat-header">
        <div className="chat-title">
          <img 
            src="/logo scrivia white.png" 
            alt="Scrivia" 
            className="chat-logo"
          />
        </div>
        <div className="chat-fullscreen-actions">
          <button
            onClick={() => setSidebarOpen(true)}
            className="chat-sidebar-toggle"
            aria-label="Ouvrir les conversations"
            title="Conversations"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M3 3h18v18H3zM9 9h6M9 13h6M9 17h6"></path>
            </svg>
          </button>
          <button
            onClick={() => window.history.back()}
            className="chat-reduce-button"
            aria-label="Réduire le chat"
            title="Réduire"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          </button>
          <ChatKebabMenu 
            isWideMode={wideMode}
            isFullscreen={true}
            historyLimit={currentSession?.history_limit || 10}
            onToggleWideMode={() => setWideMode(!wideMode)}
            onToggleFullscreen={() => {}}
            onHistoryLimitChange={() => {}}
          />
        </div>
      </div>



      {/* Messages d'erreur */}
      {error && (
        <div className="chat-error">
          {error}
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      <div className="chat-content">
        <div className="messages-container" role="log" aria-live="polite" aria-label="Messages du chat">
          <div className="message-list">
            {messages.map((msg: ChatMessage, idx: number) => (
              <div 
                key={msg.id || idx} 
                className={`message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`}
                role="article"
                aria-label={`Message ${msg.role === 'user' ? 'utilisateur' : 'assistant'}`}
              >
                <div className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>
                  {msg.role === 'assistant' ? (
                    <EnhancedMarkdownMessage content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
          </div>
          {loading && (
            <div className="loading-bubble">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSend={handleSendMessage}
          loading={loading}
          textareaRef={textareaRef}
        />
      </div>
      
      {/* Sidebar des conversations */}
      <ChatSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </div>
  );
};

export default ChatFullscreen; 