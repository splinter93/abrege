/**
 * Composant Header du chat
 * Extrait de ChatFullscreenV2.tsx (JSX lignes 966-1028)
 * 
 * Contient:
 * - Toggle sidebar button
 * - Agent info dropdown
 * - Reduce button
 */

import React, { useRef } from 'react';
import Link from 'next/link';
import { Menu, Bot, X, ChevronDown, Minimize2 } from 'lucide-react';
import type { Agent } from '@/types/chat';
import AgentInfoDropdown from './AgentInfoDropdown';
import AgentSelectorDropdown from './AgentSelectorDropdown';
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
  onCloseWidget?: () => void;
  /** Mode widget : sélecteur d'agent au lieu du dropdown info */
  isWidget?: boolean;
  agents?: Agent[];
  agentsLoading?: boolean;
  onSelectAgent?: (agent: Agent) => void;
}

/**
 * Header du chat
 * Affiche les contrôles principaux (sidebar, agent, reduce)
 */
const ChatHeaderComponent: React.FC<ChatHeaderProps> = ({
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
  canOpenCanva = true,
  onCloseWidget,
  isWidget = false,
  agents = [],
  agentsLoading = false,
  onSelectAgent
}) => {
  const agentButtonRef = useRef<HTMLButtonElement>(null);

  // ✅ Realtime canva : hook monté ici pour rester actif toute la durée de vie du chat
  // (ChatHeader reste monté, contrairement au dropdown qui peut se fermer)
  useCanvaRealtime(chatSessionId, canOpenCanva && !onCloseWidget);

  const showAgentSelector = isWidget && onSelectAgent;

  return (
    <div className="chatgpt-header">
      <div className="chatgpt-header-left">
        {/* Bouton toggle sidebar — même style/couleur que le bouton Réduire */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="chatgpt-sidebar-toggle-btn-header disabled:opacity-50 disabled:pointer-events-none"
          aria-label={sidebarOpen ? "Fermer les conversations" : "Ouvrir les conversations"}
          title={sidebarOpen ? "Fermer les conversations" : "Ouvrir les conversations"}
          disabled={!isAuthenticated || authLoading}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Agent actif : sélecteur (widget) ou bouton info (fullscreen) */}
        {(selectedAgent || (showAgentSelector && !agentNotFound)) ? (
          <div className="chat-active-agent-wrapper" style={{ position: 'relative' }}>
            <button
              ref={agentButtonRef}
              className={`chat-active-agent ${showAgentSelector ? 'chat-active-agent--selector' : ''}`}
              onClick={onToggleAgentDropdown}
              aria-label={showAgentSelector ? "Choisir un agent" : "Informations de l'agent"}
              aria-expanded={showAgentSelector ? agentDropdownOpen : undefined}
              aria-haspopup={showAgentSelector ? 'listbox' : undefined}
            >
              {selectedAgent?.profile_picture ? (
                <img
                  src={selectedAgent.profile_picture}
                  alt={selectedAgent.display_name || selectedAgent.name}
                  className="agent-icon agent-avatar-header"
                />
              ) : (
                <span className="agent-icon sidebar-agent-icon-placeholder">
                  <Bot size={16} />
                </span>
              )}
              <span className="agent-name">
                {selectedAgent ? (selectedAgent.display_name || selectedAgent.name) : 'Choisir un agent'}
              </span>
              {showAgentSelector && (
                <ChevronDown className="agent-selector-chevron" size={14} />
              )}
            </button>

            {showAgentSelector ? (
              <AgentSelectorDropdown
                selectedAgent={selectedAgent}
                agents={agents}
                loading={agentsLoading}
                isOpen={agentDropdownOpen}
                onToggle={onToggleAgentDropdown}
                onSelectAgent={onSelectAgent}
                anchorRef={agentButtonRef}
              />
            ) : selectedAgent ? (
              <AgentInfoDropdown
                agent={selectedAgent}
                isOpen={agentDropdownOpen}
                onClose={() => onToggleAgentDropdown()}
              />
            ) : null}
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
        {!onCloseWidget && canOpenCanva && onOpenNewCanva && onSelectCanva && onCloseCanva && (
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
        {onCloseWidget ? (
          <>
            <Link
              href="/private/chat"
              className="chatgpt-reduce-btn-header"
              aria-label="Agrandir le chat"
              title="Agrandir le chat"
              onClick={() => onCloseWidget()}
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
            <button
              type="button"
              onClick={onCloseWidget}
              className="chatgpt-reduce-btn-header"
              aria-label="Fermer le chat"
              title="Fermer le chat"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <Link
            href="/"
            className="chatgpt-reduce-btn-header"
            aria-label="Réduire le chat"
            title="Réduire le chat"
          >
            <Minimize2 className="w-5 h-5" />
          </Link>
        )}
      </div>
    </div>
  );
};

ChatHeaderComponent.displayName = 'ChatHeader';

const ChatHeader = React.memo(ChatHeaderComponent);

export default ChatHeader;

