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
import { ChatCanvasDropdown } from './ChatCanvasDropdown';
import { useCanvaRealtime } from '@/hooks/chat/useCanvaRealtime';

/**
 * Props du composant
 */
export interface ChatHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  selectedAgent: Agent | null;
  agentNotFound: boolean; // ✅ Indicateur agent supprimé
  agentDropdownOpen: boolean;
  onToggleAgentDropdown: () => void;
  isAuthenticated: boolean;
  authLoading: boolean;
  chatSessionId: string | null;
  activeCanvaId: string | null;
  isCanvaOpen: boolean;
  onOpenNewCanva?: () => void;
  onSelectCanva?: (canvaId: string, noteId: string) => void;
  onCloseCanva?: (canvaId: string, options?: { delete?: boolean }) => void | Promise<void>;
  canOpenCanva?: boolean;
}

/**
 * Header du chat
 * Affiche les contrôles principaux (sidebar, agent, reduce)
 */
const ChatHeader: React.FC<ChatHeaderProps> = ({
  sidebarOpen,
  onToggleSidebar,
  selectedAgent,
  agentNotFound,
  agentDropdownOpen,
  onToggleAgentDropdown,
  isAuthenticated,
  authLoading,
  chatSessionId,
  activeCanvaId,
  isCanvaOpen,
  onOpenNewCanva,
  onSelectCanva,
  onCloseCanva,
  canOpenCanva = true
}) => {
  // ✅ Realtime canva : hook monté ici pour rester actif toute la durée de vie du chat
  // (ChatHeader reste monté, contrairement au dropdown qui peut se fermer)
  useCanvaRealtime(chatSessionId, true);

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

        {/* Agent actif ou agent introuvable */}
        {selectedAgent ? (
          <div className="chat-active-agent-wrapper" style={{ position: 'relative' }}>
            <button
              className="chat-active-agent"
              onClick={onToggleAgentDropdown}
              aria-label="Informations de l'agent"
            >
              {selectedAgent.profile_picture ? (
                <img
                  src={selectedAgent.profile_picture}
                  alt={selectedAgent.display_name || selectedAgent.name}
                  className="agent-icon agent-avatar-header"
                />
              ) : (
                <span className="agent-icon">🤖</span>
              )}
              <span className="agent-name">{selectedAgent.display_name || selectedAgent.name}</span>
            </button>

            {/* Dropdown d'info agent */}
            <AgentInfoDropdown
              agent={selectedAgent}
              isOpen={agentDropdownOpen}
              onClose={() => onToggleAgentDropdown()}
            />
          </div>
        ) : agentNotFound ? (
          <div className="chat-active-agent-wrapper">
            <div className="chat-active-agent chat-agent-not-found">
              <span className="agent-icon">⚠️</span>
              <span className="agent-name agent-name-error">Agent introuvable</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="chatgpt-header-right">
        {canOpenCanva && onOpenNewCanva && onSelectCanva && onCloseCanva && (
          <ChatCanvasDropdown
            chatSessionId={chatSessionId}
            activeCanvaId={activeCanvaId}
            isCanvaOpen={isCanvaOpen}
            onOpenNewCanva={onOpenNewCanva}
            onSelectCanva={onSelectCanva}
            onCloseCanva={onCloseCanva}
            disabled={!isAuthenticated || authLoading}
          />
        )}
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

