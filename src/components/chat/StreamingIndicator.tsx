/**
 * StreamingIndicator - Indicateur visuel des états du streaming
 * Affiche : Thinking → Executing → Responding
 */

import React from 'react';
import './StreamingIndicator.css';

export type StreamingState = 'thinking' | 'executing' | 'responding' | 'completed' | 'idle';

interface ToolCallDetail {
  id: string;
  name: string;
  arguments: string;
  result?: string;
  success?: boolean;
}

interface StreamingIndicatorProps {
  state: StreamingState;
  toolCount?: number;
  currentTool?: string;
  roundNumber?: number;
  toolCalls?: ToolCallDetail[]; // ✅ NOUVEAU: Pour l'état completed
  onToggle?: () => void; // ✅ NOUVEAU: Callback pour collapse/expand
  isExpanded?: boolean; // ✅ NOUVEAU: État du collapse
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({
  state,
  toolCount = 0,
  currentTool,
  roundNumber,
  toolCalls = [],
  onToggle,
  isExpanded = false
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
                Exécution de {toolCount} outil{toolCount > 1 ? 's' : ''}
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
            
            {/* ✅ NOUVEAU : Liste des tools en cours d'exécution */}
            {toolCalls.length > 0 && (
              <div className="tool-details-live" style={{ marginTop: '8px' }}>
                {toolCalls.map((tool, index) => (
                  <div key={tool.id || index} className="tool-detail-item-live">
                    <span className="tool-status-icon">
                      {tool.success === true ? '✅' : tool.success === false ? '❌' : '⏳'}
                    </span>
                    <span className="tool-name">{tool.name}</span>
                    {tool.success === undefined && (
                      <span className="tool-status-text">en cours...</span>
                    )}
                  </div>
                ))}
              </div>
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

      case 'completed':
        // ✅ Afficher le nom des tools directement
        const toolNames = toolCalls.map(tc => tc.name).join(', ');
        const label = toolCalls.length === 1 
          ? toolNames 
          : `${toolCalls.length} outils : ${toolNames}`;
        
        return (
          <div className="streaming-indicator completed" onClick={onToggle} style={{ cursor: 'pointer' }}>
            <div className="indicator-icon">✅</div>
            <div className="indicator-text">
              <span className="indicator-label">{label}</span>
              <span className="expand-arrow">{isExpanded ? '▲' : '▼'}</span>
            </div>
            {roundNumber && roundNumber > 1 && (
              <span className="round-badge">Round {roundNumber}</span>
            )}
            
            {/* ✅ NOUVEAU : Détails déroulants */}
            {isExpanded && toolCalls.length > 0 && (
              <div className="tool-details" onClick={(e) => e.stopPropagation()}>
                {toolCalls.map((tool, index) => (
                  <div key={tool.id || index} className="tool-detail-item">
                    <div className="tool-detail-header">
                      <span className="tool-detail-icon">{tool.success ? '✅' : '❌'}</span>
                      <span className="tool-detail-name">{tool.name}</span>
                    </div>
                    {tool.arguments && (
                      <div className="tool-detail-args">
                        <strong>Arguments:</strong>
                        <pre>{tool.arguments}</pre>
                      </div>
                    )}
                    {tool.result && (
                      <div className="tool-detail-result">
                        <strong>Résultat:</strong>
                        <pre>{tool.result.substring(0, 200)}{tool.result.length > 200 ? '...' : ''}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

