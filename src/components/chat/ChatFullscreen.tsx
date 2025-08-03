'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useChatStore, type ChatMessage } from '../../store/useChatStore';
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
  
  const {
    sessions,
    currentSession,
    loading,
    error,
    setCurrentSession,
    addMessage,
    setError,
    setLoading,
    createSession,
    loadSessions
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.thread]);

  useEffect(() => {
    loadSessions();
  }, []);

  // Réessayer d'envoyer le message en attente après création de session
  useEffect(() => {
    if (currentSession && pendingMessage) {
      handleSendMessage(pendingMessage);
      setPendingMessage(null);
    }
  }, [currentSession, pendingMessage]);

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
      console.error('Erreur lors de l\'appel à Synesia:', error);
      
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