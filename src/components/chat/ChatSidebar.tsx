'use client';

import React, { useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit, Trash2, Check, X, LogOut, Settings } from 'react-feather';

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
        <div className="sidebar-top">
          <button onClick={handleCreateNewSession} className="new-chat-btn">
            <img src="/logo scrivia white.png" alt="Logo" className="new-chat-logo" />
            <span>Nouvelle Conversation</span>
            <Edit size={16} />
          </button>
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
                <span className="conversation-title">{session.name || 'Nouvelle conversation'}</span>
              )}
              {currentSession?.id === session.id && (
                <div className="conversation-actions">
                  <button onClick={() => startRenaming(session)}><Edit size={16} /></button>
                  <button onClick={() => deleteSession(session.id)}><Trash2 size={16} /></button>
                </div>
              )}
            </div>
          ))}
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