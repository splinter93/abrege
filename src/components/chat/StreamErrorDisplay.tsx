/**
 * StreamErrorDisplay - Affichage des erreurs de streaming LLM
 * Design moderne avec actions (retry, copy)
 */

import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import './StreamErrorDisplay.css';

export interface StreamError {
  error: string;
  provider?: string;
  model?: string;
  statusCode?: number;
  roundCount?: number;
  recoverable?: boolean;
  timestamp?: number;
  errorCode?: string;
}

interface StreamErrorDisplayProps {
  error: StreamError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const StreamErrorDisplay: React.FC<StreamErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    const errorDetails = `
🔴 ERREUR STREAMING LLM
━━━━━━━━━━━━━━━━━━━━━━
Provider: ${error.provider || 'unknown'}
Model: ${error.model || 'unknown'}
Status Code: ${error.statusCode || 'N/A'}
Error Code: ${error.errorCode || 'N/A'}
Round: ${error.roundCount || 'N/A'}
Recoverable: ${error.recoverable ? 'Oui' : 'Non'}
Timestamp: ${error.timestamp ? new Date(error.timestamp).toISOString() : 'N/A'}

Message:
${error.error}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusCodeInfo = (code?: number) => {
    if (!code) return null;
    
    const codeInfo: Record<number, { label: string; description: string }> = {
      400: { label: 'Requête Invalide', description: 'Les paramètres envoyés sont incorrects' },
      401: { label: 'Non Authentifié', description: 'Clé API invalide ou expirée' },
      403: { label: 'Accès Refusé', description: 'Vous n\'avez pas accès à cette ressource' },
      413: { label: 'Payload Trop Large', description: 'Le message ou le contexte est trop volumineux' },
      429: { label: 'Limite Dépassée', description: 'Trop de requêtes, veuillez patienter' },
      500: { label: 'Erreur Serveur', description: 'Erreur interne du provider LLM' },
      502: { label: 'Bad Gateway', description: 'Le serveur LLM est temporairement indisponible' },
      503: { label: 'Service Indisponible', description: 'Le provider est actuellement surchargé' }
    };
    
    return codeInfo[code] || { label: `Erreur ${code}`, description: 'Erreur non documentée' };
  };

  const statusInfo = getStatusCodeInfo(error.statusCode);

  return (
    <div className="stream-error-container">
      <div className="stream-error">
        {/* Header avec icône et titre */}
        <div className="stream-error-header">
          <div className="stream-error-icon">
            <AlertTriangle size={20} strokeWidth={2.5} />
          </div>
          <div className="stream-error-title">
            <span className="stream-error-title-text">Erreur de Streaming</span>
            {error.statusCode && statusInfo && (
              <span className="stream-error-subtitle">{statusInfo.label}</span>
            )}
          </div>
          <button 
            className="stream-error-expand"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Réduire' : 'Développer'}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {/* Message d'erreur principal */}
        <div className="stream-error-message">
          {error.error}
        </div>

        {/* Détails déroulants */}
        {expanded && (
          <div className="stream-error-details">
            <div className="stream-error-detail-grid">
              {error.provider && (
                <div className="stream-error-detail-item">
                  <span className="stream-error-detail-label">Provider</span>
                  <span className="stream-error-detail-value">{error.provider.toUpperCase()}</span>
                </div>
              )}
              {error.model && (
                <div className="stream-error-detail-item">
                  <span className="stream-error-detail-label">Modèle</span>
                  <span className="stream-error-detail-value">{error.model}</span>
                </div>
              )}
              {error.statusCode && (
                <div className="stream-error-detail-item">
                  <span className="stream-error-detail-label">Code HTTP</span>
                  <span className="stream-error-detail-value">{error.statusCode}</span>
                </div>
              )}
              {error.errorCode && (
                <div className="stream-error-detail-item">
                  <span className="stream-error-detail-label">Code Erreur</span>
                  <span className="stream-error-detail-value">{error.errorCode}</span>
                </div>
              )}
              {error.roundCount !== undefined && (
                <div className="stream-error-detail-item">
                  <span className="stream-error-detail-label">Round</span>
                  <span className="stream-error-detail-value">{error.roundCount}</span>
                </div>
              )}
              {error.recoverable !== undefined && (
                <div className="stream-error-detail-item">
                  <span className="stream-error-detail-label">Récupérable</span>
                  <span className="stream-error-detail-value">
                    {error.recoverable ? '✓ Oui' : '✗ Non'}
                  </span>
                </div>
              )}
            </div>
            
            {statusInfo && (
              <div className="stream-error-description">
                💡 {statusInfo.description}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="stream-error-actions">
          {onRetry && (
            <button 
              className="stream-error-button retry"
              onClick={onRetry}
              aria-label="Relancer le message"
            >
              <RefreshCw size={14} strokeWidth={2.5} />
              <span>Relancer</span>
            </button>
          )}
          
          <button 
            className="stream-error-button copy"
            onClick={handleCopy}
            aria-label="Copier les détails"
          >
            {copied ? (
              <>
                <Check size={14} strokeWidth={2.5} />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Copy size={14} strokeWidth={2.5} />
                <span>Copier détails</span>
              </>
            )}
          </button>

          {onDismiss && (
            <button 
              className="stream-error-button dismiss"
              onClick={onDismiss}
              aria-label="Fermer"
            >
              <span>Fermer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


