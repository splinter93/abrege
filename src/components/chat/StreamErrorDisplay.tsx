/**
 * StreamErrorDisplay - Affichage des erreurs de streaming LLM
 * Design simple : encadré rouge glassmorphism, pleine largeur
 */

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { simpleLogger as logger } from '@/utils/logger';
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

  // Message d'erreur principal
  const errorMessage = error.error || 'Une erreur est survenue';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('[StreamErrorDisplay] Failed to copy error', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
    }
  };

  return (
    <div className="stream-error-container">
      <div className="stream-error">
        {/* Message d'erreur */}
        <div className="stream-error-content">
          <span className="stream-error-text">{errorMessage}</span>
        </div>

        {/* Footer avec bouton copier à gauche et Relancer */}
        <div className="stream-error-footer">
          <button 
            className="stream-error-copy"
            onClick={handleCopy}
            aria-label="Copier le log d'erreur"
            title="Copier le log"
          >
            {copied ? (
              <Check size={16} strokeWidth={2.5} />
            ) : (
              <Copy size={16} strokeWidth={2.5} />
            )}
          </button>
          {onRetry && (
            <button 
              className="stream-error-retry"
              onClick={onRetry}
              aria-label="Relancer le message"
            >
              Relancer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


