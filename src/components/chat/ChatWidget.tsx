'use client';
import { simpleLogger as logger } from '@/utils/logger';

import React, { useRef, useEffect, useState } from 'react';
import { useChatStore, type ChatMessage } from '@/store/useChatStore';
import { useSessionSync } from '@/hooks/useSessionSync';
import ChatInput from './ChatInput';
import EnhancedMarkdownMessage from './EnhancedMarkdownMessage';
import ChatSidebar from './ChatSidebar';
import { supabase } from '@/supabaseClient';
import './index.css';
import './ChatWidget.css';

const ChatWidget: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnChatPage, setIsOnChatPage] = useState(false);
  
  const {
    sessions,
    currentSession,
    loading,
    error,
    isWidgetOpen,
    setCurrentSession,
    setError,
    setLoading,
    syncSessions,
    toggleWidget,
    openFullscreen,
    closeWidget
  } = useChatStore();

  // Hook pour synchroniser les sessions
  const { syncSessions: syncSessionsFromHook, createSession, addMessage } = useSessionSync();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Vérifier si on est sur la page chat
  useEffect(() => {
    const checkIfOnChatPage = () => {
      setIsOnChatPage(window.location.pathname === '/chat');
    };
    
    checkIfOnChatPage();
    window.addEventListener('popstate', checkIfOnChatPage);
    
    return () => {
      window.removeEventListener('popstate', checkIfOnChatPage);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.thread]);

  useEffect(() => {
    syncSessionsFromHook();
  }, [syncSessionsFromHook]);

  const [isOnAuthPage, setIsOnAuthPage] = useState(false);

  // Vérifier si on est sur une page d'auth
  useEffect(() => {
    const checkIfOnAuthPage = () => {
      const pathname = window.location.pathname;
      setIsOnAuthPage(
        pathname.includes('/auth') || 
        pathname.includes('/login') || 
        pathname.includes('/signup')
      );
    };
    
    checkIfOnAuthPage();
    window.addEventListener('popstate', checkIfOnAuthPage);
    
    return () => {
      window.removeEventListener('popstate', checkIfOnAuthPage);
    };
  }, []);

  // Masquer le widget si on est sur la page chat ou sur les pages d'auth
  if (isOnChatPage || isOnAuthPage) {
    return null;
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !currentSession) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    // Ajouter le message utilisateur
    await addMessage(userMessage);

    // Appeler l'API Synesia
    try {
      setLoading(true);
      
      // Récupérer le token de session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }
      
      const response = await fetch('/api/chat/synesia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: message,
          messages: currentSession.thread
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erreur API: ${response.status} - ${errorData.error || 'Erreur inconnue'}`);
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Désolé, je n\'ai pas pu traiter votre demande.',
        timestamp: new Date().toISOString()
      };
      
      await addMessage(assistantMessage);
    } catch (error) {
      logger.error('Erreur lors de l\'appel à Synesia:', error);
      
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

  const handleCreateNewSession = async () => {
    await createSession();
  };

  const handleSessionChange = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
      logger.dev('[Chat Widget] ✅ Session changée vers:', session.name);
    }
  };

  const messages = currentSession?.thread || [];
  const historySummary = currentSession ? 
    `Historique: ${messages.length} messages (limite: ${currentSession.history_limit || 10})` : '';

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={toggleWidget}
        className="chat-widget-button"
        aria-label="Ouvrir le chat"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>

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

      {/* Widget chat */}
      {isWidgetOpen && (
        <div className="chat-widget-container">
          <div className="chat-widget-header">
            <div className="chat-title">
              <img 
                src="/logo scrivia white.png" 
                alt="Scrivia" 
                className="chat-logo"
              />
            </div>
            <div className="chat-widget-actions">
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
                onClick={openFullscreen}
                className="chat-widget-expand"
                aria-label="Agrandir le chat"
                title="Passer en plein écran"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
              </button>
              <button
                onClick={closeWidget}
                className="chat-widget-close"
                aria-label="Fermer le chat"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Sélecteur de sessions */}
          {sessions.length > 0 && (
            <div className="chat-sessions-selector">
              <select 
                value={currentSession?.id || ''} 
                onChange={(e) => handleSessionChange(e.target.value)}
                className="session-select"
              >
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.name} {session.updated_at ? `(${new Date(session.updated_at).toLocaleDateString()})` : ''}
                  </option>
                ))}
              </select>
              <button 
                onClick={handleCreateNewSession}
                className="new-session-btn"
                title="Créer une nouvelle conversation"
              >
                +
              </button>
            </div>
          )}

          {/* Informations sur l'historique */}
          {currentSession && (
            <div className="chat-history-info">
              <span className="history-summary">{historySummary}</span>
              <span className="context-complexity">Synesia AI</span>
            </div>
          )}

          {/* Messages d'erreur */}
          {error && (
            <div className="chat-error">
              {error}
              <button onClick={() => setError(null)} className="error-close">×</button>
            </div>
          )}

          <div className="chat-content">
            <div className="chat-messages-container" role="log" aria-live="polite" aria-label="Messages du chat">
              <div className="chat-message-list">
                {messages.map((msg: ChatMessage, idx: number) => (
                  <div 
                    key={msg.id || idx} 
                    className={`chat-message chat-message-${msg.role}`}
                    role="article"
                    aria-label={`Message ${msg.role === 'user' ? 'utilisateur' : 'assistant'}`}
                  >
                    <div className={`chat-message-bubble chat-message-bubble-${msg.role}`}>
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
        </div>
      )}
      
      {/* Sidebar des conversations */}
      <ChatSidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isDesktop={false} // Le widget est toujours considéré comme "mobile"
      />
    </>
  );
};

export default ChatWidget;