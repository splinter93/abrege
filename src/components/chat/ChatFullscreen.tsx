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
  const finalizeStreamingMessage = () => {
    if (!streamingMessageId) return;

    const store = useChatStore.getState();
    const currentSessionFromStore = store.currentSession;
    
    if (currentSessionFromStore) {
      const updatedThread = currentSessionFromStore.thread.map(msg => {
        if (msg.id === streamingMessageId) {
          return {
            ...msg,
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
      console.log('[ChatFullscreen] ✅ Message streaming finalisé');
      
      // Sauvegarder le message en DB
      const streamingMessage = updatedThread.find(msg => msg.id === streamingMessageId);
      if (streamingMessage) {
        addMessage(streamingMessage);
      }
      
      setStreamingMessageId(null);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Créer une session si elle n'existe pas
    if (!currentSession) {
      setPendingMessage(message);
      await createSession();
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    // Ajouter le message utilisateur IMMÉDIATEMENT dans l'UI
    const { setCurrentSession } = useChatStore.getState();
    if (currentSession) {
      const updatedSession = {
        ...currentSession,
        thread: [...currentSession.thread, userMessage]
      };
      setCurrentSession(updatedSession);
      console.log('[ChatFullscreen] ✅ Message utilisateur ajouté immédiatement');
    }

    // Ajouter le message en DB et attendre qu'il soit sauvegardé
    console.log('[ChatFullscreen] 🔍 Session ID:', currentSession?.id);
    await addMessage(userMessage);
    
    // Attendre un peu que le message soit bien en DB
    console.log('[ChatFullscreen] ⏳ Attente sauvegarde message...');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Recharger les sessions depuis la DB
    console.log('[ChatFullscreen] 🔄 Rechargement des sessions depuis DB...');
    console.log('[ChatFullscreen] 📊 Thread avant sync:', currentSession?.thread.length, 'messages');
    const { syncSessions } = useChatStore.getState();
    await syncSessions();
    
    // Mettre à jour la session courante avec les nouvelles données
    const store = useChatStore.getState();
    const updatedSessions = store.sessions;
    console.log('[ChatFullscreen] 🔍 Session courante ID:', currentSession?.id);
    console.log('[ChatFullscreen] 🔍 Sessions disponibles:', updatedSessions.map(s => s.id));
    
    const updatedCurrentSession = updatedSessions.find(s => s.id === currentSession?.id);
    if (updatedCurrentSession) {
      store.setCurrentSession(updatedCurrentSession);
      console.log('[ChatFullscreen] ✅ Session courante mise à jour');
    } else {
      console.log('[ChatFullscreen] ⚠️ Session courante non trouvée dans les sessions mises à jour');
    }
    
    console.log('[ChatFullscreen] 📊 Thread après sync:', useChatStore.getState().currentSession?.thread.length, 'messages');

    // Appeler le LLM avec streaming
    try {
      setLoading(true);
      
      // Préparer le contexte
      const context = appContext || {
        type: 'chat_session',
        id: 'default',
        name: 'Chat général'
      };
      
      console.log('[ChatFullscreen] 🎯 Contexte:', context);
      
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
      const store = useChatStore.getState();
      const currentSessionFromStore = store.currentSession;
      if (currentSessionFromStore) {
        const updatedSession = {
          ...currentSessionFromStore,
          thread: [...currentSessionFromStore.thread, assistantMessage]
        };
        store.setCurrentSession(updatedSession);
        console.log('[ChatFullscreen] ✅ Message assistant streaming ajouté immédiatement');
      }
      
      setStreamingMessageId(assistantMessage.id);
      
      // Appeler l'API LLM avec streaming
      const response = await fetch('/api/chat/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message,
          context: context,
          history: currentSession.thread,
          provider: currentProvider
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur API: ${response.status} - ${errorData.error || 'Erreur inconnue'}`);
      }

      const data = await response.json();
      
      if (data.channelId) {
        console.log('[ChatFullscreen] 📡 Connexion au canal streaming:', data.channelId);
        
        // S'abonner au canal Realtime
        const channel = supabase.channel(data.channelId);
        
        channel
          .on('broadcast', { event: 'llm-token' }, (payload) => {
            const { token, sessionId } = payload;
            if (sessionId === currentSession?.id) {
              updateStreamingMessage(token);
            }
          })
          .on('broadcast', { event: 'llm-complete' }, (payload) => {
            const { sessionId } = payload;
            if (sessionId === currentSession?.id) {
              finalizeStreamingMessage();
              // Déclencher un polling pour synchroniser
              chatPollingService.triggerPolling('streaming terminé');
            }
          })
          .subscribe((status) => {
            console.log('[ChatFullscreen] 📡 Statut canal:', status);
          });
        
        setStreamingChannel(channel);
        
      } else {
        // Fallback si pas de streaming
        console.log('[ChatFullscreen] ⚠️ Pas de streaming, réponse complète reçue');
        finalizeStreamingMessage();
      }
      
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