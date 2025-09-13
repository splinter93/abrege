'use client';
import React, { useState } from 'react';
import { Search, FileText, Edit, FolderPlus, ChevronDown, MoreHorizontal } from 'react-feather';
import { useAuth } from '@/hooks/useAuth';
import { useChatStore } from '@/store/useChatStore';
import { useAgents } from '@/hooks/useAgents';
import '@/styles/modern-sidebar.css';

interface ModernSidebarProps {
  isOpen: boolean;
  isDesktop: boolean;
  onClose: () => void;
}

const ModernSidebar: React.FC<ModernSidebarProps> = ({ isOpen, isDesktop, onClose }) => {
  const { user } = useAuth();
  const { sessions, currentSession, selectedAgent, createSession, setCurrentSession, setSelectedAgent } = useChatStore();
  const { agents } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllAgents, setShowAllAgents] = useState(false);

  // Agents avec icônes spéciales
  const agentsWithIcons = [
    { id: 'chatgpt', name: 'ChatGPT', icon: 'chatgpt', type: 'special' },
    { id: 'gpt', name: 'GPT', icon: 'gpt', type: 'special' },
    { id: 'nexus', name: 'Nexus - Knowledge', icon: 'radio', type: 'radio' },
    { id: 'mindreader', name: 'Mindreader', icon: 'radio', type: 'radio' },
    { id: 'hermes', name: 'Hermès', icon: 'radio', type: 'radio' },
    { id: 'consensus', name: 'Consensus', icon: 'consensus', type: 'special' },
    { id: 'kepler', name: 'Képler', icon: 'gear', type: 'icon' },
    { id: 'clarion', name: 'Clarion', icon: 'radio', type: 'radio' },
    { id: 'alteria', name: 'Alteria Strategist', icon: 'radio', type: 'radio' },
    { id: 'rene', name: 'René - Lead Senior Dev', icon: 'radio', type: 'radio' },
    { id: 'carter', name: 'Carter', icon: 'radio', type: 'radio' },
    { id: 'blogmatic', name: 'Blogmatic', icon: 'blogmatic', type: 'special' },
    { id: 'donna', name: 'Donna', icon: 'donna', type: 'special' },
  ];

  // Projets
  const projects = [
    { id: 'new', name: 'Nouveau Projet', icon: 'folder-plus', type: 'action' },
    { id: 'prometheus', name: 'Prométhée', icon: 'folder', type: 'folder' },
    { id: 'synesia', name: 'Synesia AI Funding', icon: 'folder', type: 'folder' },
  ];

  // Notes récentes
  const recentNotes = [
    { id: 'test-realtime', name: 'Test Realtime note modification', active: true },
    { id: 'louis-napoleon', name: 'Louis-Napoléon détesté ou adoré', active: false },
    { id: 'audit-fichier', name: 'Audit fichier gestion historique', active: false },
    { id: 'requetes-json', name: 'Requêtes JSON Cinesia', active: false },
    { id: 'liste-classeurs', name: 'Liste des classeurs', active: false },
    { id: 'audit-tool-calls', name: 'Audit gestion tool calls', active: false },
  ];

  const handleAgentSelect = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId) || agentsWithIcons.find(a => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
    }
  };

  const handleProjectClick = (projectId: string) => {
    if (projectId === 'new') {
      createSession();
    }
    // Autres actions pour les projets
  };

  const handleNoteClick = (noteId: string) => {
    // Action pour ouvrir une note
    console.log('Opening note:', noteId);
  };

  const handleCreateNewSession = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error('Erreur lors de la création de session:', error);
    }
  };

  const displayAgents = showAllAgents ? agentsWithIcons : agentsWithIcons.slice(0, 8);

  return (
    <>
      {/* Overlay mobile */}
      {!isDesktop && isOpen && (
        <div 
          className="sidebar-overlay visible" 
          onClick={onClose}
        />
      )}
      
      <div className={`modern-sidebar ${isOpen ? 'visible' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <h2 className="sidebar-header-title">Chat</h2>
          <div className="sidebar-header-actions">
            <button className="sidebar-header-btn" title="Documents">
              <FileText size={16} />
            </button>
            <button className="sidebar-header-btn" title="Modifier">
              <Edit size={16} />
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="sidebar-search">
          <div className="sidebar-search-container">
            <input
              type="text"
              placeholder="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sidebar-search-input"
            />
            <Search size={16} className="sidebar-search-icon" />
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="sidebar-content">
          {/* Agents */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Agents</h3>
            {displayAgents.map((agent) => (
              <button
                key={agent.id}
                className={`sidebar-item ${selectedAgent?.id === agent.id ? 'active' : ''}`}
                onClick={() => handleAgentSelect(agent.id)}
              >
                <div className={`sidebar-item-icon ${agent.icon} ${agent.type === 'radio' ? 'radio' : ''}`}>
                  {agent.type === 'radio' ? '' : 
                   agent.icon === 'gear' ? '⚙️' :
                   agent.icon === 'folder-plus' ? '+' :
                   agent.icon === 'folder' ? '📁' : ''}
                </div>
                <span className="sidebar-item-text">{agent.name}</span>
              </button>
            ))}
            
            {!showAllAgents && (
              <button 
                className="sidebar-item see-more"
                onClick={() => setShowAllAgents(true)}
              >
                <MoreHorizontal size={16} />
                <span>Voir moins</span>
              </button>
            )}
          </div>

          {/* Projets */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Projets</h3>
            {projects.map((project) => (
              <button
                key={project.id}
                className="sidebar-item"
                onClick={() => handleProjectClick(project.id)}
              >
                <div className={`sidebar-item-icon ${project.icon}`}>
                  {project.icon === 'folder-plus' ? '+' : '📁'}
                </div>
                <span className="sidebar-item-text">{project.name}</span>
              </button>
            ))}
          </div>

          {/* Notes récentes */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Notes récentes</h3>
            {recentNotes.map((note) => (
              <button
                key={note.id}
                className={`sidebar-item ${note.active ? 'active' : ''}`}
                onClick={() => handleNoteClick(note.id)}
              >
                <div className="sidebar-item-icon">
                  📄
                </div>
                <span className="sidebar-item-text">{note.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Profil utilisateur */}
        <div className="sidebar-user-profile">
          <button className="sidebar-user-item">
            <div className="sidebar-user-avatar">
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user?.user_metadata?.full_name || 'Mr CHAOUCH'}
              </div>
              <div className="sidebar-user-email">
                {user?.email || 'utilisateur@example.com'}
              </div>
            </div>
          </button>
        </div>
      </div>
    </>
  );
};

export default ModernSidebar;
