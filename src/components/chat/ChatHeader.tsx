/**
 * Composant Header du chat
 * Extrait de ChatFullscreenV2.tsx (JSX lignes 966-1028)
 * 
 * Contient:
 * - Toggle sidebar button
 * - Agent info dropdown
 * - Reduce button
 */

import React from 'react';
import Link from 'next/link';
import type { Agent } from '@/types/chat';
import AgentInfoDropdown from './AgentInfoDropdown';

/**
 * Props du composant
 */
export interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedAgent: Agent | null;
  agentDropdownOpen: boolean;
  onToggleAgentDropdown: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
}

/**
 * Header du chat
 * Affiche les contrôles principaux (sidebar, agent, reduce)
 */
const ChatHeader: React.FC<ChatHeaderProps> = ({
  sidebarOpen,
  onToggleSidebar,
  selectedAgent,
  agentDropdownOpen,
  onToggleAgentDropdown,
  isAuthenticated,
  authLoading
}) => {
  return (
    <div className="chatgpt-header">
      <div className="chatgpt-header-left">
        {/* Bouton toggle sidebar */}
        <button
          onClick={onToggleSidebar}
          className="chatgpt-sidebar-toggle-btn-header"
          aria-label={sidebarOpen ? "Fermer les conversations" : "Ouvrir les conversations"}
          title={sidebarOpen ? "Fermer les conversations" : "Ouvrir les conversations"}
          disabled={!isAuthenticated || authLoading}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="9" y1="3" x2="9" y2="21"></line>
          </svg>
        </button>

        {/* Agent actif */}
        {selectedAgent && (
          <div className="chat-active-agent-wrapper" style={{ position: 'relative' }}>
            <button
              className="chat-active-agent"
              onClick={onToggleAgentDropdown}
              aria-label="Informations de l'agent"
            >
              {selectedAgent.profile_picture ? (
                <img
                  src={selectedAgent.profile_picture}
                  alt={selectedAgent.name}
                  className="agent-icon agent-avatar-header"
                />
              ) : (
                <span className="agent-icon">🤖</span>
              )}
              <span className="agent-name">{selectedAgent.name}</span>
            </button>

            {/* Dropdown d'info agent */}
            <AgentInfoDropdown
              agent={selectedAgent}
              isOpen={agentDropdownOpen}
              onClose={() => onToggleAgentDropdown()}
            />
          </div>
        )}
      </div>

      <div className="chatgpt-header-right">
        {/* Bouton réduire */}
        <Link
          href="/"
          className="chatgpt-reduce-btn-header"
          aria-label="Réduire le chat"
          title="Réduire le chat"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="4 14 10 14 10 20"></polyline>
            <polyline points="20 10 14 10 14 4"></polyline>
            <line x1="14" y1="10" x2="21" y2="3"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </Link>
      </div>
    </div>
  );
};

export default ChatHeader;

