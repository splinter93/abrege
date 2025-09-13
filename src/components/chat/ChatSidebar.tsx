'use client';
import type { SafeUnknown, SafeRecord, SafeError } from '@/types/quality';
import { logger } from '@/utils/logger';

import React, { useState, useMemo } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { useAgents } from '@/hooks/useAgents';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Edit, Plus, ChevronDown, ChevronRight, Trash2, Settings, LogOut } from 'react-feather';

interface ChatSidebarProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ isOpen, isDesktop, onClose }) => {
  const { user, signOut } = useAuth();
  const { sessions, currentSession, selectedAgent, createSession, setCurrentSession, setSelectedAgent, deleteSession, updateSession } = useChatStore();
  const { agents, loading: agentsLoading } = useAgents();
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fonction pour extraire l'aperçu de la dernière réponse
  const getLastResponsePreview = (session: unknown) => {
    if (!session.thread || session.thread.length === 0) return '';
    
    // Trouver le dernier message de l'assistant
    const lastAssistantMessage = [...session.thread]
      .reverse()
      .find((msg: unknown) => msg.role === 'assistant');
    
    if (!lastAssistantMessage) return '';
    
    // 🔧 CORRECTION: Vérifier que content n'est pas null
    if (!lastAssistantMessage.content) return '';
    
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

  const handleSelectSession = (session: unknown) => {
    setCurrentSession(session);
    if (!isDesktop) {
      onClose();
    }
  };

  const handleSelectAgent = (agent: unknown) => {
    logger.debug(`[ChatSidebar] 🎯 Sélection de l'agent:`, {
      id: agent.id,
      name: agent.name,
      model: agent.model,
      provider: agent.provider,
      system_instructions: agent.system_instructions ? '✅ Présentes' : '❌ Manquantes',
      context_template: agent.context_template ? '✅ Présent' : '❌ Manquant',
      temperature: agent.temperature,
      max_tokens: agent.max_tokens
    });
    setSelectedAgent(agent);
    logger.debug(`[ChatSidebar] ✅ Agent sélectionné dans le store: ${agent.name} (${agent.model})`);
    if (agent.system_instructions) {
      logger.debug(`[ChatSidebar] 📝 Instructions système (extrait):`, { instructions: agent.system_instructions.substring(0, 100) + '...' });
    }
    if (!isDesktop) {
      onClose();
    }
  };

  const startRenaming = (session: unknown) => {
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
  
  // ✅ CORRECTION : Utiliser useMemo pour éviter les erreurs de hoisting en production
  const sortedSessions = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    let filteredSessions = [...sessions];
    
    // Filtrer par recherche si un terme est saisi
    if (searchQuery.trim()) {
      filteredSessions = filteredSessions.filter(session => 
        session.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getLastResponsePreview(session).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filteredSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [sessions, searchQuery]);

  const displayName = (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur').trim();
  const emailText = user?.email || '';

  return (
    <div className={`chatgpt-sidebar ${isOpen ? 'visible' : ''} ${isDesktop ? 'desktop' : 'mobile'}`}>
      {/* Header de la sidebar avec nouveau design ChatGPT */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Chat</h2>
        <div className="sidebar-actions">
          <button onClick={onClose} className="sidebar-icon-btn" title="Fermer la sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Barre de recherche avec nouveau design */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Rechercher dans les conversations..."
          className="sidebar-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="sidebar-search-icon">🔍</div>
      </div>

      {/* Contenu principal avec nouveau design */}
      <div className="sidebar-content">
        {/* Section Agents */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Agents</h3>
          {agentsLoading ? (
            <div className="chat-loading">
              <div className="chat-loading-spinner"></div>
              Chargement des agents...
            </div>
          ) : agents.length > 0 ? (
            agents.map((agent) => (
              <button 
                key={agent.id} 
                className={`agent-option ${selectedAgent?.id === agent.id ? 'active' : ''}`}
                onClick={() => handleSelectAgent(agent)}
              >
                <div className="agent-icon">
                  {agent.profile_picture ? (
                    <img
                      src={agent.profile_picture}
                      alt={agent.name}
                      className="agent-profile-image"
                    />
                  ) : (
                    '🤖'
                  )}
                </div>
                <span className="agent-name">{agent.name}</span>
              </button>
            ))
          ) : (
            <div className="chat-empty">
              <div className="chat-empty-icon">🤖</div>
              <p className="chat-empty-description">Aucun agent disponible</p>
            </div>
          )}
        </div>

        {/* Section Conversations */}
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Conversations</h3>
          <button onClick={handleCreateNewSession} className="new-conversation-btn">
            <Plus size={16} />
            Lancer une nouvelle conversation
          </button>
          <div className="conversations-list">
            {sortedSessions.length === 0 ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">💬</div>
                <h4 className="chat-empty-title">Aucune conversation</h4>
                <p className="chat-empty-description">Commencez une nouvelle conversation</p>
                <button onClick={handleCreateNewSession} className="chat-input-send">
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
                      className="sidebar-search-input"
                      placeholder="Nom de la conversation"
                    />
                  ) : (
                    <div className="conversation-content">
                      <h4 
                        className="conversation-title" 
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startRenaming(session);
                        }}
                      >
                        {session.name || 'Nouvelle conversation'}
                      </h4>
                      <p className="conversation-preview">
                        {getLastResponsePreview(session)}
                      </p>
                      <div className="conversation-meta">
                        <span className="conversation-time">
                          {formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: fr })}
                        </span>
                        {currentSession?.id === session.id && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            className="sidebar-icon-btn"
                            title="Supprimer la conversation"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer avec utilisateur */}
        <div className="sidebar-footer">
          <div className="user-menu">
            <div className="user-info">
              <img 
                src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${displayName}`} 
                alt={displayName} 
                className="user-avatar" 
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="user-details">
                <span className="user-name" title={displayName}>{displayName}</span>
                <span className="user-email" title={emailText}>{emailText}</span>
              </div>
            </div>
            <div className="user-actions">
              <button className="sidebar-icon-btn" title="Paramètres" aria-label="Paramètres">
                <Settings size={16} />
              </button>
              <button onClick={signOut} className="sidebar-icon-btn" title="Déconnexion" aria-label="Déconnexion">
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