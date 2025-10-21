/**
 * StreamingIndicator - Indicateur visuel des états du streaming
 * Affiche : Thinking → Executing → Responding
 */

import React from 'react';
import './StreamingIndicator.css';

export type StreamingState = 'thinking' | 'executing' | 'responding' | 'idle';

interface StreamingIndicatorProps {
  state: StreamingState;
  toolCount?: number;
  currentTool?: string;
  roundNumber?: number;
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  state,
  toolCount = 0,
  currentTool,
  roundNumber
}) => {
  if (state === 'idle') {
    return null;
  }

  const renderContent = () => {
    switch (state) {
      case 'thinking':
        return (
          <div className="streaming-indicator thinking">
            <div className="indicator-icon">🤔</div>
            <div className="indicator-text">
              <span className="indicator-label">Réflexion en cours</span>
              <span className="indicator-dots">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </span>
            </div>
          </div>
        );

      case 'executing':
        return (
          <div className="streaming-indicator executing">
            <div className="indicator-icon">⚙️</div>
            <div className="indicator-text">
              <span className="indicator-label">
                {currentTool 
                  ? `Exécution : ${currentTool}`
                  : `Exécution de ${toolCount} outil${toolCount > 1 ? 's' : ''}`
                }
              </span>
              <span className="indicator-dots">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </span>
            </div>
            {roundNumber && roundNumber > 1 && (
              <span className="round-badge">Round {roundNumber}</span>
            )}
          </div>
        );

      case 'responding':
        return (
          <div className="streaming-indicator responding">
            <div className="indicator-icon">✨</div>
            <div className="indicator-text">
              <span className="indicator-label">Réponse en cours</span>
              <span className="indicator-dots">
                <span className="dot">.</span>
                <span className="dot">.</span>
                <span className="dot">.</span>
              </span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="streaming-indicator-container">
      {renderContent()}
    </div>
  );
};

