import React, { useState, useEffect } from 'react';
import { Search, X, User, Settings } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { useAuth } from '@/hooks/useAuth';
import { useAgents } from '@/hooks/useAgents';
import { useChatSessionsPolling } from '@/hooks/chat/useChatSessionsPolling'; // ✅ Simple et fiable
// import { useChatSessionsRealtime } from '@/hooks/chat/useChatSessionsRealtime'; // ❌ Re-renders infinis
import SettingsModal from './SettingsModal';
import { simpleLogger as logger } from '@/utils/logger';
import type { Agent, ChatSession } from '@/types/chat';

interface SidebarUltraCleanProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
  onForceClose?: () => void; // Fermeture forcée (désactive aussi le hover sur desktop)
}

const SidebarUltraClean: React.FC<SidebarUltraCleanProps> = ({
  isOpen,
  isDesktop,
  onClose,
  onForceClose
}) => {
  const { user, signOut } = useAuth();
  const { sessions, currentSession, selectedAgent, createSession, setCurrentSession, setSelectedAgent, deleteSession, updateSession } = useChatStore();
  const { agents, loading: agentsLoading } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false); // ✅ Bloquer clics pendant création

  // 🔄 Polling léger (simple et fiable, détecte auto-rename + nouvelles sessions)
  useChatSessionsPolling({ enabled: true, intervalMs: 3000 }); // ✅ 3s = bon compromis

  // Fonctions de gestion
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

  const handleSelectAgent = async (agent: Agent) => {
    // ✅ FIX RACE CONDITION : Ignorer clics si création déjà en cours
    if (isCreatingSession) {
      logger.dev('[SidebarUltraClean] ⏭️ Clic ignoré : création en cours');
      return;
    }
    
    setIsCreatingSession(true);
    
    try {
      // ✅ FIX FLASH : Ne PAS appeler setSelectedAgent ici
      // On laisse useSyncAgentWithSession le faire automatiquement après création
      // → évite le double-set qui cause le clignotement
      
      // Créer conversation avec l'agent (met à jour currentSession dans le store)
      const newSession = await createSession('Nouvelle conversation', agent.id);
      
      if (newSession) {
        logger.dev('[SidebarUltraClean] ✅ Conversation créée, agent sera sync auto:', {
          sessionId: newSession.id,
          agentId: agent.id
        });
        // useSyncAgentWithSession va détecter le changement et charger l'agent
      } else {
        logger.error('[SidebarUltraClean] ❌ Échec création conversation');
      }
      
      if (!isDesktop) {
        onClose();
      }
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleOpenSettings = () => {
    setSettingsOpen(true);
    // Ne pas fermer la sidebar à l'ouverture
    // Elle se fermera à la fermeture de la modal
  };

  // Filtrage des sessions : exclure les vides + recherche
  const filteredSessions = sessions
    .filter((session: ChatSession) => !session.is_empty) // 🔥 Masquer conversations vides
    .filter((session: ChatSession) => 
      session.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className={`sidebar-ultra-clean ${isDesktop ? 'desktop' : 'mobile'} ${isOpen ? 'visible' : ''}`}>

      {/* Barre de recherche */}
      <div className="sidebar-search-clean">
        <div style={{ position: 'relative', flex: 1 }}>
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
          <div className="sidebar-section-header-clean">
            <div className="sidebar-section-title-clean">Agents</div>
          </div>
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
                    className={`sidebar-item-clean sidebar-agent-item ${!currentSession && selectedAgent?.id === agent.id ? 'active' : ''}`}
                    disabled={isCreatingSession}
                    style={isCreatingSession ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                  >
                    <div className="sidebar-item-icon-clean">
                      {agent.profile_picture ? (
                        <img 
                          src={agent.profile_picture} 
                          alt={agent.display_name || agent.name}
                          className="agent-avatar"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        "🤖"
                      )}
                    </div>
                    <span>{agent.display_name || agent.name}</span>
                    <span className="agent-hover-hint">Lancer un Chat</span>
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
          <div className="sidebar-section-header-clean">
            <div className="sidebar-section-title-clean">Conversations</div>
          </div>
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
                    <div className="sidebar-session-name" style={{ fontSize: '13px' }}>{session.name}</div>
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
        <button 
          className="sidebar-user-item-clean"
          onClick={handleOpenSettings}
          title="Settings"
        >
          <div className="sidebar-user-avatar-clean">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="sidebar-user-info-clean">
            <div className="sidebar-user-name-clean">
              {(user?.user_metadata?.full_name as string) || user?.email?.split('@')[0] || 'Utilisateur'}
            </div>
          </div>
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          // Fermeture FORCÉE de la sidebar quand la modal se ferme
          if (onForceClose) {
            onForceClose();
          } else {
            onClose();
          }
        }}
      />

    </div>
  );
};

export default SidebarUltraClean;
