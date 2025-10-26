import React, { useState } from 'react';
import { Search, X, User, Settings } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { useAgents } from '@/hooks/useAgents';

// Types pour les sessions et agents
interface ChatSession {
  id: string;
  name: string;
  thread: unknown[];
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  display_name: string;
  slug: string;
  description?: string;
  is_active: boolean;
}

interface SidebarUltraCleanProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
}

const SidebarUltraClean: React.FC<SidebarUltraCleanProps> = ({
  isOpen,
  isDesktop,
  onClose
}) => {
  const { user, signOut } = useAuth();
  const { sessions, currentSession, selectedAgent, createSession, setCurrentSession, setSelectedAgent, deleteSession, updateSession } = useChatStore();
  const { agents, loading: agentsLoading } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Fonctions de gestion
  const handleCreateNewSession = async () => {
    await createSession('Nouvelle Conversation');
    if (!isDesktop) {
      onClose();
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    setCurrentSession(session);
    if (!isDesktop) {
      onClose();
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Supprimer cette conversation ?')) {
      await deleteSession(sessionId);
    }
  };

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingName(session.name);
  };

  const handleRenameSubmit = async (sessionId: string) => {
    if (editingName.trim() && editingName !== sessions.find(s => s.id === sessionId)?.name) {
      await updateSession(sessionId, { name: editingName.trim() });
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleRenameCancel = () => {
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    if (!isDesktop) {
      onClose();
    }
  };

  // Filtrage des sessions
  const filteredSessions = sessions.filter((session: ChatSession) =>
    session.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`sidebar-ultra-clean ${isDesktop ? 'desktop' : 'mobile'} ${isOpen ? 'visible' : ''}`}>


      {/* Barre de recherche */}
      <div className="sidebar-search-clean">
        <div style={{ position: 'relative' }}>
          <Search className="sidebar-search-icon-clean" size={16} />
          <input
            type="text"
            placeholder="Rechercher"
            className="sidebar-search-input-clean"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Contenu principal */}
      <div className="sidebar-content-clean">
        {/* Agents */}
        <div className="sidebar-section-clean">
          <div className="sidebar-section-title-clean">Agents</div>
          {agentsLoading ? (
            <div className="sidebar-item-clean">
              <div className="sidebar-item-icon-clean">⏳</div>
              <span>Chargement...</span>
            </div>
          ) : (
            <>
              {(showAllAgents ? agents : agents.slice(0, 5)).map((agent: Agent) => (
                <div key={agent.id} className="sidebar-agent-row">
                  <button
                    onClick={() => handleSelectAgent(agent)}
                    className={`sidebar-item-clean ${!currentSession && selectedAgent?.id === agent.id ? 'active' : ''}`}
                  >
                    <div className="sidebar-item-icon-clean">
                      {agent.profile_picture ? (
                        <img 
                          src={agent.profile_picture} 
                          alt={agent.name}
                          className="agent-avatar"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        "🤖"
                      )}
                    </div>
                    <span>{agent.name}</span>
                  </button>
                </div>
              ))}
              {agents.length > 5 && (
                <button
                  onClick={() => setShowAllAgents(!showAllAgents)}
                  className="sidebar-show-more-btn"
                >
                  {showAllAgents ? 'Voir moins' : `Voir ${agents.length - 5} de plus`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Sessions de chat */}
        <div className="sidebar-section-clean">
          <div className="sidebar-section-title-clean">Conversations</div>
          {filteredSessions.map((session: ChatSession) => (
            <div key={session.id} className={`sidebar-conversation-item ${editingSessionId === session.id ? 'renaming' : ''}`}>
              <button
                onClick={() => handleSelectSession(session)}
                onDoubleClick={(e) => handleStartRename(session, e)}
                className={`sidebar-item-clean ${currentSession?.id === session.id ? 'active' : ''}`}
              >
                <div style={{ flex: 1, textAlign: 'left' }}>
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRenameSubmit(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleRenameSubmit(session.id);
                        } else if (e.key === 'Escape') {
                          handleRenameCancel();
                        }
                      }}
                      autoFocus={'ontouchstart' in window || navigator.maxTouchPoints > 0 ? false : true}
                      className="sidebar-rename-input"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{session.name}</div>
                  )}
                </div>
              </button>
              <button
                onClick={(e) => handleDeleteSession(session.id, e)}
                className="sidebar-delete-btn"
                title="Supprimer la conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Profil utilisateur */}
      <div className="sidebar-user-clean">
        <div className="sidebar-user-item-clean">
          <div className="sidebar-user-avatar-clean">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info-clean">
            <div className="sidebar-user-name-clean">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
            </div>
          </div>
        </div>
        
      </div>

    </div>
  );
};

export default SidebarUltraClean;
