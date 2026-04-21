'use client';

import React, { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import type { Agent } from '@/types/chat';
import './AgentSelectorDropdown.css';

export interface AgentSelectorDropdownProps {
  selectedAgent: Agent | null;
  agents: Agent[];
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSelectAgent: (agent: Agent) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const AgentSelectorDropdown: React.FC<AgentSelectorDropdownProps> = ({
  selectedAgent,
  agents,
  loading,
  isOpen,
  onToggle,
  onSelectAgent,
  anchorRef
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      onToggle();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle, anchorRef]);

  if (!isOpen) return null;

  return (
    <>
      <div className="agent-selector-overlay" onClick={onToggle} aria-hidden="true" />
      <div
        ref={menuRef}
        className="agent-selector-menu"
        role="listbox"
        aria-label="Choisir un agent"
      >
        <div className="agent-selector-menu-title">Choisir un agent</div>
        {loading ? (
          <div className="agent-selector-item agent-selector-item--loading">
            Chargement...
          </div>
        ) : agents.length === 0 ? (
          <div className="agent-selector-item agent-selector-item--empty">
            Aucun agent disponible
          </div>
        ) : (
          agents.map((agent) => (
            <button
              key={agent.id}
              type="button"
              role="option"
              aria-selected={selectedAgent?.id === agent.id}
              className={`agent-selector-item ${selectedAgent?.id === agent.id ? 'agent-selector-item--selected' : ''}`}
              onClick={() => {
                onSelectAgent(agent);
                onToggle();
              }}
            >
              {agent.profile_picture ? (
                <img
                  src={agent.profile_picture}
                  alt={agent.display_name || agent.name}
                  className="agent-selector-item-avatar"
                />
              ) : (
                <span className="agent-selector-item-icon">
                  <Bot size={16} />
                </span>
              )}
              <span className="agent-selector-item-name">
                {agent.display_name || agent.name}
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );
};

export default AgentSelectorDropdown;
