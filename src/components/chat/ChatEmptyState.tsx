/**
 * Composant d'état vide du chat
 * Extrait de ChatFullscreenV2.tsx (JSX lignes 1088-1103)
 * 
 * Affiche l'agent sélectionné avec son avatar, nom, description et modèle
 * quand la conversation est vide (nouvelle conversation).
 */

import React from 'react';
import type { Agent } from '@/types/chat';

/**
 * Props du composant
 */
export interface ChatEmptyStateProps {
  agent: Agent | null;
}

/**
 * État vide du chat
 * Affiche les informations de l'agent actif
 */
const ChatEmptyState: React.FC<ChatEmptyStateProps> = ({ agent }) => {
  if (!agent) {
    return null;
  }

  return (
    <div className="chat-empty-state">
      <div className="chat-empty-agent-avatar">
        {agent.profile_picture ? (
          <img 
            src={agent.profile_picture} 
            alt={agent.name}
            draggable="false"
          />
        ) : (
          <div className="chat-empty-agent-placeholder">🤖</div>
        )}
      </div>
      <h2 className="chat-empty-agent-name">{agent.name}</h2>
      <p className="chat-empty-agent-description">
        {agent.description || 'Prêt à vous assister'}
      </p>
      {agent.model && (
        <div className="chat-empty-agent-model">{agent.model}</div>
      )}
    </div>
  );
};

export default ChatEmptyState;

