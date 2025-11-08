/**
 * Composant carte pour afficher un prompt éditeur
 * @module components/prompts/PromptCard
 */

import React from 'react';
import type { EditorPrompt } from '@/types/editorPrompts';
import type { Agent } from '@/types/chat';
import { getIconComponent } from '@/utils/iconMapper';
import { FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiUser, FiSlash } from 'react-icons/fi';
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

  const agentStatus = (() => {
    if (!prompt.agent_id) {
      return { label: 'Aucun agent', type: 'neutral' };
    }
    if (!agent) {
      return { label: 'Agent introuvable', type: 'error' };
    }
    if (!agent.is_active) {
      return { label: 'Agent inactif', type: 'warning' };
    }
    return { label: agent.name, type: 'active' };
  })();

  const agentDisplayName = agent?.display_name ?? agent?.name ?? agentStatus.label;
  const agentAvatarUrl = agent?.profile_picture;
  const agentInitial = agentDisplayName.charAt(0).toUpperCase();
  const hasAgentAvatar = Boolean(agentAvatarUrl);
  const templatePreview = (() => {
    const normalized = (prompt.prompt_template || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return 'Template vide.';
    }
    const maxLength = 160;
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
  })();
  const contextLabel =
    prompt.context === 'editor'
      ? 'Éditeur'
      : prompt.context === 'chat'
        ? 'Chat'
        : prompt.context === 'both'
          ? 'Éditeur + Chat'
          : null;

  return (
    <div className={`prompt-card ${!prompt.is_active ? 'prompt-card--inactive' : ''}`}>
      {/* Barre supérieure */}
      <div className="prompt-card__top">
        <div className="prompt-card__icon-badge">
          <Icon size={21} />
        </div>
        <div className="prompt-card__actions">
          <button
            className={`prompt-card__toggle ${prompt.is_active ? 'active' : ''}`}
            onClick={onToggle}
            title={prompt.is_active ? 'Désactiver' : 'Activer'}
          >
            {prompt.is_active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
          </button>
          <button
            className="prompt-card__action-btn"
            onClick={onEdit}
            title="Modifier"
          >
            <FiEdit2 size={14} />
          </button>
          <button
            className="prompt-card__action-btn prompt-card__action-btn--delete"
            onClick={onDelete}
            title="Supprimer"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      {/* Titre + description */}
      <div className="prompt-card__main">
        <h3 className="prompt-card__title">{prompt.name}</h3>
        <p className="prompt-card__template-preview">{templatePreview}</p>
      </div>

      {(agentDisplayName || contextLabel) && <div className="prompt-card__divider" />}

      {(agentDisplayName || contextLabel) && (
        <div className="prompt-card__context-row">
          {agentDisplayName && (
            <div className={`prompt-card__agent prompt-card__agent--${agentStatus.type}`}>
              <div
                className={`prompt-card__agent-avatar ${
                  hasAgentAvatar ? '' : 'prompt-card__agent-avatar--placeholder'
                }`}
              >
                {hasAgentAvatar ? (
                  <img src={agentAvatarUrl} alt={agentDisplayName} />
                ) : (
                  <span className="prompt-card__agent-initial">
                    {agentStatus.type === 'neutral' && agentStatus.label === 'Aucun agent' ? (
                      <FiSlash size={18} />
                    ) : (
                      agentInitial || <FiUser size={18} />
                    )}
                  </span>
                )}
              </div>
              <span className="prompt-card__agent-name">{agentDisplayName}</span>
            </div>
          )}

          {contextLabel && (
            <span className={`prompt-card__context prompt-card__context--${prompt.context}`}>
              {contextLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptCard;
