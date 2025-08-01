'use client';

import React from 'react';
import { useChatStore, type ChatSession } from '../../store/useChatStore';
import './ChatSidebar.css';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, onClose }) => {
  const {
    sessions,
    currentSession,
    setCurrentSession,
    createSession,
    closeWidget
  } = useChatStore();

  const handleSessionClick = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const handleNewChat = async () => {
    await createSession();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Hier';
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getLastMessage = (session: ChatSession) => {
    if (!session.thread || session.thread.length === 0) {
      return 'Nouvelle conversation';
    }
    const lastMessage = session.thread[session.thread.length - 1];
    return lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + '...'
      : lastMessage.content;
  };

  return (
    <>
      {/* Overlay pour fermer la sidebar */}
      {isOpen && (
        <div className="chat-sidebar-overlay" onClick={onClose} />
      )}
      
      {/* Sidebar */}
      <div className={`chat-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header de la sidebar */}
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title">
            <img 
              src="/logo scrivia white.png" 
              alt="Scrivia" 
              className="chat-sidebar-logo"
            />
            <span>Conversations</span>
          </div>
          <button
            onClick={onClose}
            className="chat-sidebar-close"
            aria-label="Fermer la sidebar"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Bouton nouvelle conversation */}
        <div className="chat-sidebar-new">
          <button
            onClick={handleNewChat}
            className="chat-sidebar-new-btn"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            Nouvelle conversation
          </button>
        </div>

        {/* Liste des conversations */}
        <div className="chat-sidebar-conversations">
          {sessions.length === 0 ? (
            <div className="chat-sidebar-empty">
              <p>Aucune conversation</p>
              <p>Commencez une nouvelle conversation</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`chat-sidebar-item ${currentSession?.id === session.id ? 'active' : ''}`}
                onClick={() => handleSessionClick(session)}
              >
                <div className="chat-sidebar-item-content">
                  <div className="chat-sidebar-item-title">
                    {session.name}
                  </div>
                  <div className="chat-sidebar-item-preview">
                    {getLastMessage(session)}
                  </div>
                  <div className="chat-sidebar-item-date">
                    {formatDate(session.updated_at)}
                  </div>
                </div>
                <div className="chat-sidebar-item-actions">
                  <button
                    className="chat-sidebar-item-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implémenter la suppression
                    }}
                    aria-label="Supprimer la conversation"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer de la sidebar */}
        <div className="chat-sidebar-footer">
          <button
            onClick={closeWidget}
            className="chat-sidebar-widget-btn"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Ouvrir le widget
          </button>
        </div>
      </div>
    </>
  );
};

export default ChatSidebar; 