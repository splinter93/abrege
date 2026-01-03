'use client';

/**
 * ModelDebug - Composant de debug pour afficher le modèle utilisé
 * 
 * Affiche en bas à droite du chat :
 * - Modèle actuel
 * - Modèle original (si override)
 * - Raisons du switch
 */

import React from 'react';
import { getModelInfo } from '@/constants/groqModels';

export interface ModelDebugInfo {
  original: string;
  current: string;
  wasOverridden: boolean;
  reasons: string[];
}

interface ModelDebugProps {
  modelInfo: ModelDebugInfo | null;
}

const ModelDebug: React.FC<ModelDebugProps> = ({ modelInfo }) => {
  if (!modelInfo) {
    return null;
  }

  const currentModelInfo = getModelInfo(modelInfo.current);
  const originalModelInfo = getModelInfo(modelInfo.original);

  const getModelDisplayName = (modelId: string, modelInfo: ReturnType<typeof getModelInfo> | null): string => {
    if (modelInfo?.name) {
      return modelInfo.name;
    }
    // Extraire un nom court depuis l'ID
    const parts = modelId.split('/');
    return parts[parts.length - 1] || modelId;
  };

  const currentName = getModelDisplayName(modelInfo.current, currentModelInfo);
  const originalName = getModelDisplayName(modelInfo.original, originalModelInfo);

  return (
    <div
      className="model-debug"
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 1000,
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#fff' }}>
        🤖 Modèle LLM
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#888' }}>Actuel:</span>{' '}
        <span style={{ 
          color: modelInfo.wasOverridden ? '#ffa500' : '#4ade80',
          fontWeight: 'bold'
        }}>
          {currentName}
        </span>
      </div>

      {modelInfo.wasOverridden && (
        <>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: '#888' }}>Original:</span>{' '}
            <span style={{ color: '#94a3b8' }}>{originalName}</span>
          </div>
          
          {modelInfo.reasons.length > 0 && (
            <div style={{ 
              marginTop: '8px', 
              paddingTop: '8px', 
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ color: '#888', marginBottom: '4px' }}>Raisons:</div>
              {modelInfo.reasons.map((reason, index) => (
                <div 
                  key={index}
                  style={{ 
                    color: '#ffa500',
                    fontSize: '11px',
                    marginTop: '2px',
                    paddingLeft: '8px'
                  }}
                >
                  • {reason}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div style={{ 
        marginTop: '8px', 
        paddingTop: '8px', 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '10px',
        color: '#666'
      }}>
        ID: {modelInfo.current}
      </div>
    </div>
  );
};

export default ModelDebug;

