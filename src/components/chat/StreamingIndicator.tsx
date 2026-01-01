/**
 * StreamingIndicator - Indicateur visuel des états du streaming
 * Affiche : Thinking → Executing → Responding
 */

import React from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { simpleLogger as logger } from '@/utils/logger';
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
  // Fonction pour retirer les préfixes de service (scrivia__, local__, etc.)
  const cleanFunctionName = (name: string): string => {
    // Retire tout préfixe suivi de "__" (scrivia__, local__, etc.)
    return name.replace(/^[a-zA-Z0-9_]+__/, '');
  };

  // ✅ Logger les toolCalls reçus (dev only)
  React.useEffect(() => {
    logger.dev('[StreamingIndicator] 📥 Props reçues:', {
      state,
      toolCount,
      toolCallsCount: toolCalls.length,
      toolCallsWithSuccess: toolCalls.filter(tc => tc.success !== undefined).length,
      toolCallsDetails: toolCalls.map(tc => ({ 
        id: tc.id, 
        name: tc.name, 
        success: tc.success,
        hasResult: !!tc.result
      }))
    });
  }, [state, toolCalls]);
  
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
            {toolCalls.length > 0 ? (
              <div className="tool-list-compact">
                {toolCalls.map((tool, index) => {
                  // Extraire le nom de la fonction sans préfixe de service
                  const functionName = cleanFunctionName(tool.name);
                  return (
                    <div 
                      key={tool.id || index} 
                      className="tool-item-compact"
                      onClick={onToggle}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="tool-item-name">
                        {functionName}
                      </span>
                    <span className="tool-item-status">
                      {tool.success === true ? (
                        <Check className="status-icon success" size={16} strokeWidth={2.5} />
                      ) : tool.success === false ? (
                        <X className="status-icon error" size={16} strokeWidth={2.5} />
                      ) : (
                        <Loader2 className="status-icon pending spinner" size={16} strokeWidth={2.5} />
                      )}
                    </span>
                  </div>
                  );
                })}
              </div>
            ) : (
              <div className="tool-item-compact">
                <span className="tool-item-name">
                  Exécution en cours...
                </span>
                <span className="tool-item-status">
                  <Loader2 className="status-icon pending spinner" size={20} strokeWidth={2.5} />
                </span>
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
        return (
          <div className="streaming-indicator completed">
            <div className="tool-list-compact">
              {toolCalls.map((tool, index) => {
                // Extraire le nom de la fonction sans préfixe de service
                const functionName = cleanFunctionName(tool.name);
                return (
                  <div 
                    key={tool.id || index} 
                    className="tool-item-compact"
                    onClick={onToggle}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="tool-item-name">
                      Calling {functionName}
                    </span>
                    <span className="tool-item-status">
                      {tool.success ? (
                        <Check className="status-icon success" size={16} strokeWidth={2.5} />
                      ) : (
                        <X className="status-icon error" size={16} strokeWidth={2.5} />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Détails déroulants */}
            {isExpanded && toolCalls.length > 0 && (
              <div className="tool-details-expanded" onClick={(e) => e.stopPropagation()}>
                {toolCalls.map((tool, index) => (
                  <div key={tool.id || index} className="tool-detail-expanded">
                    {tool.arguments && (
                      <div className="tool-detail-section">
                        <div className="tool-detail-label">Arguments</div>
                        <pre className="tool-detail-content">{tool.arguments}</pre>
                      </div>
                    )}
                    {tool.result && (
                      <div className="tool-detail-section">
                        <div className="tool-detail-label">Résultat</div>
                        <pre className="tool-detail-content">
                          {tool.result.substring(0, 300)}{tool.result.length > 300 ? '...' : ''}
                        </pre>
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

