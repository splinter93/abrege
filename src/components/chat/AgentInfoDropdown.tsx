'use client';
import React from 'react';
import Link from 'next/link';
import { Agent } from '@/types/chat';
import { Settings } from 'lucide-react';
import './AgentInfoDropdown.css';

interface AgentInfoDropdownProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

const AgentInfoDropdown: React.FC<AgentInfoDropdownProps> = ({ agent, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Extraire les tools depuis api_v2_capabilities ou capabilities
  const tools = agent.api_v2_capabilities || [];

  return (
    <>
      {/* Overlay transparent pour fermer */}
      <div className="agent-dropdown-overlay" onClick={onClose} />
      
      {/* Menu dropdown */}
      <div className="agent-dropdown-menu">
        {/* Description */}
        {agent.description && (
          <div className="agent-dropdown-section">
            <h4 className="agent-dropdown-section-title">Description</h4>
            <p className="agent-dropdown-description">{agent.description}</p>
          </div>
        )}

        {/* Modèle */}
        <div className="agent-dropdown-section">
          <h4 className="agent-dropdown-section-title">Modèle</h4>
          <p className="agent-dropdown-model">{agent.model}</p>
        </div>

        {/* Tools */}
        {tools.length > 0 && (
          <div className="agent-dropdown-section">
            <h4 className="agent-dropdown-section-title">Outils disponibles</h4>
            <div className="agent-dropdown-tools">
              {tools.map((tool, index) => (
                <div key={index} className="agent-dropdown-tool-pill">
                  {tool}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lien configuration */}
        <Link 
          href="/agents" 
          className="agent-dropdown-config-link"
          onClick={onClose}
        >
          <Settings size={16} />
          <span>Configurer l'agent</span>
        </Link>
      </div>
    </>
  );
};

export default AgentInfoDropdown;

