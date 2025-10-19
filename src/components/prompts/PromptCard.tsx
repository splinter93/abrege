/**
 * Composant carte pour afficher un prompt éditeur
 * @module components/prompts/PromptCard
 */

import React from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import { getIconComponent } from '@/utils/iconMapper';
import { FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiAlertTriangle } from 'react-icons/fi';
import './PromptCard.css';

interface PromptCardProps {
  prompt: EditorPrompt;
  agents: Agent[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  agents,
  onEdit,
  onDelete,
  onToggle
}) => {
  const Icon = getIconComponent(prompt.icon);
  
  // Trouver l'agent associé
  const agent = agents.find(a => a.id === prompt.agent_id);
  const hasAgent = !!agent;
  const agentActive = agent?.is_active ?? false;

  // Déterminer le statut
  const getStatusInfo = () => {
    if (!prompt.agent_id) {
      return { label: 'Aucun agent', className: 'warning', icon: <FiAlertTriangle /> };
    }
    if (!agent) {
      return { label: 'Agent supprimé', className: 'error', icon: <FiAlertTriangle /> };
    }
    if (!agent.is_active) {
      return { label: 'Agent inactif', className: 'warning', icon: <FiAlertTriangle /> };
    }
    return { label: agent.name, className: 'success', icon: null };
  };

  const status = getStatusInfo();

  return (
    <div className={`prompt-card ${!prompt.is_active ? 'inactive' : ''}`}>
      <div className="prompt-card-header">
        <div className="prompt-card-icon-wrapper">
          <Icon className="prompt-card-icon" size={24} />
        </div>
        <div className="prompt-card-actions">
          <button
            className="prompt-card-action-btn"
            onClick={onToggle}
            title={prompt.is_active ? 'Désactiver' : 'Activer'}
          >
            {prompt.is_active ? (
              <FiToggleRight size={18} className="toggle-active" />
            ) : (
              <FiToggleLeft size={18} className="toggle-inactive" />
            )}
          </button>
          <button
            className="prompt-card-action-btn"
            onClick={onEdit}
            title="Modifier"
          >
            <FiEdit2 size={16} />
          </button>
          <button
            className="prompt-card-action-btn delete"
            onClick={onDelete}
            title="Supprimer"
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>

      <div className="prompt-card-body">
        <h3 className="prompt-card-title">
          {prompt.name}
          {prompt.is_default && (
            <span className="prompt-card-badge system">Système</span>
          )}
        </h3>

        {prompt.description && (
          <p className="prompt-card-description">{prompt.description}</p>
        )}

        <div className="prompt-card-template">
          <code>{prompt.prompt_template}</code>
        </div>

        {prompt.category && (
          <div className="prompt-card-category">
            <span className="prompt-card-category-badge">{prompt.category}</span>
          </div>
        )}
      </div>

      <div className="prompt-card-footer">
        <div className={`prompt-card-status ${status.className}`}>
          {status.icon && <span className="status-icon">{status.icon}</span>}
          <span className="status-label">{status.label}</span>
        </div>
        <div className="prompt-card-position">
          Position: {prompt.position + 1}
        </div>
      </div>
    </div>
  );
};

export default PromptCard;


