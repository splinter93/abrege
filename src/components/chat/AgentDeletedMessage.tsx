/**
 * Composant affichant un message élégant quand l'agent d'une conversation a été supprimé
 * Affiché sous le dernier message de la conversation
 */

import React from 'react';

const AgentDeletedMessage: React.FC = () => {
  return (
    <div className="agent-deleted-message">
      <div className="agent-deleted-content">
        <span className="agent-deleted-icon">⚠️</span>
        <span className="agent-deleted-text">L'agent de cette conversation a été supprimé</span>
      </div>
    </div>
  );
};

export default AgentDeletedMessage;

