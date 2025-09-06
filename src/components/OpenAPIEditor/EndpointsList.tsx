'use client';

import React from 'react';
import { OpenAPITypes } from './OpenAPITypes';

interface EndpointsListProps {
  endpoints: OpenAPITypes.Endpoint[];
  onEdit: (endpoint: OpenAPITypes.Endpoint) => void;
  onDelete: (endpointId: string) => void;
}

/**
 * Composant pour afficher la liste des endpoints
 * Affiche chaque endpoint sous forme de carte avec actions
 */
export function EndpointsList({ endpoints, onEdit, onDelete }: EndpointsListProps) {
  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'method-get';
      case 'POST': return 'method-post';
      case 'PUT': return 'method-put';
      case 'PATCH': return 'method-patch';
      case 'DELETE': return 'method-delete';
      default: return 'method-default';
    }
  };

  const formatPath = (path: string) => {
    return path.replace(/\{([^}]+)\}/g, '{$1}');
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="endpoints-list">
      {endpoints.length === 0 ? (
        <div className="endpoints-empty">
          <p>Aucun endpoint trouvé dans ce schéma</p>
        </div>
      ) : (
        <div className="endpoints-grid">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="endpoint-card">
              <div className="endpoint-card-header">
                <div className="endpoint-method">
                  <span className={`method-badge ${getMethodColor(endpoint.method)}`}>
                    {endpoint.method}
                  </span>
                </div>
                <div className="endpoint-actions">
                  <button
                    className="endpoint-action-button edit-button"
                    onClick={() => onEdit(endpoint)}
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    className="endpoint-action-button delete-button"
                    onClick={() => onDelete(endpoint.id)}
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="endpoint-card-content">
                <div className="endpoint-path">
                  <code>{formatPath(endpoint.path)}</code>
                </div>
                
                <div className="endpoint-info">
                  <h4 className="endpoint-title">
                    {endpoint.summary || endpoint.operationId}
                  </h4>
                  
                  {endpoint.description && (
                    <p className="endpoint-description">
                      {truncateText(endpoint.description, 120)}
                    </p>
                  )}

                  {endpoint.tags.length > 0 && (
                    <div className="endpoint-tags">
                      {endpoint.tags.map((tag, index) => (
                        <span key={index} className="endpoint-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="endpoint-details">
                    <div className="endpoint-detail">
                      <strong>Opération ID:</strong> {endpoint.operationId}
                    </div>
                    
                    {endpoint.parameters.length > 0 && (
                      <div className="endpoint-detail">
                        <strong>Paramètres:</strong> {endpoint.parameters.length}
                      </div>
                    )}
                    
                    {endpoint.requestBody && (
                      <div className="endpoint-detail">
                        <strong>Body:</strong> Oui
                      </div>
                    )}
                    
                    <div className="endpoint-detail">
                      <strong>Réponses:</strong> {Object.keys(endpoint.responses).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
