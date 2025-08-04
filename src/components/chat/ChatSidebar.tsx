'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit, Trash2, Check, X, LogOut, Settings, ChevronDown, ChevronRight } from 'react-feather';

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
    return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
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
        {/* Boutons d'action en haut */}
        <div className="sidebar-top-actions">
          <button onClick={handleCreateNewSession} className="new-note-btn">
            <Edit size={16} />
          </button>
          <button onClick={onClose} className="collapse-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          {/* Section Mes Agents */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3>Mes Agents</h3>
              <button 
                onClick={() => setAgentsOpen(!agentsOpen)} 
                className="section-toggle"
              >
                {agentsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            </div>
            {agentsOpen && (
              <div className="section-content">
                <button className="agent-option">
                  <span>DeepSeek</span>
                </button>
                <button className="agent-option">
                  <span>Synesia</span>
                </button>
              </div>
            )}
          </div>

          {/* Section Conversations */}
          <div className="sidebar-section">
            <div className="section-header">
              <h3>Conversations</h3>
            </div>
            <div className="conversations-list">
              {sortedSessions.map((session) => (
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
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(session.id)}
                      autoFocus
                      className="rename-input"
                    />
                  ) : (
                    <div className="conversation-content">
                      <span 
                        className="conversation-title" 
                        onClick={() => startRenaming(session)}
                        style={{ cursor: 'pointer' }}
                      >
                        {session.name || 'Nouvelle conversation'}
                      </span>
                      <span className="conversation-preview">
                        {getLastResponsePreview(session)}
                      </span>
                    </div>
                  )}
                  {currentSession?.id === session.id && (
                    <div className="conversation-actions">
                      <button onClick={() => deleteSession(session.id)}><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="user-menu">
            <img src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${user?.email}`} alt="User" className="user-avatar" />
            <span className="user-email">{user?.email}</span>
            <div className="user-menu-dropdown">
              <button className="user-menu-item"><Settings size={16}/><span>Paramètres</span></button>
              <button onClick={signOut} className="user-menu-item"><LogOut size={16}/><span>Déconnexion</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar; 