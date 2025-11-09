import React from 'react';
import type { SpecializedAgentConfig } from '@/types/specializedAgents';
import { FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import './AgentCard.css';

interface AgentCardProps {
  agent: SpecializedAgentConfig;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onEdit, onDelete, onToggle }) => {
  const displayName = agent.display_name || agent.name;
  const description =
    agent.description ||
    agent.system_instructions ||
    'Aucune description fournie pour cet agent.';
  const modelLabel = agent.model || 'Modèle non défini';
  const avatarUrl = agent.profile_picture;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onEdit();
    }
  };

  return (
    <div
      className={`agent-card ${!agent.is_active ? 'agent-card--inactive' : ''}`}
      onClick={onEdit}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="agent-card__top">
        <div className="agent-card__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="agent-card__avatar-img" />
          ) : (
            <span>{(displayName || '?').slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <div className="agent-card__actions">
          <button
            className={`agent-card__toggle ${agent.is_active ? 'active' : ''}`}
            title={agent.is_active ? 'Désactiver' : 'Activer'}
            onClick={event => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {agent.is_active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
          </button>
          <button
            className="agent-card__action-btn"
            title="Modifier"
            onClick={event => {
              event.stopPropagation();
              onEdit();
            }}
          >
            <FiEdit2 size={14} />
          </button>
          <button
            className="agent-card__action-btn agent-card__action-btn--delete"
            title="Supprimer"
            onClick={event => {
              event.stopPropagation();
              onDelete();
            }}
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>

      <div className="agent-card__main">
        <h3 className="agent-card__title">{displayName}</h3>
        <p className="agent-card__description">{description}</p>
      </div>

      <div className="agent-card__divider" />

      <div className="agent-card__footer">
        <span className="agent-card__model">{modelLabel}</span>
        {agent.category && <span className="agent-card__category">{agent.category}</span>}
      </div>
    </div>
  );
};

export default AgentCard;

