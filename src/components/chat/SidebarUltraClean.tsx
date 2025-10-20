import React, { useState } from 'react';
import { Search, X, User, Settings } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { useAgents } from '@/hooks/useAgents';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

  if (!isOpen) return null;

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
            agents.map((agent: Agent) => (
              <div key={agent.id} className="sidebar-agent-row">
                <button
                  onClick={() => handleSelectAgent(agent)}
                  className={`sidebar-item-clean ${selectedAgent?.id === agent.id ? 'active' : ''}`}
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
            ))
          )}
        </div>

        {/* Sessions de chat */}
        <div className="sidebar-section-clean">
          <div className="sidebar-section-title-clean">Conversations</div>
          {filteredSessions.map((session: ChatSession) => (
            <button
              key={session.id}
              onClick={() => handleSelectSession(session)}
              className={`sidebar-item-clean ${currentSession?.id === session.id ? 'active' : ''}`}
            >
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{session.name}</div>
                <div style={{ fontSize: '11px', color: '#d0d0d0', marginTop: '2px' }}>
                  {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true, locale: fr })}
                </div>
              </div>
            </button>
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
