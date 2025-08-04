'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit, Trash2, LogOut, Settings, ChevronDown, ChevronRight, Plus } from 'react-feather';

interface ChatSidebarProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, isDesktop, onClose }) => {
  const { user, signOut } = useAuth();
  const { sessions, currentSession, createSession, setCurrentSession, deleteSession, updateSession } = useChatStore();
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [agentsOpen, setAgentsOpen] = useState(false);

  // Fonction pour extraire l'aperçu de la dernière réponse
  const getLastResponsePreview = (session: any) => {
    if (!session.thread || session.thread.length === 0) return '';
    
    // Trouver le dernier message de l'assistant
    const lastAssistantMessage = [...session.thread]
      .reverse()
      .find((msg: any) => msg.role === 'assistant');
    
    if (!lastAssistantMessage) return '';
    
    // Extraire les 2 premières lignes
    const lines = lastAssistantMessage.content.split('\n').filter((line: string) => line.trim());
    const preview = lines.slice(0, 2).join(' ');
    
    // Limiter la longueur
    return preview.length > 80 ? preview.substring(0, 80) + '...' : preview;
  };

  const handleCreateNewSession = async () => {
    await createSession('Nouvelle Conversation');
    if (!isDesktop) {
      onClose();
    }
  };

  const handleSelectSession = (session: any) => {
    setCurrentSession(session);
    if (!isDesktop) {
      onClose();
    }
  };

  const startRenaming = (session: any) => {
    setRenamingSessionId(session.id);
    setNewName(session.name);
  };

  const cancelRenaming = () => {
    setRenamingSessionId(null);
    setNewName('');
  };

  const handleRename = async (sessionId: string) => {
    if (newName.trim()) {
      await updateSession(sessionId, { name: newName.trim() });
    }
    cancelRenaming();
  };
  
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const sidebarClass = `chat-sidebar ${isOpen ? 'open' : (isDesktop ? 'closed' : '')}`;

  return (
    <div className={sidebarClass}>
      <div className="sidebar-content-wrapper">
        {/* Header de la sidebar */}
        <div className="sidebar-header">
          <div className="sidebar-header-content">
            <h2 className="sidebar-title">Chat</h2>
            <div className="sidebar-actions">
              <button onClick={handleCreateNewSession} className="action-btn" title="Nouvelle conversation">
                <Plus size={16} />
              </button>
              <button onClick={onClose} className="action-btn" title="Fermer la sidebar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="sidebar-main">
          {/* Section Mes Agents */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3 className="section-title">Mes Agents</h3>
              <button 
                onClick={() => setAgentsOpen(!agentsOpen)} 
                className="section-toggle"
                aria-label={agentsOpen ? "Réduire les agents" : "Développer les agents"}
              >
                {agentsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
            {agentsOpen && (
              <div className="section-content">
                <button className="agent-option">
                  <div className="agent-icon">🤖</div>
                  <span className="agent-name">DeepSeek</span>
                </button>
                <button className="agent-option">
                  <div className="agent-icon">🧠</div>
                  <span className="agent-name">Synesia</span>
                </button>
              </div>
            )}
          </div>

          {/* Section Conversations */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3 className="section-title">Conversations</h3>
              <span className="session-count">{sessions.length}</span>
            </div>
            <div className="conversations-list">
              {sortedSessions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p className="empty-text">Aucune conversation</p>
                  <button onClick={handleCreateNewSession} className="empty-action">
                    Créer une conversation
                  </button>
                </div>
              ) : (
                sortedSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`conversation-item ${currentSession?.id === session.id ? 'active' : ''}`}
                    onClick={() => renamingSessionId !== session.id && handleSelectSession(session)}
                  >
                    {renamingSessionId === session.id ? (
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={() => handleRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(session.id);
                          if (e.key === 'Escape') cancelRenaming();
                        }}
                        autoFocus
                        className="rename-input"
                      />
                    ) : (
                      <div className="conversation-content">
                        <div className="conversation-header">
                          <span 
                            className="conversation-title" 
                            onClick={(e) => {
                              e.stopPropagation();
                              startRenaming(session);
                            }}
                          >
                            {session.name || 'Nouvelle conversation'}
                          </span>
                          {currentSession?.id === session.id && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSession(session.id);
                              }}
                              className="delete-btn"
                              title="Supprimer la conversation"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div className="conversation-preview">
                          {getLastResponsePreview(session)}
                        </div>
                        <div className="conversation-meta">
                          <span className="conversation-date">
                            {formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer avec utilisateur */}
        <div className="sidebar-footer">
          <div className="user-menu">
            <div className="user-info">
              <img 
                src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`} 
                alt="Avatar utilisateur" 
                className="user-avatar" 
              />
              <div className="user-details">
                <span className="user-name">{user?.user_metadata?.full_name || 'Utilisateur'}</span>
                <span className="user-email">{user?.email}</span>
              </div>
            </div>
            <div className="user-actions">
              <button className="user-action-btn" title="Paramètres">
                <Settings size={16} />
              </button>
              <button onClick={signOut} className="user-action-btn" title="Déconnexion">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar; 